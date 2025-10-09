/**
 * ULID 工具函数
 * 用于生成去中心化的唯一标识符
 */

import { ulid } from 'ulid';

/**
 * 生成新的ULID
 * @returns ULID字符串
 */
export function generateULID(): string {
    return ulid();
}

/**
 * 验证ULID格式
 * @param id - 待验证的ID
 * @returns 是否为有效的ULID
 */
export function isValidULID(id: string): boolean {
    if (!id || typeof id !== 'string') {
        return false;
    }
    
    // ULID应该是26位字符，只包含Crockford的Base32字符
    const ulidRegex = /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/;
    return ulidRegex.test(id);
}

/**
 * 从ULID中提取时间戳
 * @param id - ULID
 * @returns 时间戳或null
 */
export function extractTimestamp(id: string): Date | null {
    try {
        if (!isValidULID(id)) {
            return null;
        }
        
        // ULID的前10位包含时间戳信息
        const timeString = id.substring(0, 10);
        const timestamp = parseInt(timeString, 32);
        return new Date(timestamp);
    } catch (error) {
        return null;
    }
}

/**
 * 创建带前缀的ULID（用于区分不同类型的实体）
 * @param prefix - 前缀
 * @returns 带前缀的ULID
 */
export function generatePrefixedULID(prefix: string): string {
    return `${prefix}_${generateULID()}`;
}

/**
 * 为不同模型生成专用的ULID
 */
export const generators = {
    author: (): string => generatePrefixedULID('auth'),
    work: (): string => generatePrefixedULID('work'), 
    chapter: (): string => generatePrefixedULID('chap'),
    content: (): string => generatePrefixedULID('cont')
};