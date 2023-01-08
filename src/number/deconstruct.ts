// import './style.css'
// Number.EPSILON 是JavaScript 中最小的正数
// 2.220446049250313080847263336181640625e-16

// Number.MAX_SAFE_INTEGER 表示最大安全整数
// 9007199254740991

// 最大安全整数和最小安全整数之间的整数统称为安全整数

// Number.MAX_VALUE 是JavaScript 数值类型中的最大值
// Number.MAX_SAFE_INTEGER * 2 **971
// 将任意正的安全整数与Number.MAX_VALUE 相加的结果还是 Number.MAX_VALUE

// Number.MIN_VALUE 是JavaScript 中刚好比0 大的最小值
// 2 ** -1074

// 我们要判断一个值是不是NaN 时，应当使用Number.isNaN(value)

interface Deconstruct {
    sign: number,
    coefficient: number,
    exponent: number,
    number: number
}

export function deconstruct(number: number): Deconstruct {
    // 符号
    let sign: number = 1;
    // 系数
    let coefficient: number = number;
    // 指数
    let exponent: number = 0;

    // 将符号从系数中提取出来
    if (coefficient < 0) {
        coefficient = -coefficient;
        sign = -1;
    }

    // 磨光系数，将系数不断除以2，直到趋近于0 为止，
    //  然后将除的次数与-1128 相加到exponent。
    //  -1128 就是Number.MIN_VALUE 的指数减去有效位数再减去奖励位的结果
    if (Number.isFinite(number) && number !== 0) {
        exponent = -1128;
        let reduction: number = coefficient;
        // reduction 小到一定程度时，就会变成非规格化浮点数，这时所有位就都被置换出去了
        while (reduction !== 0) {
            exponent += 1;
            reduction /= 2;
        }
        // 磨光系数
        // 如果指数不为0，则通过校正系数来使其为0
        reduction = exponent;
        while (reduction > 0) {
            coefficient /= 2;
            reduction -= 1;
        }
        while (reduction < 0) {
            coefficient *= 2;
            reduction += 1;
        }
    }

    return {
        sign,
        coefficient,
        exponent,
        number
    };
}

// console.log(deconstruct(Number.MAX_SAFE_INTEGER))
