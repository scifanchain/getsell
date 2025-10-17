import { IAuthorService, LoginCredentials, LoginResult, RegisterAuthorData, AuthorInfo, UpdateAuthorData, AuthorStats } from './interfaces';
import { getCurrentTimestamp } from '../core/timestamp';
import { RepositoryContainer } from '../repositories/RepositoryContainer';
import { GestallCrypto } from '../crypto/crypto';
import { ulid } from 'ulid';
import * as crypto from 'crypto';

/**
 * 密码工具函数
 */
class PasswordUtils {
    /**
     * 哈希密码
     */
    static hashPassword(password: string): string {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
        return `${salt}:${hash}`;
    }

    /**
     * 验证密码
     */
    static verifyPassword(password: string, storedHash: string): boolean {
        if (!storedHash) return false;
        const [salt, hash] = storedHash.split(':');
        if (!salt || !hash) return false;
        const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
        return hash === verifyHash;
    }
}

/**
 * 作者服务实现
 * 处理作者相关的业务逻辑
 */
export class AuthorService implements IAuthorService {
    constructor(
        private repositories: RepositoryContainer,
        private cryptoService: GestallCrypto
    ) {}

    /**
     * 作者登录
     */
    async login(credentials: LoginCredentials): Promise<LoginResult> {
        try {
            // 根据用户名查找作者
            const user = await this.repositories.authorRepository.findByUsername(credentials.username);
            
            if (!user) {
                return {
                    success: false,
                    message: '用户名不存在',
                    user: null as any
                };
            }

            // 验证密码（如果设置了密码）
            if (credentials.password && user.passwordHash) {
                const isPasswordValid = PasswordUtils.verifyPassword(
                    credentials.password,
                    user.passwordHash
                );
                
                if (!isPasswordValid) {
                    return {
                        success: false,
                        message: '密码错误',
                        user: null as any
                    };
                }
            }
            
            // 更新最后活跃时间
            await this.repositories.authorRepository.update(user.id, {
                lastActiveAt: getCurrentTimestamp()
            } as any);

            const AuthorInfo = this.mapToAuthorInfo(user);

            return {
                success: true,
                message: '登录成功',
                user: AuthorInfo,
                token: this.generateToken(user.id)
            };
        } catch (error) {
            console.error('登录失败:', error);
            return {
                success: false,
                message: '登录过程中发生错误',
                user: null as any
            };
        }
    }

    /**
     * 用户注册
     */
    async register(userData: RegisterAuthorData): Promise<AuthorInfo> {
        // 参数验证
        if (!userData.username || userData.username.trim() === '') {
            throw new Error('用户名不能为空');
        }
        if (!userData.email || userData.email.trim() === '') {
            throw new Error('邮箱不能为空');
        }

        // 检查用户名是否已存在
        const existingUser = await this.repositories.authorRepository.findByUsername(userData.username);
        if (existingUser) {
            throw new Error('用户名已存在');
        }

        // 检查邮箱是否已存在
        if (userData.email) {
            const existingEmail = await this.repositories.authorRepository.findByEmail(userData.email);
            if (existingEmail) {
                throw new Error('邮箱已被使用');
            }
        }

        // 生成密钥对
        const keyPair = this.cryptoService.generateKeyPair();
        
        // 处理密码
        let passwordHash: string | undefined;
        if (userData.password && userData.password.trim() !== '') {
            passwordHash = PasswordUtils.hashPassword(userData.password);
        }
        
        // 使用密码加密私钥（如果提供了密码）
        const privateKeyEncrypted = userData.password ? 
            this.cryptoService.encryptPrivateKey(keyPair.privateKey, userData.password) :
            keyPair.privateKey;

        // 创建用户数据
        const userCreateData = {
            username: userData.username,
            passwordHash: passwordHash,
            displayName: userData.displayName || userData.username,
            email: userData.email,
            bio: userData.bio,
            publicKey: keyPair.publicKey,
            privateKeyEncrypted: privateKeyEncrypted
        };

        const createdUser = await this.repositories.authorRepository.create(userCreateData);
        return this.mapToAuthorInfo(createdUser);
    }

    /**
     * 获取当前用户信息
     */
    async getCurrentUser(userId: string): Promise<AuthorInfo | null> {
        const user = await this.repositories.authorRepository.findById(userId);
        return user ? this.mapToAuthorInfo(user) : null;
    }

    /**
     * 更新用户资料
     */
    async updateProfile(userId: string, updateData: UpdateAuthorData): Promise<AuthorInfo> {
        // 如果更新邮箱，检查是否已被使用
        if (updateData.email) {
            const existingEmail = await this.repositories.authorRepository.findByEmail(updateData.email);
            if (existingEmail && existingEmail.id !== userId) {
                throw new Error('邮箱已被其他用户使用');
            }
        }

        const updatedUser = await this.repositories.authorRepository.update(userId, updateData as any);
        return this.mapToAuthorInfo(updatedUser);
    }

    /**
     * 更改密码
     */
    async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
        // 获取用户
        const user = await this.repositories.authorRepository.findById(userId);
        if (!user) {
            throw new Error('用户不存在');
        }

        // 如果用户已经有密码，验证当前密码
        if (user.passwordHash) {
            const isValid = PasswordUtils.verifyPassword(currentPassword, user.passwordHash);
            if (!isValid) {
                throw new Error('当前密码不正确');
            }
        }

        // 验证新密码
        if (!newPassword || newPassword.trim() === '') {
            throw new Error('新密码不能为空');
        }
        if (newPassword.length < 6) {
            throw new Error('新密码至少需要6个字符');
        }

        // 哈希新密码
        const newPasswordHash = PasswordUtils.hashPassword(newPassword);

        // 更新密码
        await this.repositories.authorRepository.update(userId, {
            passwordHash: newPasswordHash
        } as any);
    }

    /**
     * 根据邮箱查找用户
     */
    async findByEmail(email: string): Promise<AuthorInfo | null> {
        const user = await this.repositories.authorRepository.findByEmail(email);
        return user ? this.mapToAuthorInfo(user) : null;
    }

    /**
     * 获取用户统计信息
     */
    async getUserStats(authorId: string): Promise<AuthorStats> {
        const stats = await this.repositories.statsRepository.getAuthorStats(authorId);
        
        // 计算平均每日字数（假设最近30天）
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const activityStats = await this.repositories.statsRepository.getActivityStats(
            authorId, 
            thirtyDaysAgo, 
            new Date()
        );

        return {
            totalWorks: stats.totalWorks,
            totalChapters: stats.totalChapters,
            totalWords: stats.totalWords,
            totalCharacters: stats.totalCharacters,
            activeDays: activityStats.activeDays,
            avgWordsPerDay: activityStats.activeDays > 0 ? 
                Math.round(activityStats.totalWords / activityStats.activeDays) : 0
        };
    }

    /**
     * 将数据库用户对象映射为用户信息对象
     */
    private mapToAuthorInfo(user: any): AuthorInfo {
        return {
            id: user.id,
            username: user.username,
            displayName: user.displayName || user.username,
            email: user.email || '',
            bio: user.bio || '',
            avatarUrl: user.avatarUrl,
            createdAt: new Date(Number(user.createdAt)),
            lastActiveAt: user.lastActiveAt ? new Date(Number(user.lastActiveAt)) : undefined
        };
    }

    /**
     * 生成简单的访问令牌
     */
    private generateToken(userId: string): string {
        // 在生产环境中，应该使用JWT或其他安全的令牌方案
        return Buffer.from(`${userId}:${Date.now()}`).toString('base64');
    }
}
