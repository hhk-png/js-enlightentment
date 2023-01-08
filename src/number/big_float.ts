import big_integer from './big_integer'
import { deconstruct } from './deconstruct';
import { BigFloat, BigInteger, IntOp, FloatOp } from './types';


// 判断一个值是不是合法的高精度浮点数
function is_big_float(big: BigFloat): boolean {
    return typeof big === 'object'
        && big_integer.is_big_integer(big.coefficient)
        && Number.isSafeInteger(big.exponent);
}

function is_negative(big: BigFloat): boolean {
    return big_integer.is_negative(big.coefficient);
}

function is_positive(big: BigFloat): boolean {
    return big_integer.is_positive(big.coefficient);
}

function is_zero(big: BigFloat): boolean {
    return big_integer.is_zero(big.coefficient);
}

// 0 的指数表示
const zero: BigFloat = Object.create(null);
zero.coefficient = big_integer.zero;
zero.exponent = 0;
Object.freeze(zero);

function make_big_float(coefficient: BigInteger, exponent: number): BigFloat {
    if (big_integer.is_zero(coefficient)) {
        return zero;
    }
    const new_big_float: BigFloat = Object.create(null);
    new_big_float.coefficient = coefficient;
    new_big_float.exponent = exponent;
    return Object.freeze(new_big_float);
}

const big_integer_ten_million = big_integer.make(10000000);

// 用于将高精度浮点数转换为JavaScript 的数值
function number(a: any) {
    return is_big_float(a)
        ? a.exponent === 0 // BigFloat
            ? big_integer.number(a.coefficient)
            : big_integer.number(a.coefficient) * (10 ** a.exponent)
        : typeof a === 'number'
            ? a // number
            : big_integer.is_big_integer(a) // BigInteger
                ? big_integer.number(a)
                : Number(a);
}

function neg(a: BigFloat) {
    return make_big_float(big_integer.neg(a.coefficient), a.exponent);
}

function abs(a: BigFloat) {
    return is_negative(a)
        ? neg(a)
        : a;
}

function conform_op(op: IntOp) {
    return function (a: BigFloat, b: BigFloat): BigFloat {
        // 指数的差
        const differential: number = a.exponent - b.exponent;
        return differential === 0
            // 指数相同，对系数进行操作
            ? make_big_float(op(a.coefficient, b.coefficient), a.exponent)
            : differential > 0 // a 的指数大于b 的指数
                ? make(
                    op(
                        // 缩放a 的系数，放大
                        big_integer.mul(
                            a.coefficient,
                            big_integer.power(big_integer.ten, differential) as BigInteger
                        ),
                        big_integer.make(b.exponent, 10) as BigInteger
                    ),
                    // 乘以较小的指数
                    b.exponent
                )
                : make( // b 的系数大于a 的系数
                    op(
                        a.coefficient,
                        // 缩放b 的系数，缩小
                        big_integer.mul(
                            b.coefficient,
                            big_integer.power(big_integer.ten, -differential) as BigInteger
                        )
                    ),
                    // 乘以较小的a 的系数
                    a.exponent
                )
    }
}

const add: FloatOp = conform_op(big_integer.add);
const sub: FloatOp = conform_op(big_integer.sub);

function mul(multiplicand: BigFloat, multiplier: BigFloat): BigFloat {
    return make(
        // 系数相乘
        big_integer.mul(multiplicand.coefficient, multiplier.coefficient),
        // 指数相加
        multiplicand.exponent + multiplier.exponent
    );
}

// 除法函数至少会返回你指定的精度位数，我们设精度的默认值为-4，也就是小数点后四位
function div(dividend: BigFloat, divisor: BigFloat, precision = -4): BigFloat | undefined {
    if (is_zero(dividend)) {
        return zero;
    }
    if (is_zero(divisor)) {
        return undefined;
    }
    // 解析出系数和指数
    let {coefficient, exponent} = dividend;
    // 指数运算
    exponent -= divisor.exponent;
    // 系数缩放到所需要的精度
    if (typeof precision !== 'number') {
        precision = number(precision);
    }
    if (exponent > precision) {
        coefficient = big_integer.mul(
            coefficient,
            big_integer.power(big_integer.ten, exponent - precision)!
        );
        exponent = precision;
    }
    let remainder;
    [coefficient, remainder] = big_integer.divrem(
        coefficient, divisor.coefficient
    ) as any;
    // 根据需要舍入结果
    if (!big_integer.abs_lt(
        big_integer.add(remainder, remainder),
        divisor.coefficient
    )) {
        coefficient = big_integer.add(
            coefficient,
            big_integer.signum(dividend.coefficient)
        );
    }
    return make_big_float(coefficient, exponent);
}

// 规范化高精度浮点数，即在不丢失信息的情况下，尽可能让高精度浮点数的指数接近 0
function normalize(a: BigFloat) {
    // 解析出系数和指数
    let {coefficient, exponent} = a;
    // 系数为0
    if (coefficient.length < 2) {
        return zero;
    }
    // 指数不为0
    if (exponent !== 0) {
        // 若指数为正，则将系数乘以 10 ** exponent
        if (exponent > 0) {
            coefficient = big_integer.mul(
                coefficient,
                big_integer.power(big_integer.ten, exponent) as BigInteger
            );
            exponent = 0;
        } else {
            // 指数小于0
            let quotient;
            let remainder;
            while (exponent <= -7 && ((coefficient[1] as number) & 127) === 0) {
                // 除以 10000000，知道余数不为0
                [quotient, remainder] = big_integer.divrem(
                    coefficient, 
                    big_integer_ten_million!
                ) as any;
                // 余数不为0，break
                if (remainder !== big_integer.zero) {
                    break;
                }
                // 系数替换成商
                coefficient = quotient;
                // 指数加7
                exponent += 7;
            }
            while (exponent < 0 && ((coefficient[1] as number) & 1) === 0) {
                // 除以 10
                [quotient, remainder] = big_integer.divrem(
                    coefficient,
                    big_integer.ten
                ) as any;
                if (remainder !== big_integer.zero) {
                    break;
                }
                coefficient = quotient;
                exponent += 1;
            }
        }
    }
    return make_big_float(coefficient, exponent);
}

// make 函数负责将高精度正数，字符串或者JavaScript 的number 类型转换为高精度浮点数
const number_pattern = /^(-?\d+)(?:\.(\d*))?(?:e(-?\d+))?$/;
// (-?\d+)：整数
// (?:\.(\d*))?：小数
// (?:e(-?\d+))?：指数
function make(a: any, b: any): BigFloat {
    // (big_integer)
    // (big_integer, exponent)
    // (string)
    // (string, radix)
    // (number)

    if (big_integer.is_big_integer(a)) {
        return make_big_float(a, b || 0);
    }
    if (typeof a === 'string') {
        if (Number.isSafeInteger(b)) {
            return make(big_integer.make(a, b), 0);
        }
        let parts = a.match(number_pattern);
        if (parts) {
            let frac = parts[2] || "";
            return make(
                big_integer.make(parts[1] + frac),
                (Number(parts[3]) || 0) - frac.length
            );
        }
    }
    if (typeof a === 'number' && Number.isFinite(a)) {
        if (a === 0) {
            return zero;
        }
        let {sign, coefficient, exponent} = deconstruct(a);
        if (sign < 0) {
            coefficient = -coefficient;
        }
        coefficient = big_integer.make(coefficient) as any;
        // 如果指数为负，可以将其系数除以 2 ** abs(exponent)
        if (exponent < 0) {
            return normalize(div(
                make(coefficient, 0),
                make(big_integer.power(big_integer.two, -exponent), 0),
                b
            ) as BigFloat);
        }
        if (exponent > 0) {
            coefficient = big_integer.mul(
                coefficient as any, 
                big_integer.power(big_integer.two, exponent) as BigInteger
            ) as any;
            exponent = 0;
        }
        return make(coefficient, exponent);
    }
    if (is_big_float(a)) {
        return a;
    }
    return zero;
}

function string(a: BigFloat, radix: any) {
    if (is_zero(a)) {
        return "0";
    }
    // 
    if (is_big_float(radix)) {
        // 进制数规范化成bigfloat
        radix = normalize(radix);
        return radix && radix.exponent === 0
            // 直接取进制数的系数
            ? big_integer.string(a.coefficient, radix.coefficient)
            // 进制数不能为完整的 bigfloat
            : undefined;
    }
    // 规范化a
    a = normalize(a);
    // a的系数
    let s: string = big_integer.string(big_integer.abs(a.coefficient))!;
    console.log(s)
    // 指数小于0
    if (a.exponent < 0) {
        let point = s.length + a.exponent;
        if (point <= 0) {
            // s 前面拼接 0
            //  最终的长度为 s.length + |a.exponent| + 1
            s = "0".repeat(1 - point) + s;
            point = 1;
        }
        // 小数点
        s = s.slice(0, point) + "." + s.slice(point);
    } else if (a.exponent > 0) {
        // 
        s += "0".repeat(a.exponent);
    }
    // 负号
    if (big_integer.is_negative(a.coefficient)) {
        s = "-" + s;
    }
    return s;
}

function scientific(a: BigFloat) {
    if (is_zero(a)) {
        return "0";
    }
    a = normalize(a);
    // 系数
    let s = big_integer.string(big_integer.abs(a.coefficient));
    // 指数和系数的规范化，系数只保留个位数
    let e = a.exponent + s!.length - 1;
    if (s!.length > 1) {
        s = s?.slice(0, 1) + "." + s?.slice(1);
    }
    // 指数为0 的话就不拼接
    if (e !== 0) {
        s += "e" + e;
    }
    // 符号
    if (big_integer.is_negative(a.coefficient)) {
        s = "-" + s;
    }
    return s;
}

export default Object.freeze({
    abs,    
    add,    
    div,    
    is_big_float,    
    is_negative,    
    is_positive,    
    is_zero,
    make,    
    mul,    
    neg,    
    normalize,    
    number,    
    scientific,    
    string,    
    sub,    
    zero
})















