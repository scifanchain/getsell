/**
 * 时间戳工具函数
 * 在从 BigInt 迁移到 DateTime 过程中提供兼容性
 */

/**
 * 获取当前时间戳
 * @returns Date 对象
 */
export function getCurrentTimestamp(): Date {
    return new Date();
}

/**
 * 从各种格式转换为 Date 对象
 * @param input BigInt | number | string | Date
 * @returns Date 对象
 */
export function toDate(input: bigint | number | string | Date): Date {
    if (input instanceof Date) {
        return input;
    }
    
    if (typeof input === 'bigint') {
        return new Date(Number(input));
    }
    
    if (typeof input === 'number') {
        return new Date(input);
    }
    
    if (typeof input === 'string') {
        return new Date(input);
    }
    
    return new Date();
}

/**
 * 从各种格式转换为时间戳毫秒数
 * @param input BigInt | number | string | Date
 * @returns 毫秒时间戳
 */
export function toTimestamp(input: bigint | number | string | Date): number {
    return toDate(input).getTime();
}