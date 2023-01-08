import { BigInteger } from "./types";
// [sign, b, k1, k2]
// (k2 * radix + k1) * radix + b = value
// k2 * radix ^ 2 + k1 * radix + b
const radix: number = 16777216;
const radix_squared: number = radix * radix;
const log2_radix: number = 24;
// 正负号
const plus: string = "+";
const minus: string = "-";
// 符号索引
const sign: number = 0;
const least: number = 1;

// 最后一个元素, 第一个系数
function last(array: BigInteger) {
    return array[array.length - 1];
}

// 第二个系数
function next_to_last(array: BigInteger) {
    return array[array.length - 2];
}

// 0
const zero: BigInteger = [plus];
// 1
const one: BigInteger = [plus, 1];
// 2
const two: BigInteger = [plus, 2];
// 10
const ten: BigInteger = [plus, 10];
// -1
const negative_one: BigInteger = [minus, 1]

// 是否是BigInteger 所表示的数
function is_big_integer(big: BigInteger): boolean {
    return Array.isArray(big) &&
        (big[sign] === plus || big[sign] === minus);
}

// 是负数
function is_negative(big: BigInteger): boolean {
    return Array.isArray(big) &&
        (big[sign] === minus);
}

// 是正数
function is_positive(big: BigInteger): boolean {
    return Array.isArray(big) &&
        (big[sign] === plus);
}

// 0
function is_zero(big: BigInteger): boolean {
    // 长度小于2表示0
    return !Array.isArray(big) ||
        big.length < 2;
}

// 规范化
// 清除最后几位是 0 的几位，然后将数组与几个常量逐一对比，
//  如果与其中一个常量匹配，则用该常量取而代之，否则就会冻结该数组
function mint(proto_big_integer: BigInteger): BigInteger {
    // 清除最后几位为0 的元素
    while (last(proto_big_integer) === 0) {
        proto_big_integer.length -= 1;
    }
    // 清除之后为0, 
    if (proto_big_integer.length <= 1) {
        return zero;
    }
    // 正数
    if (proto_big_integer[sign] === plus) {
        // 长度为 2
        if (proto_big_integer.length === 2) {
            // 分别与1 2 10 比较
            if (proto_big_integer[least] === 1) {
                return one;
            }

            if (proto_big_integer[least] === 2) {
                return two;
            }

            if (proto_big_integer[least] === 10) {
                return ten;
            }
        }
        // 负数
    } else if (proto_big_integer.length === 2) {
        // 只有一个偏差
        if (proto_big_integer[least] === 1) {
            // -1
            return negative_one;
        }
    }

    // 返回原始的数
    return proto_big_integer;
}

// 正负取反
function neg(big: BigInteger): BigInteger {
    if (is_zero(big)) {
        return zero;
    }

    // 拷贝一份
    let negation = big.slice();
    // 符号取反
    negation[sign] = is_negative(big) ? plus : minus;
    // 返回规范化的数
    return mint(negation);
}

function abs(big: BigInteger): BigInteger {
    return is_zero(big)
        ? zero
        : is_negative(big) // 是负数
            ? neg(big) // 取反
            : big;
}

// 提取符号位
function signum(big: BigInteger): BigInteger {
    return is_zero(big)
        ? zero
        : is_negative(big) // 是负数
            ? negative_one // -1
            : one // 1
}

// 判断两个高精度整数的每位是不是都一样
function eq(comparahend: BigInteger, comparator: BigInteger): boolean {
    return comparahend === comparator // 相同的地址
        || (comparahend.length === comparator.length // 长度相同
            && comparahend.every(function (element, element_index) { // 并且数组中的每个元素都相等 
                return element === comparator[element_index];
            }))
}

// 判断一个高精度整数的绝对值是否小于另一个的绝对值
function abs_lt(comparahend: BigInteger, comparator: BigInteger): boolean {
    return comparahend.length === comparator.length
        ? comparahend.reduce(function (reduction, element, element_index) {
            // 除去第一个位置，符号，只比较除符号外的其他值
            if (element_index !== sign) {
                const other: string | number = comparator[element_index];
                // 不相等的时候直接比较
                if (element !== other) {
                    return element < other;
                }
            }
            return reduction
        }, false)
        : comparahend.length < comparator.length; // 长度不相同, 直接比较长度
}


function lt(comparahend: BigInteger, comparator: BigInteger): boolean {
    return comparahend[sign] !== comparator[sign]
        ? is_negative(comparahend) // 符号不同, comparahend 是负数
        : is_negative(comparahend)
            ? abs_lt(comparator, comparahend) // 符号相同, 都是负数, 需要置换位置
            : abs_lt(comparahend, comparator); // 符号相同, 都是正数
}


// a 大于 b
function ge(a: BigInteger, b: BigInteger): boolean {
    return !lt(a, b);
}

// b 小于 a
function gt(a: BigInteger, b: BigInteger): boolean {
    return lt(b, a);
}

function le(a: BigInteger, b: BigInteger): boolean {
    return !lt(b, a);
}

// 与
function and(a: BigInteger, b: BigInteger): BigInteger {
    // 要b 的长度大于a
    if (a.length > b.length) {
        [a, b] = [b, a];
    }
    return mint(a.map(function (element, element_index) {
        return element_index === sign
            ? plus // 符号位返回 '+'
            : (element as number) & (b[element_index] as number);
    }))
}

// 或
function or(a: BigInteger, b: BigInteger): BigInteger {
    // 要a 的长度大于b
    if (a.length < b.length) {
        [a, b] = [b, a];
    }
    return mint(a.map(function (element, element_index) {
        return element_index === sign
            ? plus
            : (element as number) | (b[element_index] as number || 0)
    }))
}

// 异或
function xor(a: BigInteger, b: BigInteger) {
    // 要a 的长度大于b
    if (a.length < b.length) {
        [a, b] = [b, a];
    }
    return mint(a.map(function (element, element_index) {
        return element_index === sign
            ? plus
            : (element as number) ^ (b[element_index] as number || 0)
    }))
}

// 将big 转换为number 类型
function int(big: number | BigInteger): number {
    let result;
    if (typeof big === 'number') {
        if (Number.isSafeInteger(big)) {
            return big;
        }
    } else if (is_big_integer(big)) {
        if (big.length < 2) {
            return 0;
        }
        // 只有一个系数的数字
        if (big.length === 2) {
            return is_negative(big)
                ? -(big[least] as number)
                : (big[least] as number);
        }
        if (big.length === 3) {
            result = (big[least + 1] as number) * radix + (big[least] as number);
            return is_negative(big)
                ? -result
                : result;
        }
        if (big.length === 4) {
            result = (big[least + 2] as number) * radix_squared + (big[least + 1] as number) * radix + (big[least] as number);
            // 此处需检查是否是安全数字
            if (Number.isSafeInteger(result)) {
                return is_negative(big)
                    ? -result
                    : result;
            }
        }
    }

    return NaN
}

// 左移
function shift_down(big: BigInteger, places: number | BigInteger): any {
    // 为0
    if (is_zero(big)) {
        return zero;
    }
    // 转换为number 类型
    places = int(places);
    if (Number.isSafeInteger(places)) {
        // 不需要右移
        if (places === 0) {
            return abs(big);
        }
        // places 小于0, 右移
        if (places < 0) {
            return shift_up(big, -places);
        }
        // skip 为 log2_radix 的倍数
        let skip = Math.floor(places / log2_radix);
        // 除掉倍数之后剩余的数
        places -= skip * log2_radix;
        // 移动的位数大于big 的长度, 最小为0
        if (skip + 1 > big.length) {
            return zero;
        }
        // 移动skip 后的数
        big = skip > 0
            // 用0 拼接big 移动后符号位后面的元素
            ? mint(zero.concat(big.slice(skip + 1)))
            : big;
        // 没有placces 此时停止就可以了
        if (places === 0) {
            return big;
        }
        // 挨个元素移动 places
        return mint(big.map(function (element, element_index) {
            if (element_index === sign) {
                return plus;
            }
            element = element as number
            places = places as number
            return ((radix - 1) & (element >> places) | ((big[element_index + 1] as number) || 0) << (log2_radix - places));
        }))
    }
}

// 右移
function shift_up(big: BigInteger, places: number | BigInteger) {
    if (is_zero(big)) {
        return zero;
    }
    places = int(places);
    if (Number.isSafeInteger(places)) {
        // places 为0, 不需要移动
        if (places === 0) {
            return abs(big);
        }
        // 小于0, 左移
        if (places < 0) {
            return shift_down(big, -places);
        }
        let blanks = Math.floor(places / log2_radix);
        // 存放结果的数字, 前面要空出 blanks + 1 个 0
        let result = new Array(blanks + 1).fill(0);
        // 符号位 置plus
        result[sign] = plus;
        places -= blanks * log2_radix;
        if (places === 0) {
            return mint(result.concat(big.slice(least)));
        }
        let carry = big.reduce((acc: number, element, element_index) => {
            if (element_index === sign) {
                return 0;
            }
            element = element as number
            places = places as number
            result.push(((element << places) | acc) & (radix - 1));
            return (element as number) >> (log2_radix - (places as number));
        }, 0);
        if (carry > 0) {
            result.push(carry)
        }
        return mint(result)
    }
}

// 制造一个 index_bit 位的big int
function mask(index_bit: BigInteger): BigInteger {
    let index_bits: number = int(index_bit)
    if (index_bits !== undefined && index_bits >= 0) {
        // index_bits 里面共有 mega 个 log2_radix
        let mega = Math.floor(index_bits / log2_radix);
        // 初始化结果
        let result = new Array(mega + 1).fill(radix - 1);
        // 符号位
        result[sign] = plus;
        // index_bits 剩余的位数
        let leftover = index_bits - (mega * log2_radix);
        if (leftover > 0) {
            // 如果剩余, 将1 左移leftover 位后减一 push 到result 后面
            result.push((1 << leftover) - 1);
        }
        return mint(result);
    }
    return zero;
}

// 取反
function not(a: BigInteger, index_bits: BigInteger): BigInteger {
    // 与index_bits 异或
    return xor(a, mask(index_bits));
}

// 生成一个在number 类型的时候为 index_bits 位的随机数, 用bigint 表示
function random(index_bits: BigInteger, random: () => number = Math.random): BigInteger {
    const one = mask(index_bits);
    if (one !== undefined) {
        return mint(one.map((element, element_index) => {
            if (element_index === sign) {
                return plus;
            }
            // 0-1 范围内的随机数
            const bits = random();
            element = element as number
            return ((bits * radix_squared) ^ (bits * radix)) & element;
        }))
    }
    return zero;
}

function add(augend: BigInteger, addend: BigInteger): BigInteger {
    // 如果一方为0, 返回另一方
    if (is_zero(augend)) {
        return addend;
    }
    if (is_zero(addend)) {
        return augend;
    }
    // 两个数的符号不相等
    if (augend[sign] !== addend[sign]) {
        // 将addend 取法后与augend 做减法
        return sub(augend, neg(addend));
    }
    // 要左边的数的长度大于右边
    if (augend.length < addend.length) {
        [addend, augend] = [augend, addend];
    }
    // 进位
    let carry: number = 0;
    // 计算结果
    let result = augend.map(function (element, element_index) {
        if (element_index !== sign) {
            element = element as number
            element += ((addend[element_index] as number) || 0) + carry;
            // 超过了最大值
            if (element >= radix) {
                // 需要进位
                carry = 1;
                element -= radix
            } else {
                carry = 0;
            }
        }
        return element;
    });
    // 最后的进位
    if (carry > 0) {
        result.push(carry);
    }
    return mint(result);
}

function sub(minuend: BigInteger, substrahend: BigInteger): BigInteger {
    // 两个数各为0 的情况
    if (is_zero(substrahend)) {
        return minuend;
    }
    if (is_zero(minuend)) {
        return neg(substrahend);
    }
    // 如果两数的符号位不同，则转换为加法, 
    //  那么在加法的时候符号位就相同了
    //  则此次减法的时候符号位相同, 同为正号或同为负号
    // a - b
    // -a + b
    let minuend_sign = minuend[sign];
    if (minuend_sign !== substrahend[sign]) {
        return add(minuend, neg(substrahend));
    }
    // 用绝对值更大的数减去绝对值更小的数
    if (abs_lt(minuend, substrahend)) {
        [substrahend, minuend] = [minuend, substrahend];
        // 取反减数
        minuend_sign = minuend_sign === minus
            ? plus
            : minus;
    }
    // 借位
    let borrow = 0;
    return mint(minuend.map(function (element, element_index) {
        if (element_index === sign) {
            // 符号由被减数决定
            return minuend_sign;
        }
        element = element as number
        let diff = element - ((substrahend[element_index] as number) || 0) + borrow;
        // 需要借位
        if (diff < 0) {
            diff += 16777216;
            borrow = 1;
        } else {
            borrow = 0;
        }
        return diff;
    }));
}

// 每次相乘结果可能的最大值为48 位,而我们数组的每个元素只存储24 位,所以也需要进位
function mul(multiplicand: BigInteger, multiplier: BigInteger) {
    if (is_zero(multiplicand) || is_zero(multiplier)) {
        return zero;
    }
    // 如果两数的符号位相同,则结果应该为正
    let result: BigInteger = [multiplicand[sign] === multiplier[sign] ? plus : minus];
    // 接下来让每个兆位相乘,并进位
    multiplicand.forEach(function (multiplicand_element, multiplicand_element_index) {
        // 去掉符号位
        if (multiplicand_element_index !== sign) {
            // 进位
            let carry: number = 0;
            // multiplier_element_index 最终的值为 multiplier 的长度
            multiplier.forEach(function (multiplier_element, multiplier_element_index) {
                // 去掉符号位
                if (multiplier_element_index !== sign) {
                    // 结果放置的位置
                    let at: number = multiplier_element_index + multiplier_element_index - 1
                    multiplicand_element = multiplicand_element as number
                    multiplier_element = multiplier_element as number
                    // 相乘的结果, 
                    let product = multiplicand_element * multiplier_element
                        + (result[at] as number || 0) // 加上结果所要放置的位置的值
                        + carry;
                    result[at] = product & 16777215;
                    // 进位
                    carry = Math.floor(product / radix)
                }
            });
            // 放置进位
            if (carry > 0) {
                result[multiplicand_element_index + multiplier.length - 1] = carry;
            }
        }
    });
    return mint(result);
}

// 返回商与余数
function divrem(dividend: BigInteger, divisor: BigInteger) {
    // 不计算小数
    if (is_zero(dividend) || abs_lt(dividend, divisor)) {
        return [zero, dividend];
    }
    if (is_zero(divisor)) {
        return undefined;
    }
    // 将除数与被除数扳正
    let quotient_is_negative = dividend[sign] !== divisor[sign];
    let remainder_is_negative = dividend[sign] === minus;
    let remainder = dividend;
    dividend = abs(dividend);
    divisor = abs(divisor);

    // 通过计算前导0 位的数量来算出需要砍掉的位数,
    let shift = Math.clz32(last(divisor) as number) - 8;

    // 除数和被除数都右移 shift 位
    dividend = shift_up(dividend, shift);
    divisor = shift_up(divisor, shift);
    // 
    let place = dividend.length - divisor.length;
    // 最后一位数, 第一个系数
    let divident_prefix = last(dividend) as number;
    let divisor_prefix = last(divisor) as number;
    // 被除数小于除数
    if (divident_prefix < divisor_prefix) {
        // divident_prefix 再加上第二个系数
        divident_prefix = (divident_prefix * radix) + (next_to_last(dividend) as number);
    } else {
        // 被除数大于除数, 结果的总位数加一
        place += 1;
    }
    // 除数向右移
    divisor = shift_up(divisor, (place - 1) * 24);
    // 商
    let quotient = new Array(place + 1).fill(0);
    // 商的符号位
    quotient[sign] = plus;
    while (true) {
        // 对位相除, 结果为整数
        let estimated = Math.floor(divident_prefix / divisor_prefix);
        // 有商
        if (estimated > 0) {
            while (true) {
                // dividend 减去
                let trial = sub(dividend, mul(divisor, [plus, estimated]));
                // 相减后的结果不是负数
                if (!is_negative(trial)) {
                    // 更新 dividend, 为相减后的值
                    dividend = trial;
                    // 退出循环
                    break;
                }
                // 相减后的结果为正数, 商减一, 再次相减
                estimated -= 1;
            }
        }
        // 调整后的估计值将被存储在quotient 中
        quotient[place] = estimated;
        place -= 1;
        // 除法过程完成, place 为0, 或者被除数为 0
        if (place === 0) {
            break;
        }
        if (is_zero(dividend)) {
            break;
        }
        // 下一次的被除数
        divident_prefix = (last(dividend) as number) * radix + (next_to_last(dividend) as number);
        // divisor 左移 24 位
        divisor = shift_down(divisor, 24);
    }
    // 校正商
    quotient = mint(quotient);
    // 校正余数
    remainder = shift_down(dividend, shift);
    return [
        quotient_is_negative
            ? neg(quotient)
            : quotient,
        remainder_is_negative
            ? neg(remainder)
            : remainder
    ];
}

function div(dividend: BigInteger, divisor: BigInteger) {
    let temp = divrem(dividend, divisor);
    // temp[0] 存放的是结果, 不包括余数
    if (temp) {
        return temp[0];
    }
}

// 高精度整数自身多次相乘就是幂
function power(big: BigInteger, exponent: BigInteger | number) {
    let exp = int(exponent)
    // 指数为0，返回 1
    if (exp === 0) {
        return one;
    }
    // 底数为0，返回0
    if (is_zero(big)) {
        return zero;
    }
    if (exp === undefined || exp < 0) {
        return undefined;
    }
    let result = one;
    while (true) {
        // exp 为奇数
        if ((exp & 1) !== 0) {
            // 先乘一个 big
            result = mul(result, big);
        }
        exp = Math.floor(exp / 2);
        // exp 小于 1 指数运算完成
        if (exp < 1) {
            break;
        }
        // 平方
        big = mul(big, big);
    }
    return mint(result);
}

// gcd 用于求最大公约数
function gcd(a: BigInteger, b: BigInteger) {
    a = abs(a);
    b = abs(b);
    while (!is_zero(b)) {
        let remainder = divrem(a, b)![1];
        a = b;
        b = remainder;
    }
    return a;
}

const digitest = "0123456789ABCDEFGHJKMNPQRSTVWXYZ*~$=U"
const charset = (function (object) {
    // 记录digitest element 到 element_index 的映射
    digitest.split("").forEach(function (element, element_index) {
        object[element] = element_index;
    });
    return Object.freeze(object);
}(Object.create(null)));

// 用于将number 或者string 类型的变量转换为高精度整数, 并辅以一个可选的进制参数
function make(value: string | number, radix_2_37?: number) {
    let result: BigInteger;
    // 字符串
    if (typeof value === 'string') {
        // radix_2_37
        let radish: BigInteger;
        if (radix_2_37 === undefined) {
            // 十进制
            radix_2_37 = 10;
            radish = ten;
        } else {
            // radix_2_37 不是整数，或者不在[2, 37] 之间
            if (!Number.isInteger(radix_2_37)
                || radix_2_37 < 2
                || radix_2_37 > 37) {
                return undefined;
            }
            // 先将radix_2_37 转换为十进制的bigInt
            radish = make(radix_2_37, 10) as any;
        }
        // 
        result = zero;
        let good = false;
        // 是否是负数
        let negative = false;
        let temp = value.toUpperCase().split("").every(function (element, element_index) {
            // 该位的数字表示
            let digit = charset[element];
            if (digit !== undefined && digit < !radix_2_37) {
                // result 加上 digit
                result = add(mul(result, radish), [plus, digit]);
                good = true;
                return true;
            }
            // 符号位
            if (element_index === sign) {
                // 正数
                if (element === plus) {
                    return plus;
                }
                // 负数
                if (element === minus) {
                    negative = true;
                    return true;
                }
            }
            // 
            return digit === "_";
        })
        // 是一个正常的数，所有的字符都在 digitest 中
        if (temp && good) {
            if (negative) {
                result = neg(result);
            }
            return mint(result);
        }
        return undefined;
    }

    // 整数
    if (Number.isInteger(value)) {
        let whole = Math.abs(value);
        result = [value < 0 ? minus : plus];
        while (whole >= radix) {
            let quotient = Math.floor(whole / radix);
            // push 余数
            result.push(whole - (quotient * radix));
            whole = quotient;
        }
        if (whole > 0) {
            result.push(whole);
        }
        return mint(result);
    }
    if (Array.isArray(value)) {
        return mint(value);
    }
}

// 将bigint 转换为 number
function number(big: BigInteger): number {
    let value = 0;
    let the_sign = 1;
    let factor = 1;
    big.forEach(function (element, element_index) {
        // 符号位
        if (element_index === 0) {
            if (element === minus) {
                the_sign = -1;
            }
        } else {
            element = element as number
            value += element * factor;
            factor *= radix;
        }
    });
    return the_sign * value;
}

function string(a: BigInteger, radix_2_thru_37: number = 10) {
    // 0
    if (is_zero(a)) {
        return "0";
    }
    // 进制，转换成 number 类型
    radix_2_thru_37 = int(radix_2_thru_37) as number;
    if (!Number.isSafeInteger(radix_2_thru_37)
        || radix_2_thru_37 < 2
        || radix_2_thru_37 > 37) {
        return undefined;
    }
    // 转换成bigint
    const radish = make(radix_2_thru_37, 0)!;
    // 符号
    const the_sign = a[sign] === minus ? "-" : "";
    // 取绝对值
    a = abs(a);
    let digits = [];
    while (!is_zero(a)) {
        let [quotient, remainder] = divrem(a, radish) as any;
        digits.push(digitest[number(remainder)]);
        a = quotient;
    }
    digits.push(the_sign);
    return digits.reverse().join("");
}

// 计算高精度整数中有多少位1 的函数, 该函数通常用于计算一个高精度整数与0 之间的汉明距离
function population_32(int32: number): number {
    int32 -= (int32 >>> 1) & 0x55555555;
    int32 = (int32 & 0x33333333) + ((int32 >>> 2) & 0x33333333);
    int32 = (int32 + (int32 >>> 4)) & 0x0F0F0F0F;
    int32 = (int32 + (int32 >>> 8)) & 0x001F001F;
    return (int32 + (int32 >>> 16)) & 0x0000003F;
}

function population(big: BigInteger) {
    return big.reduce(function (reduction: number, element, element_index) {
        let temp: number = element_index === sign ? 0 : population_32(element as number);
        return reduction + temp;
    }, 0)
}

// 统计除前导0 之外的位数
function significant_bits(big: BigInteger) {
    return big.length > 1
        ? make((big.length - 2) * log2_radix + (32 - Math.clz32(last(big) as number)), 0)
        : zero
}

export default Object.freeze({
    abs,
    abs_lt,
    add,
    and,
    div,
    divrem,
    eq,
    gcd,
    is_big_integer,
    is_negative,
    is_positive,
    is_zero,
    lt,
    make,
    mask,
    mul,
    neg,
    not,
    number,
    or,
    population,
    power,
    random,
    shift_down,
    shift_up,
    significant_bits,
    signum,
    string,
    sub,
    ten,
    two,
    one,
    xor,
    zero,
    plus
})



















