/**
 * ULID 工具函数
 * 用于生成去中心化的唯一标识符
 */

const { ulid } = require('ulid');

/**
 * 生成新的ULID
 * @returns {string} ULID字符串
 */
function generateULID() {
    return ulid();
}

/**
 * 验证ULID格式
 * @param {string} id - 待验证的ID
 * @returns {boolean} 是否为有效的ULID
 */
function isValidULID(id) {
    if (!id || typeof id !== 'string') {
        return false;
    }
    
    // ULID应该是26位字符，只包含Crockford的Base32字符
    const ulidRegex = /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/;
    return ulidRegex.test(id);
}

/**
 * 从ULID中提取时间戳
 * @param {string} id - ULID
 * @returns {Date|null} 时间戳或null
 */
function extractTimestamp(id) {
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
 * @param {string} prefix - 前缀
 * @returns {string} 带前缀的ULID
 */
function generatePrefixedULID(prefix) {
    return `${prefix}_${generateULID()}`;
}

/**
 * 为不同模型生成专用的ULID
 */
const generators = {
    author: () => generatePrefixedULID('auth'),
    work: () => generatePrefixedULID('work'), 
    chapter: () => generatePrefixedULID('chap'),
    content: () => generatePrefixedULID('cont')
};

module.exports = {
    generateULID,
    isValidULID,
    extractTimestamp,
    generatePrefixedULID,
    generators
};