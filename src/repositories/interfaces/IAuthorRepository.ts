import type { Author, NewAuthor, UpdateAuthor } from '../../db/schema';
import type { AuthorData } from '../../shared/types';

/**
 * 作者仓储接口
 * 定义所有作者相关的数据访问操作
 */
export interface IAuthorRepository {
    /**
     * 创建新作者
     * @param authorData 作者数据
     * @returns 创建的作者信息
     */
    create(authorData: Omit<NewAuthor, 'id' | 'createdAt' | 'updatedAt'>): Promise<Author>;

    /**
     * 根据ID查找作者
     * @param id 作者ID
     * @returns 作者信息或null
     */
    findById(id: string): Promise<any | null>;

    /**
     * 根据用户名查找作者
     * @param username 用户名
     * @returns 作者信息或null
     */
    findByUsername(username: string): Promise<any | null>;

    /**
     * 根据邮箱查找作者
     * @param email 邮箱
     * @returns 作者信息或null
     */
    findByEmail(email: string): Promise<any | null>;

    /**
     * 更新作者信息
     * @param id 作者ID
     * @param updateData 更新数据
     * @returns 更新后的作者信息
     */
    update(id: string, updateData: Partial<AuthorData>): Promise<any>;

    /**
     * 删除作者
     * @param id 作者ID
     */
    delete(id: string): Promise<void>;
}