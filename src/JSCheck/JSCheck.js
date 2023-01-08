import fulfill from './fulfill'

// resolve 函数接收一个value，如果该value 是函数，那么会调用它并返回它的返回值
function resolve(value, ...rest) {
    return typeof value === 'function'
        ? value(...rest)
        : value;
}

// constant
function literal(value) {
    return function () {
        return value;
    }
}

// boolean 制定器会返回一个产生布尔值的生成器
function boolean(bias = 0.5) {
    // 如果bias 是0.25，那么其返回值会有约25% 的概率为true
    bias = resolve(bias);
    return function () {
        return Math.random() < bias;
    }
}

// number 制定器，用于生成一个范围内的数值
function number(from = 1, to = 0) {
    from = Number(resolve(from));
    to = Number(resolve(to));
    if (from > to) {
        [from, to] = [to, from];
    }
    const difference = to - from;
    return function () {
        Math.random() * difference + from;
    }
}

// one_of 制定器的参数是一个数组，包含值和生成器，
//  返回一个返回数组中随即结果的生成器
function one_of(array, weights) {
    // one_of(array)
    //      返回array 中的一个元素并进行解析(resolve)
    //      各元素被选中的概率相等
    // one_of(array, weights)
    //      两个参数均为数组且长度相等。
    //      权重越大的元素被选中的概率越高

    if (
        !Array.isArray(array)
        || array.length < 1
        || (
            weights !== undefined
            && (!Array.isArray(weights) || array.length !== weights.length)
        )
    ) {
        throw new Error("JSCheck one_of");
    }

    if (weights === undefined) {
        return function () {
            return resolve(array[Math.floor(Math.random() * array.length)]);
        };
    }
    const total = weights.reduce(function (acc, val) { return acc + val; });
    let base = 0;
    const list = weights.map(function (val) {
        base += val;
        return base / total;
    });
    return function () {
        let x = Math.random();
        return resolve(array[list.findIndex(function (element) {
            return element >= x;
        })]);
    };
}

// sequence 制定器的参数也是一个数组，包含值和生成器，
//  返回一个按顺序依此返回数组内容的生成器
function sequence(seq) {
    seq = resolve(seq);
    if (!Array.isArray(seq)) {
        throw "JSCheck sequence";
    }
    let element_index = -1;
    return function () {
        element_index += 1;
        if (element_index >= seq.length) {
            element_index = 0;
        }
        return resolve(seq[element_index]);
    };
}

// falsy 制定器会返回一个只会生成幻假值的生成器
const bottom = [false, null, undefined, "", 0, NaN];
function falsy() {
    one_of(bottom);
}

// integer 制定器返回一个生成指定范围内整数的生成器，
//  如果不指定范围，则返回1000 以内的质数
const primes = [
    2, 3, 5, 7,
    11, 13, 17, 19, 23, 29,
    31, 37, 41, 43, 47, 53, 59, 61, 67, 71,
    73, 79, 83, 89, 97, 101, 103, 107, 109, 113,
    127, 131, 137, 139, 149, 151, 157, 163, 167, 173,
    179, 181, 191, 193, 197, 199, 211, 223, 227, 229,
    233, 239, 241, 251, 257, 263, 269, 271, 277, 281,
    283, 293, 307, 311, 313, 317, 331, 337, 347, 349,
    353, 359, 367, 373, 379, 383, 389, 397, 401, 409,
    419, 421, 431, 433, 439, 443, 449, 457, 461, 463,
    467, 479, 487, 491, 499, 503, 509, 521, 523, 541,
    547, 557, 563, 569, 571, 577, 587, 593, 599, 601,
    607, 613, 617, 619, 631, 641, 643, 647, 653, 659,
    661, 673, 677, 683, 691, 701, 709, 719, 727, 733,
    739, 743, 751, 757, 761, 769, 773, 787, 797, 809,
    811, 821, 823, 827, 829, 839, 853, 857, 859, 863,
    877, 881, 883, 887, 907, 911, 919, 929, 937, 941,
    947, 953, 967, 971, 977, 983, 991, 997
]

// value 的number 形式
function integer_value(value, default_value) {
    value = resolve(value);
    return typeof value === "number"
        ? Math.floor(value)
        : typeof value === "string"
            ? value.charCodeAt(0)
            : default_value;
}

// [i, j] 范围内的整数
function integer(i, j) {
    if (i === undefined) {
        return one_of(primes);
    }
    i = integer_value(i, 1);
    if (j === undefined) {
        j = i;
        i = 1;
    } else {
        j = integer_value(j, 1);
    }
    if (i > j) {
        [i, j] = [j, i];
    }
    return function () {
        return Math.floor(Math.random() * (j + 1 - i) + i);
    };
}

// character 制定器返回一个产生字符的生成器
function character(i, j) {
    if (i === undefined) {
        return character(32, 126);
    }
    if (typeof i === "string") {
        return j === undefined
            ? one_of(i.split(""))
            : character(i.charCodeAt(0), j.charCodeAt(0));
    }
    const ji = integer(i, j);
    return function () {
        return String.fromCodePoint(ji());
    }
}

// array 制定器返回一个生成数组的生成器。
// 如果参数是一个包含值和生成器的数组，那么结果是这些值和生成器所产生的值的子集数组。
function array(first, value) {
    if (Array.isArray(first)) {
        return function () {
            return first.map(resolve);
        }
    }
    if (first === undefined) {
        first = integer(4);
    }
    if (value === undefined) {
        value = integer();
    }
    return function () {
        const dimension = resolve(first);
        const result = new Array(dimension).fill(value);
        return typeof value === "function"
            ? result.map(resolve)
            : result;
    };
}

// let my_little_array_specifier = jsc.array([
//     jsc.integer(),    
//     jsc.number(100),    
//     jsc.string(8, jsc.character("A", "Z"))
// ])
// my_little_array_specifier()         // [179,  21.228644298389554, "TJFJPLQA"]
// my_little_array_specifier()        // [797,  57.05485427752137,  "CWQDVXWY"]
// my_little_array_specifier()         // [941,  91.98980208020657,  "QVMGNVXK"]
// my_little_array_specifier()         // [11, 87.07735128700733,  "GXBSVLKJ"]

// let my_other_little_array_specifier = jsc.array(4);
// my_other_little_array_specifier()   // [659, 383, 991, 821]
// my_other_little_array_specifier()   // [479, 701, 47, 601]
// my_other_little_array_specifier()   // [389, 271, 113, 263]
// my_other_little_array_specifier()   // [251, 557, 547, 197]


// string 制定器返回一个返回字符串的生成器
function string(...parameters) {
    const length = parameters.length;
    if (length === 0) {
        return string(integer(10), character());
    }

    return function () {
        let pieces = [];
        let parameter_index = 0;
        let value;
        while (true) {
            value = resolve(parameters[parameter_index]);
            parameter_index += 1;
            if (value === undefined) {
                break;
            }
            if (
                Number.isSafeInteger(value)
                && value >= 0
                && parameters[parameter_index] !== undefined
            ) {
                pieces = pieces.concat(
                    new Array(value).fill(parameters[parameter_index]).map(resolve)
                );
                parameter_index += 1;
            } else {
                pieces.push(String(value));
            }
        }
        return pieces.join("");
    };
}

// let my_little_3_letter_word_specifier = jsc.string(
//      jsc.sequence(["c", "d", "f"]),    
//      jsc.sequence(["a", "o", "i", "e"]),
//      jsc.sequence(["t", "g", "n", "s", "l"])
// )]);

// my_little_3_letter_word_specifier() 
// "cat"my_little_3_letter_word_specifier() 
// "dog"my_little_3_letter_word_specifier() 
// "fin"my_little_3_letter_word_specifier() 
// "ces"

// let my_little_ssn_specifier = jsc.string(
//     3, jsc.character("0", "9"),    
//     "-",    
//     2, jsc.character("0", "9"),    
//     "-",    
//     4, jsc.character("0", "9")
// );
// my_little_ssn_specifier()           // "231-89-2167"
// my_little_ssn_specifier()           // "706-32-0392"
// my_little_ssn_specifier()           // "931-89-4315"
// my_little_ssn_specifier()           // "636-20-3790"

const misc = [true, Infinity, -Infinity, falsy(), Math.PI, Math.E, Number.EPSILON];

function any() {
    return one_of([integer(), number(), string(), one_of(misc)]);
}

// object 制定器返回一个返回对象的生成器。
//  默认情况下，他会产生一个有随机属性名和随机值的小对象
function object(subject, value) {
    if (subject === undefined) {
        subject = integer(1, 4);
    }
    return function () {
        let result = {};
        const keys = resolve(subject);
        if (typeof keys === "number") {
            const text = string();
            const gen = any();
            let i = 0;
            while (i < keys) {
                result[text()] = gen();
                i += 1;
            }
            return result;
        }
        if (value === undefined) {
            if (keys && typeof keys === "object") {
                Object.keys(subject).forEach(function (key) {
                    result[key] = resolve(keys[key]);
                });
                return result;
            }
        } else {
            const values = resolve(value);
            if (Array.isArray(keys)) {
                keys.forEach(function (key, key_index) {
                    result[key] = resolve(
                        Array.isArray(values)
                            ? values[key_index % values.length]
                            : value
                    );
                });
                return result;
            }
        }
    }
}

// 如果传入一个包含键名的数组以及一个值（或者生成器），
//  那么生成的对象会采用数组中的内容作为键名，并将后者作为值。
//  例如，我们可以为其提供一个包含3过6个键名的数组，
//  每个键名由4个小写字符组成，然后指定值为布尔类型。
// let my_little_constructor = jsc.object(
//     jsc.array(        
//         jsc.integer(3, 6),        
//         jsc.string(4, jsc.character("a", "z"))    
//     ),    
//     jsc.boolean()
// );
// my_little_constructor() // {"hiyt": false, "rodf": true, "bfxf": false, "ygat": false, "hwqe": false}
// my_little_constructor() // {"hwbh": true, "ndjt": false, "chsn": true, "fdag": true, "hvme": true}
// my_little_constructor() // {"qedx": false, "uoyp": true, "ewes": true}
// my_little_constructor() // {"igko": true, "txem": true, "yadl": false, "avwz": true}

// 如果传入的参数是对象，那么生成的对象会与之有一样的属性名。
// let my_little_other_constructor = jsc.object({
//     left: jsc.integer(640),    
//     top: jsc.integer(480),    
//     color: jsc.wun_of(["black", "white", "red", "blue", "green", "gray"])
// });
// my_little_other_constructor()   // {"left": 305, "top": 360, "color": "gray"}
// my_little_other_constructor()   // {"left": 162, "top": 366, "color": "blue"}
// my_little_other_constructor()   // {"left": 110, "top": 5, "color": "blue"}
// my_little_other_constructor()   // {"left": 610, "top": 61, "color": "green"}

const ctp = "{name}: {class}{cases} cases tested, {pass} pass{fail}{lost}\n"
// 用于把结果数值处理成报告
function crunch(detail, cases, serials) {
    let class_fail;
    let class_pass;
    let class_lost;
    let case_index = 0;
    let lines = "";
    let losses = [];
    let next_case;
    let now_claim;
    let index_class = 0;
    let index_fail;
    let index_lost;
    let index_pass;
    let report = "";
    let the_case;
    let the_class;
    let total_fail = 0;
    let total_lost = 0;
    let total_pass = 0;

    function generate_line(type, level) {
        if (detail >= level) {
            lines += fulfill(
                " {type} [{serial}] {classification}{args}\n",
                {
                    type,
                    serial: the_case.serial,
                    classification: the_case.classification,
                    args: JSON.stringify(
                        the_case.args
                    ).replace(
                        /^\[/,
                        "("
                    ).replace(
                        /\]$/,
                        ")"
                    )
                }
            );
        }
    }

    function generate_class(key) {
        if (detail >= 3 || class_fail[key] || class_lost[key]) {
            report += fulfill(
                " {key} pass {pass}{fail}{lost}\n",
                {
                    key,
                    pass: class_pass[key],
                    fail: class_fail[key]
                        ? " fail " + class_fail[key]
                        : "",
                    lost: class_lost[key]
                        ? " lost " + class_lost[key]
                        : ""
                }
            );
        }
        if (cases) {
            while (true) {
                next_case = cases[serials[case_index]];
                case_index += 1;
                if (!next_case || (next_case.claim !== now_claim)) {
                    if (now_claim) {
                        if (detail >= 1) {
                            report += fulfill(
                                ctp,
                                {
                                    name: the_case.name,
                                    class: index_class
                                        ? index_class + " classifications, "
                                        : "",
                                    cases: index_pass + index_fail + index_lost,
                                    pass: index_pass,
                                    fail: index_fail
                                        ? ", " + index_fail + " fail"
                                        : "",
                                    lost: index_lost
                                        ? ", " + index_lost + " lost"
                                        : ""
                                }
                            );
                        }
                        if (detail >= 2) {
                            Object.keys(
                                class_pass
                            ).sort().forEach(
                                generate_class
                            );
                            report += lines;
                        }
                    }
                    total_fail += index_fail;
                    total_lost += index_lost;
                    total_pass += index_pass;
                }
                if (!next_case) {
                    break;
                }
                index_class = 0;
                index_fail = 0;
                index_lost = 0;
                index_pass = 0;
                class_pass = {};
                class_fail = {};
                class_lost = {};
                lines = "";
            }
            the_case = next_case;
            now_claim = the_case.claim;
            the_class = the_case.classification;
            if (the_class && typeof class_pass[the_class] !== "number") {
                class_pass[the_class] = 0;
                class_fail[the_class] = 0;
                class_lost[the_class] = 0;
                index_class += 1;
            }
            if (the_case.pass === true) {
                if (the_class) {
                    class_pass[the_class] += 1;
                }
                if (detail >= 4) {
                    generate_line("Pass", 4);
                }
                index_pass += 1;
            } else if (the_case.pass === false) {
                if (the_class) {
                    class_fail[the_class] += 1;
                }
                generate_line("FAIL", 2);
                index_fail += 1;
            } else {
                if (the_class) {
                    class_lost[the_class] += 1;
                }
                generate_line("LOST", 2);
                losses[index_lost] = the_case;
                index_lost += 1;
            }
        }
        report += fulfill(
            "\nTotal pass {pass}{fail}{lost}\n",
            {
                pass: total_pass,
                fail: total_fail
                    ? ", fail " + total_fail
                    : "",
                lost: total_lost
                    ? ", lost " + total_lost
                    : ""
            }
        );
    }
    return {
        losses,
        report,
        summary: {
            pass: total_pass,
            fail: total_fail,
            lost: total_lost,
            total: total_pass + total_fail + total_lost,
            ok: total_lost === 0 && total_fail === 0 && total_pass > 0
        }
    };
}

const reject = Object.freeze({});
export default Object.freeze(function jsc_constructor() {
    let all_claims = [];
    // check 函数负责做事情，
    function check(configuration) {
        let the_claims = all_claims;
        all_claims = [];
        let index_trial = 
            configuration.index_trial === undefined
            ? 100
            : configuration.index_trial;
        // 调用回调函数
        function go(on, report) {
            try {
                return configuration[on](report);
            } catch (ignore) { }
        }
        // check函数会检查所有claim，结果会被传回回调函数中
        let cases = {};
        let all_started = false;
        let index_pending = 0;
        let serials = [];
        let timeout_id;
        function finish() {
            if (timeout_id) {
                clearTimeout(timeout_id);
            }
            const {
                losses,
                summary,
                report,
            } = crunch(
                configuration.detail === undefined
                ? 3
                : configuration.detail,
                cases,
                serials
            );
            losses.forEach(function (the_case) {
                go("on_lost", the_case);
            });
            go("on_result", summary);
            go("on_report", report);
            cases = undefined;
        }

        function register(serial, value) {
            // 会被claim 函数用于注册一个新的用例，也会被该用例用于产生判定结果
            // 如果一个用力对象结束，那么后续的所有超时产生结果都应该被忽略。
            if (cases) {
                let the_case = cases[serial];
                // 如果该序号从未被出现过，那么注册一个新的用例，
                //  将其加入用例集合，再将序号加入序列号，并且等待结果的用例数加1
                if (the_case === undefined) {
                    value.serial = serial;
                    cases[serial] = value;
                    serials.push(serial);
                    index_pending += 1;
                } else {
                    // 否则，就意味着现在是一个已存在的用例要获取它的判定结果。
                    //  如果这个时候已经存在一个预期之外的结果，那么抛出一个异常。
                    //  每个用例都只能有一个结果。
                    if (
                        the_case.pass !== undefined
                        || typeof value !== "boolean"
                    ) {
                        throw the_case;
                    }
                    // 如果结果是一个布尔类型的值，那么更新用例，
                    //  然后将其发送给对应的on_pass或者on_fail。
                    if (value === true) {
                        the_case.pass = true;
                        go("on_pass", the_case);
                    } else {
                        the_case.pass = false;
                        go("on_fail", the_case);
                    }
                    // 然后将等待结果的用例数减1。
                    //  如果所有的用例都结束且有了结果，那么整个过程就结束了。
                    index_pending -= 1;
                    if (index_pending <= 0 && all_started) {
                        finish();
                    }
                }
            }
            return value;
        }
        let unique = 0;
        // 处理各个claim 的逻辑
        the_claims.forEach(function (a_claim) {
            let at_most = index_trial * 10;
            let case_index = 0;
            let attemp_index = 0;
            // 循环对用例的数据生成和测试
            while (case_index < index_trial && attemp_index < at_most) {
                if (a_claim(register, unique) !== reject) {
                    case_index += 1;
                    unique += 1;
                }
                attemp_index += 1;
            }
        });
        // 标记所有用例已开始
        all_started = true;
        // 如果所有用例都返回了判定结果，那么生成报告
        if (index_pending <= 0) {
            finish();
        } else if (configuration.time_limit !== undefined) {
            // 否则，开始计时
            timeout_id = setTimeout(finish, configuration.time_limit);
        }
    }

    // claim 函数用于各个claim。
    //  当check函数被调用时，所有claim都会被检查一遍。
    //  一个claim包含：
    //  一个用于展示在报告中的描述性名字；
    //  一个用于判定结果的predicate函数，如果该函数返回true则说明试验正常；
    //  一个signature函数数组，包含制定器，用于生成predicate函数所用的数据；
    //  一个可选的classifier分类函数，应返回字符串，用于根据signature
    //      中产生的值对试验进行分类，如果该函数返回undefined
    //      则说明该试验不属于任何一个分类集合。
    function claim(name, predicate, signature, classifier) {
        if (Array.isArray(signature)) {
            signature = [signature];
        }
        function the_claim(register, serial) {
            let args = signature.map(resolve);
            let classification = "";
            // 如果有classifer函数传入，那么用它来归类。
            //  若其结果不是字符串，则拒绝该用例。
            if (classifier !== undefined) {
                classification = classifier(...args);
                if (typeof classification !== "string") {
                    return reject;
                }
            }
            // 创建一个判定结果的函数，它是对register 函数的一个分装
            let verdict = function (result) {
                register(serial, result);
            }
            // 将该试验注册成一个对象
            register(serial, {
                args,
                claim: the_claim,
                classification,
                classifier,
                name,
                predicate,
                serial,
                signature,
                verdict
            });
            // 然后调用predicate，往其传入verdict函数和所有用例参数
            return predicate(verdict, ...args);
        }
        all_claims.push(the_claim);
    }
    // 最后将实例构造出来并返回
    return Object.freeze({
        // 各种制定器
        any,
        array,
        boolean,
        character,
        falsy,
        integer,
        literal,
        number,
        object,
        one_of,
        sequence,
        string,
        // 两个主要函数
        check,
        claim
    })
})



