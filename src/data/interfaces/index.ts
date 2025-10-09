/**
 * 数据访问层接口统一导出
 */

// 类型定义
export * from './types';

// Repository 接口
export { IUserRepository } from './IUserRepository';
export { IWorkRepository } from './IWorkRepository';
export { IChapterRepository } from './IChapterRepository';
export { IContentRepository } from './IContentRepository';
export { IStatsRepository } from './IStatsRepository';

/**
 * 数据库管理器接口
 * 负责数据库连接和基础操作
 */
export interface IDatabaseManager {
    /**
     * 连接数据库
     */
    connect(): Promise<void>;

    /**
     * 断开数据库连接
     */
    disconnect(): Promise<void>;

    /**
     * 获取数据库客户端实例
     */
    getClient(): any;

    /**
     * 执行事务
     */
    transaction<T>(callback: (client: any) => Promise<T>): Promise<T>;

    /**
     * 执行原始查询
     */
    query(sql: string, params?: any[]): Promise<any>;

    /**
     * 生成唯一ID
     */
    generateId(): string;

    /**
     * 获取当前时间戳
     */
    getTimestamp(): bigint;
}