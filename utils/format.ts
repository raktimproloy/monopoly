export function toBanglaNum(num: number | string | undefined | null): string {
    if (num === undefined || num === null) return '';
    const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return num.toString().replace(/\d/g, (d) => banglaDigits[parseInt(d, 10)]);
}
