import big_integer from "./big_integer";
import { deconstruct } from "./deconstruct";
import { BigRational, BigInteger, IntOp, RationalOp } from "./types";


function is_big_rational(a: BigRational): boolean {
    return typeof a === 'object'
        && big_integer.is_big_integer(a.numerator)
        && big_integer.is_big_integer(a.denominator);
}

function is_integer(a: BigRational): boolean {
    return big_integer.eq(big_integer.one, a.denominator) 
        || big_integer.is_zero(big_integer.divrem(a.numerator, a.denominator)![1]);
}

function is_negative(a: BigRational): boolean {
    return big_integer.is_negative(a.numerator);
}

// 生成有理数
function make_big_rational(numerator: BigInteger, denominator: BigInteger): BigRational {
    const new_big_rational: BigRational = Object.create(null);
    new_big_rational.numerator = numerator;
    new_big_rational.denominator = denominator;
    return Object.freeze(new_big_rational);
}

const zero: BigRational = make_big_rational(big_integer.zero, big_integer.one);
const one: BigRational = make_big_rational(big_integer.one, big_integer.one);
const two: BigRational = make_big_rational(big_integer.two, big_integer.one);

function neg(a: BigRational) {
    return make(big_integer.neg(a.numerator), a.denominator);
}

function abs(a: BigRational) {
    return is_negative(a)
        ? neg(a)
        : a;
}


function conform_op(op: IntOp): RationalOp {
    return function (a: BigRational, b: BigRational) {
        try {
            if (big_integer.eq(a.denominator, b.denominator)) {
                return make(
                    op(a.numerator, b.numerator),
                    a.denominator
                );
            }
            return normalize(make(
                op(
                    big_integer.mul(a.numerator, b.denominator),
                    big_integer.mul(b.numerator, a.denominator)
                ),
                big_integer.mul(a.denominator, b.denominator)
            )!);
        } catch (ignore) {

        }
    } as RationalOp
}

const add: RationalOp = conform_op(big_integer.add);
const sub: RationalOp = conform_op(big_integer.sub);

// 将分子位加上分母
function inc(a: BigRational) {
    return make(
        big_integer.add(a.numerator, a.denominator),
        a.denominator
    );
}

// 将分子位减去分母
function dec(a: BigRational) {
    return make(
        big_integer.sub(a.numerator, a.denominator),
        a.denominator
    );
}

function mul(multiplicand: BigRational, multiplier: BigRational) {
    return make(
        big_integer.mul(multiplicand.numerator, multiplier.numerator),
        big_integer.mul(multiplicand.denominator, multiplier.denominator)
    );
}

function div(a: BigRational, b: BigRational): BigRational {
    return make(
        big_integer.mul(a.numerator, b.denominator),
        big_integer.mul(a.denominator, b.numerator)
    )!;
}

// function remainder(a: BigRational, b: BigRational) {
//     const quotient = div(normalize(a), normalize(b));
//     return make(
//         big_integer.divrem(quotient.numerator, quotient.denominator)![1],
//         big_integer.one
//     );
// }

// 取倒数
function reciprocal(a: BigRational): BigRational {
    return make(a.denominator, a.numerator)!;
}

// 转换为int 会损失精度
function integer(a: BigRational): BigRational {
    return a.denominator === big_integer.one
        ? a
        : make(
            // 除以
            big_integer.div(a.numerator, a.denominator)!, 
            big_integer.one
        )!
}

// 转换为int 丢失的小数部分
function fraction(a: BigRational) {
    return sub(a, integer(a))
}

function normalize(a: BigRational): BigRational {
    let {numerator, denominator} = a;
    // 分母为1，
    if (big_integer.eq(big_integer.one, denominator)) {
        return a;
    }
    // 最大公约数
    let g_c_d = big_integer.gcd(numerator, denominator);
    return big_integer.eq(big_integer.one, g_c_d)
        ? a
        : make( // 分子和分母同时除以最大公约数
            big_integer.div(numerator, g_c_d)!,
            big_integer.div(denominator, g_c_d)!
        )!
}

function eq(comparahend: BigRational, comparator: BigRational) {
    return comparahend === comparator
        ? true
        : big_integer.eq(comparahend.denominator, comparator.denominator)
            ? big_integer.eq(comparahend.numerator, comparator.numerator)
            : big_integer.eq(
                big_integer.mul(comparahend.numerator, comparator.denominator),
                big_integer.mul(comparator.numerator, comparahend.denominator)
            );
}

function lt(comparahend: BigRational, comparator: BigRational) {
    return is_negative(comparahend) !== is_negative(comparator)
        ? is_negative(comparator)
        : is_negative(sub(comparahend, comparator));
}

const number_pattern = /^(-?)(?:(\d+)(?:(?:\u0020(\d+))?\/(\d+)|(?:\.(\d*))?(?:e(-?\d+))?)|\.(\d+))$/
// 生成精确的高精度有理数
function make(numerator: any, denominator: any): BigRational | undefined {
    if (denominator !== undefined) {
        // 分子为0，就不用考虑分母了
        numerator = big_integer.make(numerator as number)!
        if (big_integer.zero === numerator) {
            return zero;
        }
        denominator = big_integer.make(denominator as number)!
        if (
            !big_integer.is_big_integer(numerator)
            || !big_integer.is_big_integer(denominator)
            || big_integer.zero === denominator
        ) {
            return undefined;
        }
        // 分母为负，把符号位发配到分子那里去
        if (big_integer.is_big_integer(denominator)) {
            numerator = big_integer.neg(numerator);
            denominator = big_integer.abs(denominator);
        }
        return make_big_rational(numerator, denominator);
    }

    // 只有一个参数且为字符串
    if (typeof numerator === 'string') {
        let parts = numerator.match(number_pattern);
        if (!parts) {
            return undefined;
        }
        // 捕获组
        // [1] 符号
        // [2] 整数
        // [3] 分子
        // [4] 分母
        // [5] 小数
        // [6] 指数
        // [7] 纯小数

        // 纯小数
        if (parts[7]) {
            return make(
                // 小数部分除以小数字符串的长度
                big_integer.make(parts[1] + parts[7]),
                big_integer.power(big_integer.ten, parts[7].length)
            );
        }
        // 分母存在
        if (parts[4]) {
            let bottom = big_integer.make(parts[4]);
            // 分子存在
            if (parts[3]) {
                return make(
                    // 分子与前面的 整数乘以分母 相加
                    //  作为分子
                    big_integer.add(
                        // 乘以bottom
                        big_integer.mul(
                            big_integer.make(parts[1] + parts[2])!,
                            bottom!
                        ),
                        big_integer.make(parts[3])!
                    ),
                    bottom
                );
            }
            // 不存在分子
            //  整数直接作为分子, bottom 作为分母
            return make(parts[1] + parts[2], bottom);
        }
        // 小数部分 为整数
        let frac = parts[5] || "";
        // 指数部分，减去了frac 的长度，为后面分母乘以对应的次方
        let exp = (Number(parts[6]) || 0) - frac.length;
        // 指数部分小于0
        if (exp < 0) {
            return make(
                parts[1] + parts[2] + frac,
                // 本该在分子上乘以 10 ** exp
                //  转到分母商乘以 10 ** -exp
                big_integer.power(big_integer.ten, -exp)
            );
        }
        return make(
            // 小数部分作为整数，分母则应该增大响应的倍数，整体应该缩小
            big_integer.mul(
                big_integer.make(parts[1] + parts[2] + parts[5])!,
                big_integer.power(big_integer.ten, exp)!
            ),
            big_integer.one
        );
    }
    if (typeof numerator === 'number' && !Number.isSafeInteger(numerator)) {
        // 解构分子
        let {sign, coefficient, exponent} = deconstruct(numerator);
        if (sign < 0) {
            coefficient = -coefficient;
        }
        let coefficient2: BigInteger = big_integer.make(coefficient)!;
        // 指数大于0
        if (exponent >= 0) {
            return make(
                big_integer.mul(
                    // 系数乘以 2 ** exponent
                    coefficient2,
                    big_integer.power(big_integer.two, exponent)!
                ),
                // 分母为1
                big_integer.one
            );
        }
        // 指数小于 0
        return normalize(make(
            coefficient2,
            // 2 ** -exponent 作为分母
            big_integer.power(big_integer.two, -exponent)
        )!);
    }
    return make(numerator, big_integer.one);
}

function number(a: BigRational) {
    return big_integer.number(a.numerator) / big_integer.number(a.denominator);
}

// 将高精度有理数转换为字符串，其结果是精确的
//  nr_places：精度
function string(a: BigRational, nr_places: BigInteger) {
    if (a === zero) {
        return "0";
    }
    let {numerator, denominator} = normalize(a)
    // 将分子除以分母，如果没有余数，就能直接得到结果
    let [quotient, remains] = big_integer.divrem(numerator, denominator) as any;
    let result = big_integer.string(quotient);
    if (remains !== big_integer.zero) {
        remains = big_integer.abs(remains);
        if (nr_places !== undefined) {
            let [fractus, residue] = big_integer.divrem(
                // 余数乘以10 ** nr_places 作为被除数
                big_integer.mul(
                    remains,
                    big_integer.power(big_integer.ten, nr_places)!
                ),
                // 分母作为除数
                denominator
            )!;
            // 上面的余数residue 乘以2 大于分母
            //  表示大于0.5 需要进位
            if (!big_integer.abs_lt(
                big_integer.mul(residue, big_integer.two),
                denominator
            )) {
                // 商加1
                fractus = big_integer.add(fractus, big_integer.one);
            }
            // 拼接小数部分
            result += "." + big_integer.string(fractus)?.padStart(
                big_integer.number(nr_places),
                "0"
            );
        } else {
            result = (result === "0" ? "" : result + " ")
                + big_integer.string(remains)
                + "/"
                + big_integer.string(denominator);
        }
    }
    return result;
}

export default Object.freeze({
    abs,    
    add,    
    dec,    
    div,    
    eq,    
    fraction,    
    inc,    
    integer,    
    is_big_rational,
    is_integer,    
    is_negative,    
    lt,    
    make,    
    mul,    
    neg,   
    normalize,    
    number,    
    one,    
    reciprocal,    
    string,    
    sub,    
    two,    
    zero
})








