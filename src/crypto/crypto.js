const CryptoJS = require('crypto-js');
const crypto = require('crypto');

/**
 * Gestell 加密工具类
 * 为去中心化写作提供内容加密和数字签名功能
 */
class GestallCrypto {
    constructor() {
        this.AES_KEY_SIZE = 256;
        this.IV_SIZE = 16;
        this.SALT_SIZE = 32;
        this.ITERATIONS = 100000; // PBKDF2迭代次数
    }

    /**
     * 生成RSA密钥对（用于数字签名和身份验证）
     * @returns {Object} { publicKey, privateKey }
     */
    generateKeyPair() {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });

        return { publicKey, privateKey };
    }

    /**
     * 使用密码加密私钥
     * @param {string} privateKey - 私钥PEM格式
     * @param {string} password - 加密密码
     * @returns {string} 加密后的私钥
     */
    encryptPrivateKey(privateKey, password) {
        const salt = crypto.randomBytes(this.SALT_SIZE);
        const key = crypto.pbkdf2Sync(password, salt, this.ITERATIONS, 32, 'sha256');
        const iv = crypto.randomBytes(this.IV_SIZE);
        
        const cipher = crypto.createCipher('aes-256-cbc', key);
        cipher.setAutoPadding(true);
        
        let encrypted = cipher.update(privateKey, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        
        // 将salt、iv和加密数据组合
        const result = {
            salt: salt.toString('base64'),
            iv: iv.toString('base64'),
            encrypted: encrypted
        };
        
        return JSON.stringify(result);
    }

    /**
     * 使用密码解密私钥
     * @param {string} encryptedPrivateKey - 加密的私钥JSON字符串
     * @param {string} password - 解密密码
     * @returns {string} 解密后的私钥PEM格式
     */
    decryptPrivateKey(encryptedPrivateKey, password) {
        try {
            const data = JSON.parse(encryptedPrivateKey);
            const salt = Buffer.from(data.salt, 'base64');
            const iv = Buffer.from(data.iv, 'base64');
            const encrypted = data.encrypted;
            
            const key = crypto.pbkdf2Sync(password, salt, this.ITERATIONS, 32, 'sha256');
            
            const decipher = crypto.createDecipher('aes-256-cbc', key);
            let decrypted = decipher.update(encrypted, 'base64', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            throw new Error('私钥解密失败: ' + error.message);
        }
    }

    /**
     * 对内容进行数字签名
     * @param {string} content - 要签名的内容
     * @param {string} privateKey - 私钥PEM格式
     * @returns {string} Base64编码的签名
     */
    signContent(content, privateKey) {
        const sign = crypto.createSign('RSA-SHA256');
        sign.update(content, 'utf8');
        const signature = sign.sign(privateKey, 'base64');
        return signature;
    }

    /**
     * 验证数字签名
     * @param {string} content - 原始内容
     * @param {string} signature - Base64编码的签名
     * @param {string} publicKey - 公钥PEM格式
     * @returns {boolean} 签名是否有效
     */
    verifySignature(content, signature, publicKey) {
        try {
            const verify = crypto.createVerify('RSA-SHA256');
            verify.update(content, 'utf8');
            return verify.verify(publicKey, signature, 'base64');
        } catch (error) {
            return false;
        }
    }

    /**
     * AES加密内容（对称加密，用于大量内容）
     * @param {string} content - 要加密的内容
     * @param {string} password - 加密密码
     * @returns {string} 加密结果JSON字符串
     */
    encryptContent(content, password) {
        const salt = CryptoJS.lib.WordArray.random(this.SALT_SIZE / 4);
        const key = CryptoJS.PBKDF2(password, salt, {
            keySize: this.AES_KEY_SIZE / 32,
            iterations: this.ITERATIONS
        });
        
        const iv = CryptoJS.lib.WordArray.random(this.IV_SIZE / 4);
        const encrypted = CryptoJS.AES.encrypt(content, key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
        
        return JSON.stringify({
            salt: salt.toString(),
            iv: iv.toString(),
            encrypted: encrypted.toString()
        });
    }

    /**
     * AES解密内容
     * @param {string} encryptedData - 加密数据JSON字符串
     * @param {string} password - 解密密码
     * @returns {string} 解密后的内容
     */
    decryptContent(encryptedData, password) {
        try {
            const data = JSON.parse(encryptedData);
            const salt = CryptoJS.enc.Hex.parse(data.salt);
            const iv = CryptoJS.enc.Hex.parse(data.iv);
            
            const key = CryptoJS.PBKDF2(password, salt, {
                keySize: this.AES_KEY_SIZE / 32,
                iterations: this.ITERATIONS
            });
            
            const decrypted = CryptoJS.AES.decrypt(data.encrypted, key, {
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            });
            
            return decrypted.toString(CryptoJS.enc.Utf8);
        } catch (error) {
            throw new Error('内容解密失败: ' + error.message);
        }
    }

    /**
     * 计算内容哈希（用于区块链存储）
     * @param {string} content - 内容
     * @param {string} algorithm - 哈希算法 (sha256, sha3, etc.)
     * @returns {string} 十六进制哈希值
     */
    hashContent(content, algorithm = 'sha256') {
        switch (algorithm.toLowerCase()) {
            case 'sha256':
                return CryptoJS.SHA256(content).toString();
            case 'sha3':
                return CryptoJS.SHA3(content).toString();
            case 'md5':
                return CryptoJS.MD5(content).toString();
            default:
                throw new Error('不支持的哈希算法: ' + algorithm);
        }
    }

    /**
     * 生成安全随机密码
     * @param {number} length - 密码长度
     * @param {boolean} includeSymbols - 是否包含特殊字符
     * @returns {string} 随机密码
     */
    generatePassword(length = 16, includeSymbols = true) {
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        
        let charset = lowercase + uppercase + numbers;
        if (includeSymbols) {
            charset += symbols;
        }
        
        let password = '';
        for (let i = 0; i < length; i++) {
            const randomIndex = crypto.randomInt(0, charset.length);
            password += charset[randomIndex];
        }
        
        return password;
    }

    /**
     * 验证密码强度
     * @param {string} password - 密码
     * @returns {Object} 强度分析结果
     */
    analyzePasswordStrength(password) {
        const analysis = {
            score: 0,
            strength: 'weak',
            feedback: []
        };
        
        // 长度检查
        if (password.length >= 8) analysis.score += 1;
        else analysis.feedback.push('密码至少需要8个字符');
        
        if (password.length >= 12) analysis.score += 1;
        if (password.length >= 16) analysis.score += 1;
        
        // 字符类型检查
        if (/[a-z]/.test(password)) analysis.score += 1;
        else analysis.feedback.push('需要包含小写字母');
        
        if (/[A-Z]/.test(password)) analysis.score += 1;
        else analysis.feedback.push('需要包含大写字母');
        
        if (/[0-9]/.test(password)) analysis.score += 1;
        else analysis.feedback.push('需要包含数字');
        
        if (/[^a-zA-Z0-9]/.test(password)) analysis.score += 1;
        else analysis.feedback.push('建议包含特殊字符');
        
        // 确定强度等级
        if (analysis.score >= 6) analysis.strength = 'strong';
        else if (analysis.score >= 4) analysis.strength = 'medium';
        else analysis.strength = 'weak';
        
        return analysis;
    }

    /**
     * 创建内容指纹（用于版本控制和去重）
     * @param {Object} contentData - 内容数据对象
     * @returns {string} 内容指纹
     */
    createContentFingerprint(contentData) {
        // 规范化内容数据
        const normalized = JSON.stringify(contentData, Object.keys(contentData).sort());
        return this.hashContent(normalized, 'sha256');
    }
}

module.exports = GestallCrypto;