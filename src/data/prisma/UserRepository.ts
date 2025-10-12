import { PrismaClient } from '../../generated/prisma';
import { getCurrentTimestamp } from '../../utils/timestamp';
import { IUserRepository, UserData } from '../interfaces';

/**
 * Prisma 用户仓储实现
 * 处理所有用户相关的数据操作
 */
export class PrismaUserRepository implements IUserRepository {
    constructor(private prisma: PrismaClient) {}

    /**
     * 创建新用户
     */
    async create(userData: UserData): Promise<any> {
        const timestamp = getCurrentTimestamp();

        return await this.prisma.author.create({
            data: {
                id: userData.id,
                username: userData.username,
                displayName: userData.displayName || userData.username,
                email: userData.email,
                bio: userData.bio || null,
                publicKey: userData.publicKey,
                privateKeyEncrypted: userData.privateKeyEncrypted,
                status: 'active',
                createdAt: timestamp,
                updatedAt: timestamp
            }
        });
    }

    /**
     * 根据ID查找用户
     */
    async findById(id: string): Promise<any | null> {
        return await this.prisma.author.findUnique({
            where: { id },
            include: {
                works: {
                    take: 5,
                    orderBy: { updatedAt: 'desc' }
                },
                _count: {
                    select: {
                        works: true,
                        chapters: true,
                        contents: true
                    }
                }
            }
        });
    }

    /**
     * 根据用户名查找用户
     */
    async findByUsername(username: string): Promise<any | null> {
        if (!username) {
            throw new Error('用户名参数不能为空');
        }
        
        return await this.prisma.author.findUnique({
            where: { username }
        });
    }

    /**
     * 根据邮箱查找用户
     */
    async findByEmail(email: string): Promise<any | null> {
        return await this.prisma.author.findUnique({
            where: { email }
        });
    }

    /**
     * 更新用户信息
     */
    async update(id: string, updateData: Partial<UserData>): Promise<any> {
        const timestamp = getCurrentTimestamp();

        return await this.prisma.author.update({
            where: { id },
            data: {
                ...updateData,
                updatedAt: timestamp
            }
        });
    }

    /**
     * 删除用户
     */
    async delete(id: string): Promise<void> {
        await this.prisma.author.delete({
            where: { id }
        });
    }
}
