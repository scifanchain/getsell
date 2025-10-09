/**
 * 基础数据类型定义
 * 从现有的 prismadb.ts 中提取
 */

/**
 * 用户数据接口
 */
export interface UserData {
    id: string;
    username: string;
    displayName?: string;
    email: string;
    bio?: string;
    publicKey: string;
    privateKeyEncrypted: string;
}

/**
 * 作品数据接口
 */
export interface WorkData {
    title: string;
    description?: string;
    genre?: string;
    authorId?: string;
    collaborationMode?: string;
}

/**
 * 章节数据接口
 */
export interface ChapterData {
    workId: string;
    parentId?: string;
    orderIndex?: number;
    title: string;
    subtitle?: string;
    description?: string;
    type?: string;
    authorId?: string;
}

/**
 * 内容数据接口
 */
export interface ContentData {
    workId: string;
    chapterId?: string;
    orderIndex?: number;
    title?: string;
    type?: string;
    contentJson?: string;
    contentHtml?: string;
    authorId?: string;
}

/**
 * 统计信息接口
 */
export interface Stats {
    authors: number;
    works: number;
    chapters: number;
    contents: number;
    characters: number;
    worldbuilding: number;
    chapter_levels: Record<string, number>;
    content_stats: {
        total_words: number;
        total_characters: number;
        total_contents: number;
    };
}

/**
 * 通用的分页参数
 */
export interface PaginationOptions {
    skip?: number;
    take?: number;
}

/**
 * 通用的排序参数
 */
export interface SortOptions {
    field: string;
    direction: 'asc' | 'desc';
}