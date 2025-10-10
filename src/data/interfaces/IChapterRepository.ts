import { ChapterData, PaginationOptions } from './types';

/**
 * 章节仓储接口
 * 定义所有章节相关的数据访问操作
 */
export interface IChapterRepository {
    /**
     * 创建新章节
     * @param chapterData 章节数据
     * @returns 创建的章节信息（包含关联数据）
     */
    create(chapterData: ChapterData): Promise<any>;

    /**
     * 根据ID查找章节
     * @param id 章节ID
     * @returns 章节详细信息
     */
    findById(id: string): Promise<any | null>;

    /**
     * 获取作品的章节列表
     * @param workId 作品ID
     * @param includeChildren 是否包含子章节
     * @returns 章节列表（按层级和顺序排序）
     */
    findByWork(workId: string, includeChildren?: boolean): Promise<any[]>;

    /**
     * 获取父章节的子章节列表
     * @param parentId 父章节ID
     * @returns 子章节列表
     */
    findChildren(parentId: string): Promise<any[]>;

    /**
     * 更新章节信息
     * @param id 章节ID
     * @param updateData 更新数据
     * @returns 更新后的章节信息
     */
    update(id: string, updateData: Partial<ChapterData>): Promise<any>;

    /**
     * 删除章节（级联删除相关数据）
     * @param id 章节ID
     */
    delete(id: string): Promise<void>;

    /**
     * 重新排序章节
     * @param workId 作品ID
     * @param chapterOrders 章节ID和新顺序的映射
     */
    reorder(workId: string, chapterOrders: Array<{ id: string; orderIndex: number }>): Promise<void>;

    /**
     * 批量更新章节顺序（包括层级和父节点）
     * @param chapters 章节更新数据数组
     */
    batchReorder(chapters: Array<{ id: string; parentId?: string; orderIndex: number; level: number }>): Promise<void>;

    /**
     * 移动章节到新的父章节下
     * @param chapterId 章节ID
     * @param newParentId 新父章节ID（null表示移到根级别）
     * @param newOrderIndex 新的排序索引
     */
    move(chapterId: string, newParentId: string | null, newOrderIndex: number): Promise<any>;

    /**
     * 获取章节的层级路径
     * @param chapterId 章节ID
     * @returns 从根到当前章节的路径
     */
    getPath(chapterId: string): Promise<any[]>;
}