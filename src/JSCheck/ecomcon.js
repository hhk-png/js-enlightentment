
// tag_array 包含可被启用作标记单词的字符串。
const rx_crlf = /\n|\r\n?/;
const rx_ecomcon = /^\/\/([a-zA-Z0-9_]+)\u0020?(.*)$/;
// 捕获组
//  [1] 启用的标记
//  [2] 该行剩余的内容



const rx_tag = /^[a-zA-Z0-9_]+$/;

export default Object.freeze(function ecomcon(source_string, tar_array) {
    const tag = Object.create(null);
    tar_array.forEach(
        function (string) {
            if (!rx_tag.test(string)) {
                throw new Error("ecomcon: " + string);
            }
            tag[string] = true;
        }
    );
    return source_string.split(rx_crlf).map(
        function (line) {
            const array = line.match(rx_ecomcon);
            return Array.isArray(array)
                ? tag[array[1]] === true
                    ? array[2] + "\n"
                    : ""
                : line + "\n";
        }
    ).join("")
})


