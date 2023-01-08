// 用于将字符串转换成安全的HTML 字符串
export function entityify(text: string) {
    return String(text).replace(
        /&/g,
        "&amp;"
    ).replace(
        /</g,
        "&lt;"
    ).replace(
        />/g,
        "&gt;"
    ).replace(
        /\\/g,
        "&bsol;"
    ).replace(
        /"/g,
        "&quot;"
    );
}

