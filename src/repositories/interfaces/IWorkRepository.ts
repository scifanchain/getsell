import { WorkData, PaginationOptions, SortOptions } from './types';

/**
 * 作品仓储接口
 * 定义所有作品相关的数据访问操作
 */
export interface IWorkRepository {
    /**
     * 创建新作品
     * @param workData 作品数据
     * @returns 创建的作品信息（包含关联数据）
     */
    create(workData: WorkData): Promise<any>;

    /**
     * 根据ID查找作品
     * @param id 作品ID
     * @returns 作品详细信息（包含章节和内容）
     */
    findById(id: string): Promise<any | null>;

    /**
     * 获取作者的作品列表
     * @param authorId 作者ID
     * @param pagination 分页选项
     * @param sort 排序选项
     * @returns 作品列表
     */
    findByAuthor(authorId: string, pagination?: PaginationOptions, sort?: SortOptions): Promise<any[]>;

    /**
     * 获取所有作品列表
     * @param pagination 分页选项
     * @param sort 排序选项
     * @returns 作品列表
     */
    findAll(pagination?: PaginationOptions, sort?: SortOptions): Promise<any[]>;

    /**
     * 更新作品信息
     * @param id 作品ID
     * @param updateData 更新数据
     * @returns 更新后的作品信息
     */
    update(id: string, updateData: Partial<WorkData>): Promise<any>;

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
    search(query: string, authorId?: string): Promise<any[]>;

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