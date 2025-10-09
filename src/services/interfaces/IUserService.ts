/**
 * 用户服务接口
 * 定义用户相关的业务逻辑操作
 */
export interface IUserService {
    /**
     * 用户登录
     * @param credentials 登录凭据
     * @returns 用户信息和认证令牌
     */
    login(credentials: LoginCredentials): Promise<LoginResult>;

    /**
     * 用户注册
     * @param userData 注册数据
     * @returns 创建的用户信息
     */
    register(userData: RegisterUserData): Promise<UserInfo>;

    /**
     * 获取当前用户信息
     * @param userId 用户ID
     * @returns 用户详细信息
     */
    getCurrentUser(userId: string): Promise<UserInfo | null>;

    /**
     * 根据邮箱查找用户
     * @param email 邮箱地址
     * @returns 用户信息或null
     */
    findByEmail(email: string): Promise<UserInfo | null>;

    /**
     * 更新用户资料
     * @param userId 用户ID
     * @param updateData 更新数据
     * @returns 更新后的用户信息
     */
    updateProfile(userId: string, updateData: UpdateUserData): Promise<UserInfo>;

    /**
     * 初始化默认用户（首次启动）
     * @returns 默认用户信息
     */
    initializeDefaultUser(): Promise<UserInfo>;

    /**
     * 获取用户统计信息
     * @param userId 用户ID
     * @returns 统计数据
     */
    getUserStats(userId: string): Promise<UserStats>;
}

/**
 * 登录凭据
 */
export interface LoginCredentials {
    username: string;
    password?: string;
    rememberMe?: boolean;
}

/**
 * 登录结果
 */
export interface LoginResult {
    user: UserInfo;
    token?: string;
    success: boolean;
    message?: string;
}

/**
 * 注册用户数据
 */
export interface RegisterUserData {
    username: string;
    email: string;
    displayName?: string;
    bio?: string;
    password?: string;
}

/**
 * 用户信息
 */
export interface UserInfo {
    id: string;
    username: string;
    displayName: string;
    email: string;
    bio?: string;
    avatarUrl?: string;
    createdAt: Date;
    lastActiveAt?: Date;
}

/**
 * 更新用户数据
 */
export interface UpdateUserData {
    displayName?: string;
    email?: string;
    bio?: string;
    avatarUrl?: string;
}

/**
 * 用户统计
 */
export interface UserStats {
    totalWorks: number;
    totalChapters: number;
    totalWords: number;
    totalCharacters: number;
    activeDays: number;
    avgWordsPerDay: number;
}