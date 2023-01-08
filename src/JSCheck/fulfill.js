import {entityify} from './entityify'

const rx_delete_default = /[<>&%"\\]/g;
const rx_syntactic_variable = /\{([^{}:\s]+)(?::([^{}:\s]+))?\}/g;

// 捕获组
// [0] 原始值(括号内的占位符)
// [1] 对象路径
// [2] 编码


// 移除所有尖括号等字符
function default_encoder(replacement) {
    return String(replacement).replace(rx_delete_default, "");
}

export default Object.freeze(function fulfill(
    string, // 含占位符的字符串
    container, // 含替换值的对象或数组, 函数
    encoder = default_encoder // 可选的编码函数或者包含多个编码函数的对象
) {
    return string.replace(
        rx_syntactic_variable,
        function (original, path, encoding = "") {
            try {
                // container
                // 使用path 去container 中找到对应的值，path 包含用点分隔的一个或者多个字段名
                let containerReplacement = typeof container === 'function'
                    ? container
                    : path.split(".").reduce(
                        function (acc, element) {
                            return acc[element];
                        },
                        container
                    );
                // 如果替换值是一个函数，那么调用它以获取真的替换值
                if (typeof containerReplacement === 'function') {
                    containerReplacement = containerReplacement(path, encoding)
                }
                // encoder
                // 如果存在编码函数对象，那么执行其中之一，
                //  如果就是一个编码函数，那么直接执行
                let encoderReplacement = (typeof encoder === 'object'
                    ? encoder[encoding]
                    : encoder
                )(containerReplacement, path, encoding);
                // 如果计算好的替换值是一个数值或者布尔类型，那么将其转换为字符串
                if (typeof encoderReplacement === 'number'
                    || typeof encoderReplacement === 'boolean'
                ) {
                    encoderReplacement = String(encoderReplacement);
                }
                // 如果替换值是一个字符串，那么返回该替换值，否则返回原始值
                return typeof encoderReplacement === 'string'
                    ? encoderReplacement
                    : original;
            } catch (ignore) {
                return original;
            }
        }
    )
})









