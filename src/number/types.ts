
export interface BigFloat {
    coefficient: BigInteger,
    exponent: number
}

export interface BigRational {
    numerator: BigInteger,
    denominator: BigInteger
}

export type BigInteger = (string | number)[]

export type IntOp = (a: BigInteger, b: BigInteger) => BigInteger;
export type FloatOp = (a: BigFloat, b: BigFloat) => BigFloat;
export type RationalOp = (a: BigRational, b: BigRational) => BigRational;


