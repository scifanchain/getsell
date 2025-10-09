import * as CryptoJS from 'crypto-js';
import * as crypto from 'crypto';

/**
 * 加密结果接口
 */
interface EncryptionResult {
    salt: string;
    iv: string;
    encrypted: string;
}

/**
 * 密钥对接口
 */
interface KeyPair {
    publicKey: string;
    privateKey: string;
}

/**
 * 密码强度分析结果接口
 */
interface PasswordStrengthAnalysis {
    score: number;
    strength: 'weak' | 'medium' | 'strong';
    feedback: string[];
}

/**
 * Gestell 加密工具类
 * 为去中心化写作提供内容加密和数字签名功能
 */
export class GestallCrypto {
    private readonly AES_KEY_SIZE = 256;
    private readonly IV_SIZE = 16;
    private readonly SALT_SIZE = 32;
    private readonly ITERATIONS = 100000; // PBKDF2迭代次数

    /**
     * 生成RSA密钥对（用于数字签名和身份验证）
     * @returns 密钥对对象
     */
    generateKeyPair(): KeyPair {
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
     * @param privateKey - 私钥PEM格式
     * @param password - 加密密码
     * @returns 加密后的私钥JSON字符串
     */
    encryptPrivateKey(privateKey: string, password: string): string {
        const salt = crypto.randomBytes(this.SALT_SIZE);
        const key = crypto.pbkdf2Sync(password, salt, this.ITERATIONS, 32, 'sha256');
        const iv = crypto.randomBytes(this.IV_SIZE);
        
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        cipher.setAutoPadding(true);
        
        let encrypted = cipher.update(privateKey, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        
        // 将salt、iv和加密数据组合
        const result: EncryptionResult = {
            salt: salt.toString('base64'),
            iv: iv.toString('base64'),
            encrypted: encrypted
        };
        
        return JSON.stringify(result);
    }

    /**
     * 使用密码解密私钥
     * @param encryptedPrivateKey - 加密的私钥JSON字符串
     * @param password - 解密密码
     * @returns 解密后的私钥PEM格式
     */
    decryptPrivateKey(encryptedPrivateKey: string, password: string): string {
        try {
            const data: EncryptionResult = JSON.parse(encryptedPrivateKey);
            const salt = Buffer.from(data.salt, 'base64');
            const iv = Buffer.from(data.iv, 'base64');
            const encrypted = data.encrypted;
            
            const key = crypto.pbkdf2Sync(password, salt, this.ITERATIONS, 32, 'sha256');
            
            const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
            let decrypted = decipher.update(encrypted, 'base64', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            throw new Error('私钥解密失败: ' + (error as Error).message);
        }
    }

    /**
     * 对内容进行数字签名
     * @param content - 要签名的内容
     * @param privateKey - 私钥PEM格式
     * @returns Base64编码的签名
     */
    signContent(content: string, privateKey: string): string {
        const sign = crypto.createSign('RSA-SHA256');
        sign.update(content, 'utf8');
        const signature = sign.sign(privateKey, 'base64');
        return signature;
    }

    /**
     * 验证数字签名
     * @param content - 原始内容
     * @param signature - Base64编码的签名
     * @param publicKey - 公钥PEM格式
     * @returns 签名是否有效
     */
    verifySignature(content: string, signature: string, publicKey: string): boolean {
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
     * @param content - 要加密的内容
     * @param password - 加密密码
     * @returns 加密结果JSON字符串
     */
    encryptContent(content: string, password: string): string {
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
     * @param encryptedData - 加密数据JSON字符串
     * @param password - 解密密码
     * @returns 解密后的内容
     */
    decryptContent(encryptedData: string, password: string): string {
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
            throw new Error('内容解密失败: ' + (error as Error).message);
        }
    }

    /**
     * 计算内容哈希（用于区块链存储）
     * @param content - 内容
     * @param algorithm - 哈希算法 (sha256, sha3, etc.)
     * @returns 十六进制哈希值
     */
    hashContent(content: string, algorithm: string = 'sha256'): string {
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
     * @param length - 密码长度
     * @param includeSymbols - 是否包含特殊字符
     * @returns 随机密码
     */
    generatePassword(length: number = 16, includeSymbols: boolean = true): string {
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
     * @param password - 密码
     * @returns 强度分析结果
     */
    analyzePasswordStrength(password: string): PasswordStrengthAnalysis {
        const analysis: PasswordStrengthAnalysis = {
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
     * @param contentData - 内容数据对象
     * @returns 内容指纹
     */
    createContentFingerprint(contentData: Record<string, any>): string {
        // 规范化内容数据
        const normalized = JSON.stringify(contentData, Object.keys(contentData).sort());
        return this.hashContent(normalized, 'sha256');
    }
}

export default GestallCrypto;