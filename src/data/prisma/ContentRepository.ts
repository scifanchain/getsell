import { PrismaClient } from '../../generated/prisma';
import { getCurrentTimestamp } from '../../utils/timestamp';
import { IContentRepository, ContentData, PaginationOptions } from '../interfaces';
import { ulid } from 'ulid';

/**
 * Prisma 内容仓储实现
 * 处理所有内容相关的数据操作
 */
export class PrismaContentRepository implements IContentRepository {
    constructor(private prisma: PrismaClient) {}

    /**
     * 创建新内容
     */
    async create(contentData: ContentData): Promise<any> {
        const timestamp = getCurrentTimestamp();
        const contentId = ulid();

        // 如果没有提供 orderIndex，计算下一个可用的索引
        let orderIndex = contentData.orderIndex;
        if (orderIndex === undefined) {
            const maxOrder = await this.prisma.content.aggregate({
                where: {
                    workId: contentData.workId,
                    chapterId: contentData.chapterId || null
                },
                _max: { orderIndex: true }
            });
            orderIndex = (maxOrder._max.orderIndex || 0) + 1;
        }

        // 计算字数和字符数
        const text = this.extractTextFromContent(contentData.contentJson || contentData.contentHtml || '');
        const wordCount = this.countWords(text);
        const characterCount = text.length;

        return await this.prisma.content.create({
            data: {
                id: contentId,
                workId: contentData.workId,
                chapterId: contentData.chapterId || null,
                orderIndex,
                title: contentData.title || null,
                type: contentData.type || 'text',
                contentJson: contentData.contentJson || null,
                contentHtml: contentData.contentHtml || null,
                wordCount,
                characterCount,
                authorId: contentData.authorId!,
                lastEditedAt: timestamp,
                lastEditorId: contentData.authorId!,
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
                chapter: {
                    select: {
                        id: true,
                        title: true
                    }
                },
                _count: {
                    select: {
                        versions: true
                    }
                }
            }
        });
    }

    /**
     * 根据ID查找内容
     */
    async findById(id: string): Promise<any | null> {
        return await this.prisma.content.findUnique({
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
                chapter: {
                    select: {
                        id: true,
                        title: true
                    }
                },
                versions: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                    include: {
                        author: {
                            select: {
                                id: true,
                                username: true,
                                displayName: true
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        versions: true
                    }
                }
            }
        });
    }

    /**
     * 获取作品的内容列表
     */
    async findByWork(
        workId: string, 
        chapterId?: string | null, 
        pagination?: PaginationOptions
    ): Promise<any[]> {
        const whereConditions: any = { workId };
        
        if (chapterId !== undefined) {
            whereConditions.chapterId = chapterId;
        }

        return await this.prisma.content.findMany({
            where: whereConditions,
            orderBy: { orderIndex: 'asc' },
            skip: pagination?.skip || 0,
            take: pagination?.take || 50,
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true
                    }
                },
                chapter: {
                    select: {
                        id: true,
                        title: true
                    }
                },
                _count: {
                    select: {
                        versions: true
                    }
                }
            }
        });
    }

    /**
     * 获取章节的内容列表
     */
    async findByChapter(chapterId: string, pagination?: PaginationOptions): Promise<any[]> {
        return await this.prisma.content.findMany({
            where: { chapterId },
            orderBy: { orderIndex: 'asc' },
            skip: pagination?.skip || 0,
            take: pagination?.take || 50,
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
                _count: {
                    select: {
                        versions: true
                    }
                }
            }
        });
    }

    /**
     * 更新内容
     */
    async update(id: string, updateData: Partial<ContentData>): Promise<any> {
        const timestamp = getCurrentTimestamp();

        // 如果更新了内容，重新计算字数和字符数
        let additionalData: any = {};
        if (updateData.contentJson || updateData.contentHtml) {
            const text = this.extractTextFromContent(
                updateData.contentJson || updateData.contentHtml || ''
            );
            additionalData.wordCount = this.countWords(text);
            additionalData.characterCount = text.length;
        }

        return await this.prisma.content.update({
            where: { id },
            data: {
                ...updateData,
                ...additionalData,
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
                chapter: {
                    select: {
                        id: true,
                        title: true
                    }
                },
                _count: {
                    select: {
                        versions: true
                    }
                }
            }
        });
    }

    /**
     * 删除内容
     */
    async delete(id: string): Promise<void> {
        await this.prisma.content.delete({
            where: { id }
        });
    }

    /**
     * 重新排序内容
     */
    async reorder(
        workId: string,
        chapterId: string | null,
        contentOrders: Array<{ id: string; orderIndex: number }>
    ): Promise<void> {
        const timestamp = getCurrentTimestamp();

        // 使用事务来确保原子性
        await this.prisma.$transaction(
            contentOrders.map(({ id, orderIndex }) =>
                this.prisma.content.update({
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
     * 搜索内容
     */
    async search(workId: string, query: string, chapterId?: string): Promise<any[]> {
        const whereConditions: any = {
            workId,
            OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { contentJson: { contains: query, mode: 'insensitive' } },
                { contentHtml: { contains: query, mode: 'insensitive' } }
            ]
        };

        if (chapterId) {
            whereConditions.chapterId = chapterId;
        }

        return await this.prisma.content.findMany({
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
                chapter: {
                    select: {
                        id: true,
                        title: true
                    }
                },
                _count: {
                    select: {
                        versions: true
                    }
                }
            }
        });
    }

    /**
     * 获取内容的版本历史
     */
    async getVersionHistory(contentId: string): Promise<any[]> {
        return await this.prisma.contentVersion.findMany({
            where: { contentId },
            orderBy: { createdAt: 'desc' },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true
                    }
                }
            }
        });
    }

    /**
     * 创建内容版本
     */
    async createVersion(contentId: string, versionData: any): Promise<any> {
        const timestamp = getCurrentTimestamp();
        const versionId = ulid();

        return await this.prisma.contentVersion.create({
            data: {
                id: versionId,
                contentId,
                versionNumber: versionData.versionNumber || 1,
                contentJson: versionData.contentJson || '',
                contentHtml: versionData.contentHtml || null,
                authorId: versionData.authorId,
                changeSummary: versionData.changeSummary || null,
                createdAt: timestamp
            },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true
                    }
                },
                content: {
                    select: {
                        id: true,
                        title: true,
                        workId: true,
                        chapterId: true
                    }
                }
            }
        });
    }

    /**
     * 从内容中提取纯文本（移除 HTML 标签和 JSON 结构）
     */
    private extractTextFromContent(content: string): string {
        if (!content) return '';

        try {
            // 如果是 JSON 格式的 ProseMirror 文档
            if (content.trim().startsWith('{')) {
                const doc = JSON.parse(content);
                return this.extractTextFromProseMirrorDoc(doc);
            }
        } catch (e) {
            // 如果不是有效的 JSON，继续处理为 HTML
        }

        // 如果是 HTML 格式，移除标签
        return content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }

    /**
     * 从 ProseMirror 文档中提取文本
     */
    private extractTextFromProseMirrorDoc(doc: any): string {
        if (!doc || !doc.content) return '';

        let text = '';
        for (const node of doc.content) {
            text += this.extractTextFromProseMirrorNode(node);
        }
        return text;
    }

    /**
     * 从 ProseMirror 节点中提取文本
     */
    private extractTextFromProseMirrorNode(node: any): string {
        if (!node) return '';

        if (node.type === 'text') {
            return node.text || '';
        }

        if (node.content) {
            let text = '';
            for (const child of node.content) {
                text += this.extractTextFromProseMirrorNode(child);
            }
            // 对于段落等块级元素，添加换行符
            if (['paragraph', 'heading'].includes(node.type)) {
                text += '\n';
            }
            return text;
        }

        return '';
    }

    /**
     * 计算文本的字数（中英文混合）
     */
    private countWords(text: string): number {
        if (!text) return 0;

        // 移除多余的空白字符
        const cleanText = text.replace(/\s+/g, ' ').trim();
        
        // 分离中文字符和英文单词
        const chineseChars = cleanText.match(/[\u4e00-\u9fff]/g) || [];
        const englishWords = cleanText.replace(/[\u4e00-\u9fff]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 0);

        return chineseChars.length + englishWords.length;
    }
}
