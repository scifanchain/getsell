import { PrismaClient } from '../../generated/prisma';
import { IWorkRepository, WorkData, PaginationOptions, SortOptions } from '../interfaces';
import { ulid } from 'ulid';

/**
 * Prisma 作品仓储实现
 * 处理所有作品相关的数据操作
 */
export class PrismaWorkRepository implements IWorkRepository {
    constructor(private prisma: PrismaClient) {}

    /**
     * 创建新作品
     */
    async create(workData: WorkData): Promise<any> {
        const timestamp = BigInt(Date.now());
        const workId = ulid();

        return await this.prisma.work.create({
            data: {
                id: workId,
                title: workData.title,
                description: workData.description || null,
                genre: workData.genre || 'science_fiction',
                authorId: workData.authorId!,
                collaborationMode: workData.collaborationMode || 'solo',
                status: 'draft',
                isPublic: false,
                createdAt: timestamp,
                updatedAt: timestamp
            },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true
                    }
                },
                _count: {
                    select: {
                        chapters: true,
                        contents: true
                    }
                }
            }
        });
    }

    /**
     * 根据ID查找作品
     */
    async findById(id: string): Promise<any | null> {
        return await this.prisma.work.findUnique({
            where: { id },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true
                    }
                },
                chapters: {
                    orderBy: [
                        { parentId: { sort: 'asc', nulls: 'first' } },
                        { orderIndex: 'asc' }
                    ],
                    include: {
                        _count: {
                            select: {
                                contents: true,
                                children: true
                            }
                        }
                    }
                },
                contents: {
                    where: { chapterId: null },
                    orderBy: { orderIndex: 'asc' },
                    take: 10
                },
                _count: {
                    select: {
                        chapters: true,
                        contents: true,
                        collaborationLogs: true
                    }
                }
            }
        });
    }

    /**
     * 获取作者的作品列表
     */
    async findByAuthor(
        authorId: string, 
        pagination?: PaginationOptions, 
        sort?: SortOptions
    ): Promise<any[]> {
        const orderBy: any = {};
        if (sort) {
            orderBy[sort.field] = sort.direction;
        } else {
            orderBy.updatedAt = 'desc';
        }

        return await this.prisma.work.findMany({
            where: { authorId },
            orderBy,
            skip: pagination?.skip || 0,
            take: pagination?.take || 20,
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true
                    }
                },
                _count: {
                    select: {
                        chapters: true,
                        contents: true
                    }
                }
            }
        });
    }

    /**
     * 更新作品信息
     */
    async update(id: string, updateData: Partial<WorkData>): Promise<any> {
        const timestamp = BigInt(Date.now());

        return await this.prisma.work.update({
            where: { id },
            data: {
                ...updateData,
                updatedAt: timestamp
            },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true
                    }
                },
                _count: {
                    select: {
                        chapters: true,
                        contents: true
                    }
                }
            }
        });
    }

    /**
     * 删除作品（级联删除相关数据）
     */
    async delete(id: string): Promise<void> {
        // 由于 Prisma 的级联删除设置，删除作品会自动删除相关的章节和内容
        await this.prisma.work.delete({
            where: { id }
        });
    }

    /**
     * 搜索作品
     */
    async search(query: string, authorId?: string): Promise<any[]> {
        const whereConditions: any = {
            OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
                { genre: { contains: query, mode: 'insensitive' } }
            ]
        };

        if (authorId) {
            whereConditions.authorId = authorId;
        }

        return await this.prisma.work.findMany({
            where: whereConditions,
            orderBy: { updatedAt: 'desc' },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true
                    }
                },
                _count: {
                    select: {
                        chapters: true,
                        contents: true
                    }
                }
            }
        });
    }

    /**
     * 获取作品统计信息
     */
    async getStats(id: string): Promise<{
        chapterCount: number;
        totalWords: number;
        totalCharacters: number;
    }> {
        // 获取章节数量
        const chapterCount = await this.prisma.chapter.count({
            where: { workId: id }
        });

        // 获取内容统计
        const contentStats = await this.prisma.content.aggregate({
            where: { workId: id },
            _sum: {
                wordCount: true,
                characterCount: true
            }
        });

        return {
            chapterCount,
            totalWords: contentStats._sum.wordCount || 0,
            totalCharacters: contentStats._sum.characterCount || 0
        };
    }
}