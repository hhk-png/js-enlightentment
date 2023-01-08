
export function stringify_bottom(little_bottom: undefined | null | number): string {
    if (little_bottom === undefined) {
        return "undefined";
    }
    if (little_bottom === null) {
        return "null";
    }
    if (Number.isNaN(little_bottom)) {
        return "NaN";
    }
    return "";
}