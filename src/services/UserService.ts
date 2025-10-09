import { IUserService, LoginCredentials, LoginResult, RegisterUserData, UserInfo, UpdateUserData, UserStats } from './interfaces';
import { getCurrentTimestamp } from '../utils/timestamp';
import { RepositoryContainer } from '../data/RepositoryContainer';
import { GestallCrypto } from '../crypto/crypto';
import { ulid } from 'ulid';

/**
 * 用户服务实现
 * 处理用户相关的业务逻辑
 */
export class UserService implements IUserService {
    constructor(
        private repositories: RepositoryContainer,
        private cryptoService: GestallCrypto
    ) {}

    /**
     * 用户登录
     */
    async login(credentials: LoginCredentials): Promise<LoginResult> {
        try {
            // 根据用户名查找用户
            const user = await this.repositories.userRepository.findByUsername(credentials.username);
            
            if (!user) {
                return {
                    success: false,
                    message: '用户名不存在',
                    user: null as any
                };
            }

            // 对于本地应用，我们简化认证流程
            // 在生产环境中，这里应该验证密码哈希
            
            // 更新最后活跃时间
            await this.repositories.userRepository.update(user.id, {
                lastActiveAt: getCurrentTimestamp()
            } as any);

            const userInfo = this.mapToUserInfo(user);

            return {
                success: true,
                message: '登录成功',
                user: userInfo,
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
    async register(userData: RegisterUserData): Promise<UserInfo> {
        // 参数验证
        if (!userData.username || userData.username.trim() === '') {
            throw new Error('用户名不能为空');
        }
        if (!userData.email || userData.email.trim() === '') {
            throw new Error('邮箱不能为空');
        }

        // 检查用户名是否已存在
        const existingUser = await this.repositories.userRepository.findByUsername(userData.username);
        if (existingUser) {
            throw new Error('用户名已存在');
        }

        // 检查邮箱是否已存在
        if (userData.email) {
            const existingEmail = await this.repositories.userRepository.findByEmail(userData.email);
            if (existingEmail) {
                throw new Error('邮箱已被使用');
            }
        }

        // 生成密钥对
        const keyPair = this.cryptoService.generateKeyPair();
        
        // 使用密码加密私钥（如果提供了密码）
        const privateKeyEncrypted = userData.password ? 
            this.cryptoService.encryptPrivateKey(keyPair.privateKey, userData.password) :
            keyPair.privateKey;

        // 创建用户数据
        const userCreateData = {
            id: ulid(),
            username: userData.username,
            displayName: userData.displayName || userData.username,
            email: userData.email,
            bio: userData.bio,
            publicKey: keyPair.publicKey,
            privateKeyEncrypted: privateKeyEncrypted
        };

        const createdUser = await this.repositories.userRepository.create(userCreateData);
        return this.mapToUserInfo(createdUser);
    }

    /**
     * 获取当前用户信息
     */
    async getCurrentUser(userId: string): Promise<UserInfo | null> {
        const user = await this.repositories.userRepository.findById(userId);
        return user ? this.mapToUserInfo(user) : null;
    }

    /**
     * 更新用户资料
     */
    async updateProfile(userId: string, updateData: UpdateUserData): Promise<UserInfo> {
        // 如果更新邮箱，检查是否已被使用
        if (updateData.email) {
            const existingEmail = await this.repositories.userRepository.findByEmail(updateData.email);
            if (existingEmail && existingEmail.id !== userId) {
                throw new Error('邮箱已被其他用户使用');
            }
        }

        const updatedUser = await this.repositories.userRepository.update(userId, updateData as any);
        return this.mapToUserInfo(updatedUser);
    }

    /**
     * 初始化默认用户
     */
    async initializeDefaultUser(): Promise<UserInfo> {
        // 确保默认用户存在
        await this.repositories.userRepository.ensureDefaultUser();
        
        // 获取默认用户
        const defaultUser = await this.repositories.userRepository.findByUsername('默认用户');
        if (!defaultUser) {
            throw new Error('无法创建默认用户');
        }

        return this.mapToUserInfo(defaultUser);
    }

    /**
     * 根据邮箱查找用户
     */
    async findByEmail(email: string): Promise<UserInfo | null> {
        const user = await this.repositories.userRepository.findByEmail(email);
        return user ? this.mapToUserInfo(user) : null;
    }

    /**
     * 获取用户统计信息
     */
    async getUserStats(userId: string): Promise<UserStats> {
        const stats = await this.repositories.statsRepository.getUserStats(userId);
        
        // 计算平均每日字数（假设最近30天）
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const activityStats = await this.repositories.statsRepository.getActivityStats(
            userId, 
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
    private mapToUserInfo(user: any): UserInfo {
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
