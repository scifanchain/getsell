/**
 * 作品服务接口
 * 定义作品相关的业务逻辑操作
 */
export interface IWorkService {
    /**
     * 创建新作品
     * @param authorId 作者ID
     * @param workData 作品数据
     * @returns 创建的作品信息
     */
    createWork(authorId: string, workData: CreateWorkData): Promise<WorkInfo>;

    /**
     * 获取作品详情
     * @param workId 作品ID
     * @param userId 当前用户ID
     * @returns 作品详细信息
     */
    getWork(workId: string, userId: string): Promise<WorkInfo | null>;

    /**
     * 获取用户的作品列表
     * @param userId 用户ID
     * @param options 查询选项
     * @returns 作品列表
     */
    getUserWorks(userId: string, options?: WorkQueryOptions): Promise<WorkInfo[]>;

    /**
     * 获取所有作品列表
     * @param options 查询选项
     * @returns 作品列表
     */
    getAllWorks(options?: WorkQueryOptions): Promise<WorkInfo[]>;

    /**
     * 更新作品信息
     * @param workId 作品ID
     * @param userId 用户ID
     * @param updateData 更新数据
     * @returns 更新后的作品信息
     */
    updateWork(workId: string, userId: string, updateData: UpdateWorkData): Promise<WorkInfo>;

    /**
     * 删除作品
     * @param workId 作品ID
     * @param userId 用户ID
     */
    deleteWork(workId: string, userId: string): Promise<void>;

    /**
     * 搜索作品
     * @param query 搜索关键词
     * @param userId 用户ID（可选，限制搜索范围）
     * @returns 匹配的作品列表
     */
    searchWorks(query: string, userId?: string): Promise<WorkInfo[]>;

    /**
     * 获取作品统计信息
     * @param workId 作品ID
     * @returns 统计数据
     */
    getWorkStats(workId: string): Promise<WorkStats>;

    /**
     * 发布作品
     * @param workId 作品ID
     * @param userId 用户ID
     * @returns 发布结果
     */
    publishWork(workId: string, userId: string): Promise<PublishResult>;
}

/**
 * 创建作品数据
 */
export interface CreateWorkData {
    title: string;
    description?: string;
    genre?: string;
    tags?: string[];
    targetWords?: number;
    collaborationMode?: 'private' | 'team' | 'public';
}

/**
 * 作品信息
 */
export interface WorkInfo {
    id: string;
    title: string;
    subtitle?: string;
    description?: string;
    genre?: string;
    tags?: string[];
    authorId: string; // 作者ID（用于权限检查）
    author: {
        id: string;
        username: string;
        displayName: string;
    };
    collaborators?: string; // 协作者ID列表（逗号分隔）
    status: 'draft' | 'published' | 'archived';
    collaborationMode: string;
    progressPercentage: number;
    totalWords: number;
    totalCharacters: number;
    chapterCount: number;
    targetWords?: number;
    isPublic: boolean;
    createdAt: Date;
    updatedAt: Date;
    publishedAt?: Date;
}

/**
 * 更新作品数据
 */
export interface UpdateWorkData {
    title?: string;
    subtitle?: string;
    description?: string;
    genre?: string;
    tags?: string[];
    targetWords?: number;
    status?: 'draft' | 'published' | 'archived';
}

/**
 * 作品查询选项
 */
export interface WorkQueryOptions {
    status?: 'draft' | 'published' | 'archived';
    genre?: string;
    sortBy?: 'title' | 'updatedAt' | 'createdAt' | 'totalWords';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}

/**
 * 作品统计
 */
export interface WorkStats {
    chapterCount: number;
    contentCount: number;
    totalWords: number;
    totalCharacters: number;
    avgWordsPerChapter: number;
    lastUpdated: Date;
    writingDays: number;
    completionPercentage: number;
}

/**
 * 发布结果
 */
export interface PublishResult {
    success: boolean;
    message: string;
    publishedAt?: Date;
    publishUrl?: string;
}