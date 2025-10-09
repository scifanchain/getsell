/**
 * 内容服务接口
 * 定义内容相关的业务逻辑操作
 */
export interface IContentService {
    /**
     * 创建新内容
     * @param workId 作品ID
     * @param authorId 作者ID
     * @param contentData 内容数据
     * @returns 创建的内容信息
     */
    createContent(workId: string, authorId: string, contentData: CreateContentData): Promise<ContentInfo>;

    /**
     * 获取内容详情
     * @param contentId 内容ID
     * @param userId 当前用户ID
     * @returns 内容详细信息
     */
    getContent(contentId: string, userId: string): Promise<ContentInfo | null>;

    /**
     * 获取章节的内容列表
     * @param chapterId 章节ID
     * @param options 查询选项
     * @returns 内容列表
     */
    getChapterContents(chapterId: string, options?: ContentQueryOptions): Promise<ContentInfo[]>;

    /**
     * 获取作品的内容列表
     * @param workId 作品ID
     * @param options 查询选项
     * @returns 内容列表
     */
    getWorkContents(workId: string, options?: ContentQueryOptions): Promise<ContentInfo[]>;

    /**
     * 更新内容
     * @param contentId 内容ID
     * @param userId 用户ID
     * @param updateData 更新数据
     * @returns 更新后的内容信息
     */
    updateContent(contentId: string, userId: string, updateData: UpdateContentData): Promise<ContentInfo>;

    /**
     * 删除内容
     * @param contentId 内容ID
     * @param userId 用户ID
     */
    deleteContent(contentId: string, userId: string): Promise<void>;

    /**
     * 保存内容（自动版本管理）
     * @param contentId 内容ID
     * @param userId 用户ID
     * @param contentData 内容数据
     * @param comment 保存说明
     * @returns 保存结果
     */
    saveContent(contentId: string, userId: string, contentData: SaveContentData, comment?: string): Promise<SaveResult>;

    /**
     * 搜索内容
     * @param workId 作品ID
     * @param query 搜索关键词
     * @param options 搜索选项
     * @returns 匹配的内容列表
     */
    searchContent(workId: string, query: string, options?: SearchOptions): Promise<ContentSearchResult[]>;

    /**
     * 获取内容版本历史
     * @param contentId 内容ID
     * @returns 版本历史列表
     */
    getContentHistory(contentId: string): Promise<ContentVersion[]>;

    /**
     * 恢复到指定版本
     * @param contentId 内容ID
     * @param versionId 版本ID
     * @param userId 用户ID
     * @returns 恢复后的内容信息
     */
    restoreVersion(contentId: string, versionId: string, userId: string): Promise<ContentInfo>;

    /**
     * 导出内容
     * @param contentIds 内容ID列表
     * @param format 导出格式
     * @returns 导出结果
     */
    exportContent(contentIds: string[], format: ExportFormat): Promise<ExportResult>;
}

/**
 * 创建内容数据
 */
export interface CreateContentData {
    title?: string;
    type?: 'text' | 'image' | 'table' | 'code';
    chapterId?: string;
    orderIndex?: number;
    contentJson?: string; // ProseMirror JSON
    contentHtml?: string; // HTML 格式
}

/**
 * 内容信息
 */
export interface ContentInfo {
    id: string;
    title?: string;
    type: string;
    orderIndex: number;
    contentJson?: string;
    contentHtml?: string;
    contentText?: string; // 纯文本提取
    wordCount: number;
    characterCount: number;
    author: {
        id: string;
        username: string;
        displayName: string;
    };
    work: {
        id: string;
        title: string;
    };
    chapter?: {
        id: string;
        title: string;
    };
    status: 'draft' | 'completed' | 'reviewing';
    tags?: string[];
    notes?: string;
    lastEditor: {
        id: string;
        username: string;
        displayName: string;
    };
    createdAt: Date;
    updatedAt: Date;
    lastEditedAt: Date;
    versionCount: number;
}

/**
 * 更新内容数据
 */
export interface UpdateContentData {
    title?: string;
    type?: 'text' | 'image' | 'table' | 'code';
    contentJson?: string;
    contentHtml?: string;
    status?: 'draft' | 'completed' | 'reviewing';
    tags?: string[];
    notes?: string;
}

/**
 * 保存内容数据
 */
export interface SaveContentData {
    contentJson?: string;
    contentHtml?: string;
    autoSave?: boolean;
}

/**
 * 内容查询选项
 */
export interface ContentQueryOptions {
    type?: 'text' | 'image' | 'table' | 'code';
    status?: 'draft' | 'completed' | 'reviewing';
    chapterId?: string;
    sortBy?: 'orderIndex' | 'updatedAt' | 'wordCount';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}

/**
 * 搜索选项
 */
export interface SearchOptions {
    chapterId?: string;
    type?: 'text' | 'image' | 'table' | 'code';
    includeTitle?: boolean;
    includeContent?: boolean;
    caseSensitive?: boolean;
}

/**
 * 内容搜索结果
 */
export interface ContentSearchResult {
    content: ContentInfo;
    matches: {
        field: 'title' | 'content';
        text: string;
        startIndex: number;
        endIndex: number;
    }[];
    relevance: number;
}

/**
 * 内容版本
 */
export interface ContentVersion {
    id: string;
    versionNumber: number;
    contentJson: string;
    contentHtml?: string;
    wordCount: number;
    characterCount: number;
    changeSummary?: string;
    author: {
        id: string;
        username: string;
        displayName: string;
    };
    createdAt: Date;
}

/**
 * 保存结果
 */
export interface SaveResult {
    success: boolean;
    message: string;
    content: ContentInfo;
    versionCreated: boolean;
    versionId?: string;
}

/**
 * 导出格式
 */
export type ExportFormat = 'html' | 'markdown' | 'docx' | 'pdf' | 'txt';

/**
 * 导出结果
 */
export interface ExportResult {
    success: boolean;
    message: string;
    filePath?: string;
    fileSize?: number;
    format: ExportFormat;
}