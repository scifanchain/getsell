/**
 * 章节服务接口
 * 定义章节相关的业务逻辑操作
 */
export interface IChapterService {
    /**
     * 创建新章节
     * @param workId 作品ID
     * @param authorId 作者ID
     * @param chapterData 章节数据
     * @returns 创建的章节信息
     */
    createChapter(workId: string, authorId: string, chapterData: CreateChapterData): Promise<ChapterInfo>;

    /**
     * 获取章节详情
     * @param chapterId 章节ID
     * @param userId 当前用户ID
     * @returns 章节详细信息
     */
    getChapter(chapterId: string, userId: string): Promise<ChapterInfo | null>;

    /**
     * 获取作品的章节列表
     * @param workId 作品ID
     * @param options 查询选项
     * @returns 章节列表（层级结构）
     */
    getWorkChapters(workId: string, options?: ChapterQueryOptions): Promise<ChapterInfo[]>;

    /**
     * 更新章节信息
     * @param chapterId 章节ID
     * @param userId 用户ID
     * @param updateData 更新数据
     * @returns 更新后的章节信息
     */
    updateChapter(chapterId: string, userId: string, updateData: UpdateChapterData): Promise<ChapterInfo>;

    /**
     * 删除章节
     * @param chapterId 章节ID
     * @param userId 用户ID
     */
    deleteChapter(chapterId: string, userId: string): Promise<void>;

    /**
     * 移动章节
     * @param chapterId 章节ID
     * @param newParentId 新父章节ID（null表示移到根级别）
     * @param newIndex 新的排序位置
     * @param userId 用户ID
     * @returns 移动后的章节信息
     */
    moveChapter(chapterId: string, newParentId: string | null, newIndex: number, userId: string): Promise<ChapterInfo>;

    /**
     * 重新排序章节
     * @param workId 作品ID
     * @param chapterOrders 章节排序数据
     * @param userId 用户ID
     */
    reorderChapters(workId: string, chapterOrders: ChapterOrder[], userId: string): Promise<void>;

    /**
     * 获取章节路径
     * @param chapterId 章节ID
     * @returns 从根到当前章节的路径
     */
    getChapterPath(chapterId: string): Promise<ChapterBreadcrumb[]>;

    /**
     * 复制章节
     * @param chapterId 源章节ID
     * @param targetWorkId 目标作品ID
     * @param userId 用户ID
     * @returns 复制的章节信息
     */
    duplicateChapter(chapterId: string, targetWorkId: string, userId: string): Promise<ChapterInfo>;
}

/**
 * 创建章节数据
 */
export interface CreateChapterData {
    title: string;
    subtitle?: string;
    description?: string;
    type?: 'chapter' | 'section' | 'scene';
    parentId?: string;
    orderIndex?: number;
}

/**
 * 章节信息
 */
export interface ChapterInfo {
    id: string;
    title: string;
    subtitle?: string;
    description?: string;
    type: string;
    orderIndex: number;
    level: number;
    author: {
        id: string;
        username: string;
        displayName: string;
    };
    work: {
        id: string;
        title: string;
    };
    parent?: {
        id: string;
        title: string;
    };
    children: ChapterInfo[];
    contentCount: number;
    wordCount: number;
    status: 'draft' | 'completed' | 'reviewing';
    createdAt: Date;
    updatedAt: Date;
}

/**
 * 更新章节数据
 */
export interface UpdateChapterData {
    title?: string;
    subtitle?: string;
    description?: string;
    type?: 'chapter' | 'section' | 'scene';
    status?: 'draft' | 'completed' | 'reviewing';
}

/**
 * 章节查询选项
 */
export interface ChapterQueryOptions {
    includeChildren?: boolean;
    includeContent?: boolean;
    status?: 'draft' | 'completed' | 'reviewing';
    type?: 'chapter' | 'section' | 'scene';
}

/**
 * 章节排序数据
 */
export interface ChapterOrder {
    id: string;
    orderIndex: number;
    parentId?: string | null;
}

/**
 * 章节面包屑
 */
export interface ChapterBreadcrumb {
    id: string;
    title: string;
    level: number;
}