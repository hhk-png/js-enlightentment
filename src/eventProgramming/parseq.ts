export function make_reason(factory_name: string, execuse: string, evidence?: RequestCallBack | RequestCallBack[] | Requestor[] | number | NodeJS.Timeout): Error {
    const reason = new Error("parseq." + factory_name + (
        execuse === undefined
            ? ""
            : ": " + execuse
    ));
    if (evidence) {
        Object.defineProperty(reason, "evidence", evidence);
    }
    return reason;
}

type CallBack = (a: string, b: string) => void
// 回调函数应该是一个接收两个参数的函数
function check_callback(callback: RequestCallBack, factory_name: string) {
    if (typeof callback !== "function"
        || callback.length !== 2) {
        throw make_reason(factory_name, "Not a callback.", callback);
    }
}

// 确保数组中的所有元素都是执行者函数
function check_requestor_array(request_array: Requestor[] | RequestCallBack[], factory_name: string) {
    if (
        !Array.isArray(request_array)
        || request_array.length < 1
        || request_array.some(function (requestor: Requestor | RequestCallBack) {
            return typeof requestor !== "function"
                || requestor.length < 1
                || requestor.length < 2;
        })
    ) {
        throw make_reason(
            factory_name,
            "Bad requestors array.",
            request_array
        );
    }
}

type Cancel = (a: Error) => unknown
type Value = number | string | undefined
type RequestCallBack = (value: Value, reason: Error) => undefined
type Requestor = (requestCallBack: RequestCallBack, value: Value) => Cancel | undefined
type Action = (value: Value, err: unknown, number: number) => void
type TimeoutCallBack = () => void

// run 函数是parseq 的灵魂，它负责所有的核心逻辑，执行请求器，时间管理，取消逻辑和限流
function run(
    factory_name: string,
    requestor_array: Requestor[] | RequestCallBack[],
    initial_value: Value,
    action: Action,
    timeout: TimeoutCallBack,
    time_limit: NodeJS.Timeout,
    throttle: number = 0
) {
    let cancel_array: (Cancel | undefined)[] | undefined = new Array(requestor_array.length);
    let next_number = 0;
    let timer_id: NodeJS.Timeout | undefined;
    function cancel(reason = make_reason(factory_name, "Cancel.")) {
        // 先停止正在计时的计时器
        if (timer_id !== undefined) {
            clearTimeout(timer_id);
            timer_id = undefined
        }
        // 停止所有仍活跃的请求器
        if (cancel_array !== undefined) {
            cancel_array.forEach(function (cancel) {
                try {
                    if (typeof cancel === "function") {
                        return cancel(reason);
                    }
                } catch (ignore) { }
            });
            cancel_array = undefined;
        }
    }

    function start_requestor(value: Value): undefined {
        // 若还有未执行的执行者，则执行
        if (
            cancel_array !== undefined
            || next_number < requestor_array.length
        ) {
            // 每个执行者都有一个下标编号
            let number: number | undefined = next_number;
            next_number += 1;
            // 将回调函数传入指定编号的执行者，并将对应的取消函数预先存起来备用
            const requestor = requestor_array[number];
            try {
                cancel_array![number] = requestor(function start_requestor_callback(value: Value, reason: Error) {
                    // 当requestor 执行完毕，会调用函数，
                    //  但若不再需要执行整个任务，该回调函数则不会被调用，
                    if (
                        cancel_array !== undefined
                        && number !== undefined
                    ) {
                        // 因为不再需要，移除取消函数
                        cancel_array[number] = undefined;
                        // 接着调用action 函数来让执行者直到当下的状态
                        action(value, reason, number);
                        // 然后清空number，这样回调函数就不会被再次调用
                        number = undefined;
                        return start_requestor(
                            factory_name === "sequence"
                                ? value
                                : initial_value
                        )
                    }
                },
                value
                )
            } catch (exception) {
                action(undefined, exception, number);
                number = undefined;
                // 重新发起请求
                start_requestor(value);
            }
        }
    // 若有时间限制，则开始计时
    if (time_limit !== undefined) {
        if (typeof time_limit === "number" && time_limit > 0) {
            if (time_limit > 0) {
                time_limit = setTimeout(timeout, time_limit);
            }
        } else {
            throw make_reason(factory_name, "Bad time limit.", time_limit);
        }
    }
    // 对于race 或者parallel 工厂，要同时运行所有执行者，
    //  但若还有附加的throttle 参数，则需要限制并行数，
    //  在并行数限制内，当有执行者执行完毕时，才开始下一个执行者
    // 对于sequence 和fallback 工厂，只需将throttle 设置为1 即可
    if (!Number.isSafeInteger(throttle) || throttle < 0) {
        throw make_reason(factory_name, "Bad throttle.", throttle);
    }
    let repeat: number = Math.min(throttle || Infinity, requestor_array.length);
    while (repeat > 0) {
        setTimeout(start_requestor, 0, initial_value);
        repeat -= 1;
    }
    // 接下来返回取消函数，这样就可以从外面通过该函数来取消执行了
    return cancel;
}

// 返回值是返回一个数组的新请求器
// required_array 和 optional_array都有空和非空两种状态
function parallel(
    required_array: RequestCallBack[],
    optional_array: RequestCallBack[],
    time_limit: NodeJS.Timeout,
    time_option: boolean | undefined,
    throttle: number, // 并行数
    factory_name: string = "parallel"
) {
    let number_of_required: number;
    let requestor_array: RequestCallBack[] | undefined;
    if (requestor_array === undefined || requestor_array.length === 0) {
        number_of_required = 0;
        if (optional_array === undefined || optional_array.length === 0) {
            // 若两个数组都为空，则参数错误
            throw make_reason(
                factory_name,
                "Missing requestor array.",
                requestor_array
            );
        }
        // 若只有optional_array 数组有值，则认为它是 requestor_array
        requestor_array = optional_array;
        time_option = true;
    } else {
        // 若只有required_array 数组有值，则认为它是 requestor_array
        number_of_required = required_array.length;
        if (optional_array === undefined || optional_array.length === 0) {
            requestor_array = required_array;
            time_option = undefined;
        } else {
            // 若两个数组都有值，则将其拼接
            requestor_array = required_array.concat(optional_array);
            if (time_option !== undefined && typeof time_option !== "boolean") {
                throw make_reason(
                    factory_name,
                    "Bad time_option",
                    time_option
                );
            }
        }
    }
    // 接着检查数组，并返回新的请求器
    check_requestor_array(requestor_array, factory_name);
    return function parallel_requestor(callback :RequestCallBack, initial_value: Value) {
        check_callback(callback, factory_name);
        let number_of_pending: number = requestor_array!.length;
        let number_of_pending_required = number_of_required;
        let results = [];
        // 调用run 函数，让请求器跑起来
        let cancel = run(
            factory_name,
            requestor_array!,
            initial_value,
            function parallel_action(value, reason, number) {

            },
            function parallel_timeout() {

            },
            time_limit,
            throttle
        )
    }
}







