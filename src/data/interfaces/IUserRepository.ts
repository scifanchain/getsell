import { UserData } from './types';

/**
 * 用户仓储接口
 * 定义所有用户相关的数据访问操作
 */
export interface IUserRepository {
    /**
     * 创建新用户
     * @param userData 用户数据
     * @returns 创建的用户信息
     */
    create(userData: UserData): Promise<any>;

    /**
     * 根据ID查找用户
     * @param id 用户ID
     * @returns 用户信息或null
     */
    findById(id: string): Promise<any | null>;

    /**
     * 根据用户名查找用户
     * @param username 用户名
     * @returns 用户信息或null
     */
    findByUsername(username: string): Promise<any | null>;

    /**
     * 根据邮箱查找用户
     * @param email 邮箱
     * @returns 用户信息或null
     */
    findByEmail(email: string): Promise<any | null>;

    /**
     * 更新用户信息
     * @param id 用户ID
     * @param updateData 更新数据
     * @returns 更新后的用户信息
     */
    update(id: string, updateData: Partial<UserData>): Promise<any>;

    /**
     * 删除用户
     * @param id 用户ID
     */
    delete(id: string): Promise<void>;
}