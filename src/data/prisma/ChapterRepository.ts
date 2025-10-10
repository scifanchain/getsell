import { PrismaClient } from '../../generated/prisma';
import { IChapterRepository, ChapterData, PaginationOptions } from '../interfaces';
import { ulid } from 'ulid';
import { getCurrentTimestamp } from '../../utils/timestamp';

/**
 * Prisma 章节仓储实现
 * 处理所有章节相关的数据操作
 */
export class PrismaChapterRepository implements IChapterRepository {
    constructor(private prisma: PrismaClient) {}

    /**
     * 创建新章节
     */
    async create(chapterData: ChapterData): Promise<any> {
        const timestamp = getCurrentTimestamp();
        const chapterId = ulid();

        // 计算章节层级
        let level = 1;
        if (chapterData.parentId) {
            const parentChapter = await this.prisma.chapter.findUnique({
                where: { id: chapterData.parentId },
                select: { level: true, workId: true }
            });
            
            if (!parentChapter) {
                throw new Error('指定的父章节不存在');
            }
            
            if (parentChapter.workId !== chapterData.workId) {
                throw new Error('父章节不属于指定的作品');
            }
            
            level = parentChapter.level + 1;
            if (level > 3) {
                throw new Error('章节层级不能超过3层');
            }
        }

        // 如果没有提供 orderIndex，计算下一个可用的索引
        let orderIndex = chapterData.orderIndex;
        if (orderIndex === undefined) {
            const maxOrder = await this.prisma.chapter.aggregate({
                where: {
                    workId: chapterData.workId,
                    parentId: chapterData.parentId || null
                },
                _max: { orderIndex: true }
            });
            orderIndex = (maxOrder._max.orderIndex || 0) + 1;
        }

        return await this.prisma.chapter.create({
            data: {
                id: chapterId,
                workId: chapterData.workId,
                parentId: chapterData.parentId || null,
                level,
                orderIndex,
                title: chapterData.title,
                subtitle: chapterData.subtitle || null,
                description: chapterData.description || null,
                type: chapterData.type || 'chapter',
                authorId: chapterData.authorId!,
                status: 'draft',
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
                work: {
                    select: {
                        id: true,
                        title: true
                    }
                },
                parent: {
                    select: {
                        id: true,
                        title: true
                    }
                },
                _count: {
                    select: {
                        children: true,
                        contents: true
                    }
                }
            }
        });
    }

    /**
     * 根据ID查找章节
     */
    async findById(id: string): Promise<any | null> {
        return await this.prisma.chapter.findUnique({
            where: { id },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true
                    }
                },
                work: {
                    select: {
                        id: true,
                        title: true
                    }
                },
                parent: {
                    select: {
                        id: true,
                        title: true
                    }
                },
                children: {
                    orderBy: { orderIndex: 'asc' },
                    include: {
                        _count: {
                            select: {
                                children: true,
                                contents: true
                            }
                        }
                    }
                },
                contents: {
                    orderBy: { orderIndex: 'asc' },
                    take: 10
                },
                _count: {
                    select: {
                        children: true,
                        contents: true
                    }
                }
            }
        });
    }

    /**
     * 获取作品的章节列表
     */
    async findByWork(workId: string, includeChildren: boolean = true): Promise<any[]> {
        if (includeChildren) {
            // 获取所有章节并构建层级结构
            const allChapters = await this.prisma.chapter.findMany({
                where: { workId },
                orderBy: [
                    { parentId: { sort: 'asc', nulls: 'first' } },
                    { orderIndex: 'asc' }
                ],
                include: {
                    _count: {
                        select: {
                            children: true,
                            contents: true
                        }
                    }
                }
            });
            return allChapters;
        } else {
            // 只获取根级章节
            return await this.prisma.chapter.findMany({
                where: {
                    workId,
                    parentId: null
                },
                orderBy: { orderIndex: 'asc' },
                include: {
                    _count: {
                        select: {
                            children: true,
                            contents: true
                        }
                    }
                }
            });
        }
    }

    /**
     * 获取父章节的子章节列表
     */
    async findChildren(parentId: string): Promise<any[]> {
        return await this.prisma.chapter.findMany({
            where: { parentId },
            orderBy: { orderIndex: 'asc' },
            include: {
                _count: {
                    select: {
                        children: true,
                        contents: true
                    }
                }
            }
        });
    }

    /**
     * 更新章节信息
     */
    async update(id: string, updateData: Partial<ChapterData>): Promise<any> {
        const timestamp = getCurrentTimestamp();

        return await this.prisma.chapter.update({
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
                work: {
                    select: {
                        id: true,
                        title: true
                    }
                },
                parent: {
                    select: {
                        id: true,
                        title: true
                    }
                },
                _count: {
                    select: {
                        children: true,
                        contents: true
                    }
                }
            }
        });
    }

    /**
     * 删除章节（级联删除相关数据）
     */
    async delete(id: string): Promise<void> {
        // 由于 Prisma 的级联删除设置，删除章节会自动删除相关的内容和子章节
        await this.prisma.chapter.delete({
            where: { id }
        });
    }

    /**
     * 重新排序章节
     */
    async reorder(workId: string, chapterOrders: Array<{ id: string; orderIndex: number }>): Promise<void> {
        const timestamp = getCurrentTimestamp();

        // 使用事务来确保原子性
        await this.prisma.$transaction(
            chapterOrders.map(({ id, orderIndex }) =>
                this.prisma.chapter.update({
                    where: { id },
                    data: {
                        orderIndex,
                        updatedAt: timestamp
                    }
                })
            )
        );
    }

    /**
     * 移动章节到新的父章节下
     */
    async move(chapterId: string, newParentId: string | null, newOrderIndex: number): Promise<any> {
        const timestamp = getCurrentTimestamp();

        return await this.prisma.chapter.update({
            where: { id: chapterId },
            data: {
                parentId: newParentId,
                orderIndex: newOrderIndex,
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
                work: {
                    select: {
                        id: true,
                        title: true
                    }
                },
                parent: {
                    select: {
                        id: true,
                        title: true
                    }
                },
                _count: {
                    select: {
                        children: true,
                        contents: true
                    }
                }
            }
        });
    }

    /**
     * 获取章节的层级路径
     */
    async getPath(chapterId: string): Promise<any[]> {
        const path: any[] = [];
        let currentChapter = await this.prisma.chapter.findUnique({
            where: { id: chapterId },
            include: {
                parent: {
                    select: {
                        id: true,
                        title: true,
                        parentId: true
                    }
                }
            }
        });

        if (!currentChapter) {
            return path;
        }

        // 添加当前章节到路径
        path.unshift({
            id: currentChapter.id,
            title: currentChapter.title
        });

        // 递归获取父章节路径
        let parentId = currentChapter.parentId;
        while (parentId) {
            const parentChapter = await this.prisma.chapter.findUnique({
                where: { id: parentId },
                select: {
                    id: true,
                    title: true,
                    parentId: true
                }
            });

            if (!parentChapter) break;

            path.unshift({
                id: parentChapter.id,
                title: parentChapter.title
            });

            parentId = parentChapter.parentId;
        }

        return path;
    }
}
