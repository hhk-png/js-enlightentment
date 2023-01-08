// import './style.css'
import big_float from './number/big_float'
import big_integer from './number/big_integer'

console.log(big_float.string({exponent: 12, coefficient: [big_integer.plus, 2]}, 10))
