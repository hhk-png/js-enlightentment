export function make_reason(factory_name, execuse, evidence) {
    const reason = new Error("parseq." + factory_name + (
        execuse === undefined
            ? ""
            : ": " + execuse
    ));
    reason.evidence = evidence;
    return reason;
}

// 回调函数应该是一个接收两个参数的函数
function check_callback(callback, factory_name) {
    if (typeof callback !== "function"
        || callback.length !== 2) {
        throw make_reason(factory_name, "Not a callback.", callback);
    }
}

// 确保数组中的所有元素都是执行者函数
function check_requestor_array(request_array, factory_name) {
    if (
        !Array.isArray(request_array)
        || request_array.length < 1
        || request_array.some(function (requestor) {
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

// run 函数是parseq 的灵魂，它负责所有的核心逻辑，执行请求器，时间管理，取消逻辑和限流
function run(
    factory_name,
    requestor_array,
    initial_value,
    action,
    timeout,
    time_limit,
    throttle = 0
) {
    let cancel_array = new Array(requestor_array.length);
    // 下一个要执行的requestor
    let next_number = 0;
    let timer_id;
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

    function start_requestor(value) {
        // 若还有未执行的执行者，则执行
        if (
            cancel_array !== undefined
            || next_number < requestor_array.length
        ) {
            // 每个执行者都有一个下标编号
            let number = next_number;
            next_number += 1;
            // 将回调函数传入指定编号的执行者，并将对应的取消函数预先存起来备用
            const requestor = requestor_array[number];
            try {
                cancel_array[number] = requestor(
                    function start_requestor_callback(value, reason) {
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
    // 同时请求
    let repeat = Math.min(throttle || Infinity, requestor_array.length);
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
    required_array,
    optional_array,
    time_limit,
    time_option,
    throttle, // 并行数
    factory_name = "parallel"
) {
    let number_of_required;
    let requestor_array;
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
    return function parallel_requestor(callback, initial_value) {
        check_callback(callback, factory_name);
        let number_of_pending = requestor_array.length;
        let number_of_pending_required = number_of_required;
        let results = [];
        // 调用run 函数，让请求器跑起来
        let cancel = run(
            factory_name,
            requestor_array,
            initial_value,
            function parallel_action(value, reason, number) {
                // action 函数将每个请求的结果装进一个数组中，parallel 的返回值就是每个请求器执行完毕之后的结果数组
                results[number] = value;
                number_of_pending -= 1;
                // 如果当前返回结果的请求器是必执行请求器，需要确保其执行成功。
                //  若它执行失败，则整个新请求器会被认为执行失败。
                //  但是如果非必执行请求器执行失败，则可以继续执行
                if (number < number_of_required) {
                    number_of_pending_required -= 1;
                    if (value === undefined) {
                        cancel(reason);
                        callback(undefined, reason);
                        callback = undefined;
                        return;
                    }
                }
                // 如果所有的请求器都执行完毕，
                //  或者所有必执行请求器都执行成功且没有定义time_option，
                //  则请求器完成
                if (
                    number_of_pending < 1
                    || (
                        time_option === undefined
                        && number_of_pending_required < 1
                    )
                ) {
                    cancel(make_reason(factory_name, "Optional."));
                    callback(
                        factory_name === "sequence"
                            ? results.pop()
                            : results
                    );
                    callback = undefined;
                }
            },
            function parallel_timeout() {
                // 当计时器时间到且time_option为true时，停止所有工作；
                //  而当time_option 为false 时，必执行请求器执行没有时间限制，
                //  非必执行请求器则只能在超时前或者所有必执行请求器完成之前执行
                const reason = make_reason(
                    factory_name,
                    "Timeout.",
                    time_limit
                );
                if (time_option === false) {
                    time_option = undefined;
                    if (number_of_pending_required < 1) {
                        cancel(reason);
                        callback(results);
                    }
                } else {
                    // 哪怕超时了，若所有的必执行请求器都在此之前执行成功，
                    //  那么整个parallel逻辑都算成功
                    cancel(reason);
                    if (number_of_pending_required < 1) {
                        callback(results);
                    } else {
                        callback(undefined, reason);
                    }
                    callback = undefined;
                }
            },
            time_limit,
            throttle
        );
        return cancel;
    }
}

function race(requestor_array, time_limit, throttle) {
    // factory_name
    const factory_name = throttle === 1 ? "fallback" : "race";
    check_requestor_array(requestor_array, factory_name);
    return function race_requestor(callback, initial_value) {
        check_callback(callback, factory_name);
        // 等待request 函数的长度
        let number_of_pending = requestor_array.length;
        let cancel = run(
            factory_name,
            requestor_array,
            // 初始值
            initial_value,
            function race_action(value, reason, number) {
                number_of_pending -= 1;
                // 一旦有请求器胜出，则将剩下额请求器取消，并将刚才的结果传入callback
                if (value !== undefined) {
                    cancel(make_reason(factory_name, "Loser.", number));
                    callback(value);
                    callback = undefined;
                }
                // 若一个都没成功，那么认为失败了
                if (number_of_pending < 1) {
                    cancel(reason);
                    callback(undefined, reason);
                    callback = undefined;
                }
            },
            // 超时
            function race_timeout() {
                let reason = make_reason(
                    factory_name,
                    "Timeout.",
                    time_limit
                );
                cancel(reason);
                callback(undefined, reason);
                callback = undefined;
            },
            // 时间限制
            time_limit,
            // 并行数
            throttle
        );
        return cancel;
    };
}

// fallback在本质上是限流的race
function fallback(requestor_array, time_limit) {
    // 他返回的请求器会依此执行requestor_array 中的请求器，直到遇到第一个成功的请求器
    return race(requestor_array, time_limit, 1);
}

// sequence 在本质上是限流的parallel，且会层层传递每次执行的结果
function sequence(requestor_array, time_limit) {
    // 依此执行数组中的请求器，将上一个请求器产生的值传递给下一个请求器，直到所有请求器成功
    return parallel(
        requestor_array,
        undefined,
        time_limit,
        undefined,
        1,
        "sequence"
    );
}






