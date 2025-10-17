import type { Work, NewWork, UpdateWork } from '../../db/schema';
import type { WorkData, QueryOptions } from '../../shared/types';

/**
 * 作品仓储接口
 * 定义所有作品相关的数据访问操作
 */
export interface IWorkRepository {
    /**
     * 创建新作品
     * @param workData 作品数据
     * @returns 创建的作品信息
     */
    create(workData: Omit<NewWork, 'id' | 'createdAt' | 'updatedAt'>): Promise<Work>;

    /**
     * 根据ID查找作品
     * @param id 作品ID
     * @returns 作品详细信息
     */
    findById(id: string): Promise<Work | null>;

    /**
     * 获取作者的作品列表
     * @param authorId 作者ID
     * @param options 查询选项（分页、排序）
     * @returns 作品列表
     */
    findByAuthor(authorId: string, options?: QueryOptions): Promise<Work[]>;

    /**
     * 获取所有作品列表
     * @param options 查询选项（分页、排序）
     * @returns 作品列表
     */
    findAll(options?: QueryOptions): Promise<Work[]>;

    /**
     * 更新作品信息
     * @param id 作品ID
     * @param updateData 更新数据
     * @returns 更新后的作品信息
     */
    update(id: string, updateData: UpdateWork): Promise<Work>;

    /**
     * 删除作品（级联删除相关数据）
     * @param id 作品ID
     */
    delete(id: string): Promise<void>;

    /**
     * 搜索作品
     * @param query 搜索关键词
     * @param authorId 可选的作者ID筛选
     * @returns 匹配的作品列表
     */
    search(query: string, authorId?: string): Promise<Work[]>;

    /**
     * 获取作品统计信息
     * @param id 作品ID
     * @returns 统计信息（章节数、字数等）
     */
    getStats(id: string): Promise<{
        chapterCount: number;
        totalWords: number;
        totalCharacters: number;
    }>;
}