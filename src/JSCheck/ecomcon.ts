
// tag_array 包含可被启用作标记单词的字符串。
// 匹配各行
const rx_crlf = /\n|\r\n?/;
// 匹配注释行
const rx_ecomcon = /^\/\/([a-zA-Z0-9_]+)\u0020?(.*)$/;
// 捕获组
//  [1] 启用的标记
//  [2] 该行剩余的内容

// 匹配tag 是否符合规则
const rx_tag = /^[a-zA-Z0-9_]+$/;

// 删掉source_string 中注释行的tag 不在tag_array 中的内容
export default Object.freeze(function ecomcon(source_string: string, tag_array: string[]): string {
    const tag: Record<string, boolean> = Object.create(null);

    tag_array.forEach(
        function (string) {
            // tag_array 中的数组必须符合rx_tag 正则表达式
            if (!rx_tag.test(string)) {
                throw new Error("ecomcon: " + string);
            }
            // 并将数组转换为对象来表示
            tag[string] = true;
        }
    );
    // 将source_string 根据空格分割，并将有标记的行删掉tag后拼接，返回各行拼接后的内容
    return source_string.split(rx_crlf).map(
        function (line) {
            // 对每行使用正则表达式rx_ecomcon 匹配，如果匹配到则改行为注释
            const array = line.match(rx_ecomcon);
            // array[1] 为tag
            // array[2] 为注释内容
            return Array.isArray(array)
                ? tag[array[1]] === true
                    ? array[2] + "\n" // 如果tag 在tag_array 中存在，则取出后面的内容
                    : ""
                : line + "\n";
        }
    ).join("")
})


