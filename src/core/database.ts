import { PrismaClient } from '../generated/prisma';
import { getCurrentTimestamp } from '../utils/timestamp';
import { IDatabaseManager } from '../data/interfaces';
import ulidGenerator from './ulid';
import path from 'path';

/**
 * 数据库管理器
 * 负责数据库连接、事务和基础操作
 */
export class DatabaseManager implements IDatabaseManager {
    private prisma: PrismaClient;

    constructor() {
        // 获取应用根目录的绝对路径
        const appRoot = process.cwd();
        const defaultDbPath = path.join(appRoot, 'data', 'gestell.db');
        const databaseUrl = process.env.DATABASE_URL || `file:${defaultDbPath}`;
        
        // 初始化Prisma客户端
        this.prisma = new PrismaClient({
            log: ['query', 'info', 'warn', 'error'],
            datasources: {
                db: {
                    url: databaseUrl
                }
            }
        });

        console.log('🗄️ Gestell 数据库管理器初始化成功');
        console.log('📍 数据库路径:', databaseUrl);
    }

    /**
     * 连接数据库
     */
    async connect(): Promise<void> {
        try {
            await this.prisma.$connect();
            console.log('✅ 数据库连接成功');
        } catch (error) {
            console.error('❌ 数据库连接失败:', error);
            throw error;
        }
    }

    /**
     * 断开数据库连接
     */
    async disconnect(): Promise<void> {
        try {
            await this.prisma.$disconnect();
            console.log('🗄️ 数据库连接已关闭');
        } catch (error) {
            console.error('❌ 断开数据库连接失败:', error);
        }
    }

    /**
     * 获取数据库客户端实例
     */
    getClient(): PrismaClient {
        return this.prisma;
    }

    /**
     * 执行事务
     */
    async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
        return await this.prisma.$transaction(callback);
    }

    /**
     * 执行原始查询
     */
    async query(sql: string, params: any[] = []): Promise<any> {
        return await this.prisma.$queryRawUnsafe(sql, ...params);
    }

    /**
     * 生成唯一ID
     */
    generateId(): string {
        return ulidGenerator.generate();
    }

    /**
     * 获取当前时间戳
     */
    getTimestamp(): Date {
        return getCurrentTimestamp();
    }
}

export default DatabaseManager;
