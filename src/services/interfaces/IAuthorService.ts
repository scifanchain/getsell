/**
 * 作者服务接口
 * 定义作者相关的业务逻辑操作
 */
export interface IAuthorService {
    /**
     * 作者登录
     * @param credentials 登录凭据
     * @returns 作者信息和认证令牌
     */
    login(credentials: LoginCredentials): Promise<LoginResult>;

    /**
     * 作者注册
     * @param authorData 注册数据
     * @returns 创建的作者信息
     */
    register(authorData: RegisterAuthorData): Promise<AuthorInfo>;

    /**
     * 获取当前作者信息
     * @param authorId 作者ID
     * @returns 作者详细信息
     */
    getCurrentUser(authorId: string): Promise<AuthorInfo | null>;

    /**
     * 根据邮箱查找作者
     * @param email 邮箱地址
     * @returns 作者信息或null
     */
    findByEmail(email: string): Promise<AuthorInfo | null>;

    /**
     * 更新作者资料
     * @param authorId 作者ID
     * @param updateData 更新数据
     * @returns 更新后的作者信息
     */
    updateProfile(authorId: string, updateData: UpdateAuthorData): Promise<AuthorInfo>;

    /**
     * 更改密码
     * @param authorId 作者ID
     * @param currentPassword 当前密码
     * @param newPassword 新密码
     */
    changePassword(authorId: string, currentPassword: string, newPassword: string): Promise<void>;

    /**
     * 获取作者统计信息
     * @param authorId 作者ID
     * @returns 统计数据
     */
    getUserStats(authorId: string): Promise<AuthorStats>;
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
    user: AuthorInfo;
    token?: string;
    success: boolean;
    message?: string;
}

/**
 * 注册作者数据
 */
export interface RegisterAuthorData {
    username: string;
    email: string;
    displayName?: string;
    bio?: string;
    password?: string;
}

/**
 * 作者信息
 */
export interface AuthorInfo {
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
 * 更新作者数据
 */
export interface UpdateAuthorData {
    displayName?: string;
    email?: string;
    bio?: string;
    avatarUrl?: string;
}

/**
 * 作者统计
 */
export interface AuthorStats {
    totalWorks: number;
    totalChapters: number;
    totalWords: number;
    totalCharacters: number;
    activeDays: number;
    avgWordsPerDay: number;
}