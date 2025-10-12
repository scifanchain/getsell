import { PrismaClient } from '../generated/prisma';
import { getCurrentTimestamp } from '../utils/timestamp';
import { ulid } from 'ulid';
import path from 'path';

/**
 * 用户数据接口
 */
interface UserData {
    id: string;
    username: string;
    displayName?: string;
    email: string;
    bio?: string;
    publicKey: string;
    privateKeyEncrypted: string;
}

/**
 * 作品数据接口
 */
interface WorkData {
    title: string;
    description?: string;
    genre?: string;
    authorId?: string;
    collaborationMode?: string;
}

/**
 * 章节数据接口
 */
interface ChapterData {
    workId: string;
    parentId?: string;
    orderIndex?: number;
    title: string;
    subtitle?: string;
    description?: string;
    type?: string;
    authorId?: string;
}

/**
 * 内容数据接口
 */
interface ContentData {
    workId: string;
    chapterId?: string;
    orderIndex?: number;
    title?: string;
    type?: string;
    contentJson?: string;
    authorId?: string;
}

/**
 * 统计信息接口
 */
interface Stats {
    authors: number;
    works: number;
    chapters: number;
    contents: number;
    characters: number;
    chapter_levels: Record<string, number>;
    content_stats: {
        total_words: number;
        total_characters: number;
        total_contents: number;
    };
}

/**
 * Gestell Prisma数据库管理器
 * 使用Prisma ORM为去中心化科幻写作软件提供数据存储
 */
export class GestallPrismaDatabase {
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

        console.log('🗄️ Gestell Prisma数据库初始化成功');
        console.log('📍 旧数据库路径:', databaseUrl);
    }

    /**
     * 连接数据库
     */
    async connect(): Promise<void> {
        try {
            await this.prisma.$connect();
            console.log('✅ Prisma数据库连接成功');
            
            // 确保默认用户存在
            await this.createDefaultUser();
        } catch (error) {
            console.error('❌ Prisma数据库连接失败:', error);
            throw error;
        }
    }

    /**
     * 断开数据库连接
     */
    async disconnect(): Promise<void> {
        try {
            await this.prisma.$disconnect();
            console.log('🗄️ Prisma数据库连接已关闭');
        } catch (error) {
            console.error('❌ 断开Prisma数据库连接失败:', error);
        }
    }

    /**
     * 生成ULID
     */
    generateId(): string {
        return ulid();
    }

    /**
     * 获取当前时间戳（BigInt格式）
     */
    getTimestamp(): Date {
        return getCurrentTimestamp();
    }

    /**
     * 创建默认用户
     */
    private async createDefaultUser(): Promise<void> {
        try {
            const existingUser = await this.prisma.author.findUnique({
                where: { id: 'user_mock_001' }
            });

            if (!existingUser) {
                const timestamp = this.getTimestamp();
                await this.prisma.author.create({
                    data: {
                        id: 'user_mock_001',
                        username: 'demo_user',
                        displayName: '演示用户',
                        email: 'demo@gestell.dev',
                        bio: '这是一个演示用户账户',
                        status: 'active',
                        createdAt: timestamp,
                        updatedAt: timestamp
                    }
                });
                console.log('✅ 默认用户创建成功');
            } else {
                console.log('ℹ️ 默认用户已存在');
            }
        } catch (error) {
            console.warn('⚠️ 创建默认用户失败:', (error as Error).message);
        }
    }

    /**
     * 创建新用户
     */
    async createUser(userData: UserData) {
        const timestamp = this.getTimestamp();

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
     * 创建新作品
     */
    async createWork(workData: WorkData) {
        const timestamp = this.getTimestamp();
        const workId = this.generateId();

        return await this.prisma.work.create({
            data: {
                id: workId,
                title: workData.title,
                description: workData.description || null,
                genre: workData.genre || null,
                authorId: workData.authorId || 'user_mock_001',
                collaborationMode: workData.collaborationMode || 'solo',
                status: 'draft',
                createdAt: timestamp,
                updatedAt: timestamp
            },
            include: {
                author: true,
                chapters: true
            }
        });
    }

    /**
     * 获取作品列表
     */
    async getWorksList(authorId: string = 'user_mock_001') {
        return await this.prisma.work.findMany({
            where: {
                authorId: authorId
            },
            include: {
                author: true,
                chapters: {
                    take: 5, // 只取前5个章节作为预览
                    orderBy: {
                        orderIndex: 'asc'
                    }
                },
                _count: {
                    select: {
                        chapters: true,
                        contents: true
                    }
                }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });
    }

    /**
     * 获取作品详情
     */
    async getWorkById(workId: string) {
        return await this.prisma.work.findUnique({
            where: { id: workId },
            include: {
                author: true,
                chapters: {
                    orderBy: [
                        { level: 'asc' },
                        { orderIndex: 'asc' }
                    ],
                    include: {
                        contents: {
                            take: 3,
                            orderBy: { orderIndex: 'asc' }
                        },
                        children: true
                    }
                },
                contents: {
                    where: { chapterId: null }, // 直接属于作品的内容
                    orderBy: { orderIndex: 'asc' }
                }
            }
        });
    }

    /**
     * 创建章节
     */
    async createChapter(chapterData: ChapterData) {
        const timestamp = this.getTimestamp();
        const chapterId = this.generateId();

        // 如果有parentId，获取父章节的层级
        let level = 1;
        if (chapterData.parentId) {
            const parentChapter = await this.prisma.chapter.findUnique({
                where: { id: chapterData.parentId }
            });
            if (parentChapter) {
                level = parentChapter.level + 1;
                if (level > 3) {
                    throw new Error('章节层级不能超过3层');
                }
            }
        }

        return await this.prisma.chapter.create({
            data: {
                id: chapterId,
                workId: chapterData.workId,
                parentId: chapterData.parentId || null,
                level: level,
                orderIndex: chapterData.orderIndex || 0,
                title: chapterData.title,
                subtitle: chapterData.subtitle || null,
                description: chapterData.description || null,
                type: chapterData.type || 'chapter',
                authorId: chapterData.authorId || 'user_mock_001',
                createdAt: timestamp,
                updatedAt: timestamp
            },
            include: {
                work: true,
                author: true,
                parent: true,
                children: true,
                contents: true
            }
        });
    }

    /**
     * 获取章节列表
     */
    async getChaptersList(workId: string) {
        return await this.prisma.chapter.findMany({
            where: { workId },
            include: {
                author: true,
                parent: true,
                children: true,
                contents: {
                    take: 3,
                    orderBy: { orderIndex: 'asc' }
                },
                _count: {
                    select: {
                        contents: true,
                        children: true
                    }
                }
            },
            orderBy: [
                { level: 'asc' },
                { orderIndex: 'asc' }
            ]
        });
    }

    /**
     * 创建内容
     */
    async createContent(contentData: ContentData) {
        const timestamp = this.getTimestamp();
        const contentId = this.generateId();

        // 计算文本统计
        const textContent = this.extractTextFromJson(contentData.contentJson || '');
        const wordCount = this.countWords(textContent);
        const characterCount = textContent.length;
        const paragraphCount = this.countParagraphs(textContent);

        return await this.prisma.content.create({
            data: {
                id: contentId,
                workId: contentData.workId,
                chapterId: contentData.chapterId || null,
                orderIndex: contentData.orderIndex || 0,
                title: contentData.title || null,
                type: contentData.type || 'text',
                contentJson: contentData.contentJson || '',
                // contentHtml: contentData.contentHtml || '', // 字段已在schema中注释
                // contentText: textContent, // 字段已在schema中注释
                wordCount: wordCount,
                characterCount: characterCount,
                paragraphCount: paragraphCount,
                authorId: contentData.authorId || 'user_mock_001',
                lastEditedAt: timestamp,
                lastEditorId: contentData.authorId || 'user_mock_001',
                createdAt: timestamp,
                updatedAt: timestamp
            },
            include: {
                work: true,
                chapter: true,
                author: true,
                lastEditor: true
            }
        });
    }

    /**
     * 获取内容列表
     */
    async getContentsList(workId: string, chapterId: string | null = null) {
        return await this.prisma.content.findMany({
            where: {
                workId,
                chapterId: chapterId
            },
            include: {
                author: true,
                lastEditor: true,
                chapter: true,
                _count: {
                    select: {
                        versions: true
                    }
                }
            },
            orderBy: {
                orderIndex: 'asc'
            }
        });
    }

    /**
     * 更新作品
     */
    async updateWork(workId: string, updateData: Partial<WorkData>) {
        const timestamp = this.getTimestamp();
        
        return await this.prisma.work.update({
            where: { id: workId },
            data: {
                ...updateData,
                updatedAt: timestamp
            },
            include: {
                author: true,
                chapters: true
            }
        });
    }

    /**
     * 更新章节
     */
    async updateChapter(chapterId: string, updateData: Partial<ChapterData>) {
        const timestamp = this.getTimestamp();
        
        return await this.prisma.chapter.update({
            where: { id: chapterId },
            data: {
                ...updateData,
                updatedAt: timestamp
            },
            include: {
                work: true,
                author: true,
                parent: true,
                children: true,
                contents: true
            }
        });
    }

    /**
     * 更新内容
     */
    async updateContent(contentId: string, updateData: Partial<ContentData>) {
        const timestamp = this.getTimestamp();
        
        // 如果更新了内容，重新计算统计
        if (updateData.contentJson) {
            const textContent = this.extractTextFromJson(updateData.contentJson);
            (updateData as any).contentText = textContent;
            (updateData as any).wordCount = this.countWords(textContent);
            (updateData as any).characterCount = textContent.length;
            (updateData as any).paragraphCount = this.countParagraphs(textContent);
        }
        
        return await this.prisma.content.update({
            where: { id: contentId },
            data: {
                ...updateData,
                lastEditedAt: timestamp,
                updatedAt: timestamp
            },
            include: {
                work: true,
                chapter: true,
                author: true,
                lastEditor: true
            }
        });
    }

    /**
     * 获取统计信息
     */
    async getStats(): Promise<Stats> {
        // 并行获取各种统计
        const [
            authorsCount,
            worksCount,
            chaptersCount,
            contentsCount,
            charactersCount,
        ] = await Promise.all([
            this.prisma.author.count(),
            this.prisma.work.count(),
            this.prisma.chapter.count(),
            this.prisma.content.count(),
            this.prisma.character.count(),
        ]);

        // 获取章节层级统计
        const chapterLevels = await this.prisma.chapter.groupBy({
            by: ['level'],
            _count: { level: true }
        });

        const chapter_levels: Record<string, number> = {};
        chapterLevels.forEach(item => {
            chapter_levels[`level_${item.level}`] = item._count.level;
        });

        // 获取内容统计
        const contentStats = await this.prisma.content.aggregate({
            _sum: {
                wordCount: true,
                characterCount: true
            },
            _count: {
                id: true
            }
        });

        return {
            authors: authorsCount,
            works: worksCount,
            chapters: chaptersCount,
            contents: contentsCount,
            characters: charactersCount,
            chapter_levels,
            content_stats: {
                total_words: contentStats._sum.wordCount || 0,
                total_characters: contentStats._sum.characterCount || 0,
                total_contents: contentStats._count.id || 0
            }
        };
    }

    /**
     * 文本处理工具方法
     */
    private extractTextFromJson(jsonContent: string): string {
        if (!jsonContent) return '';
        try {
            const contentObj = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;
            if (contentObj.ops) {
                return contentObj.ops
                    .filter((op: any) => typeof op.insert === 'string')
                    .map((op: any) => op.insert)
                    .join('');
            }
            return '';
        } catch (error) {
            return jsonContent.toString();
        }
    }

    private countWords(text: string): number {
        if (!text) return 0;
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    private countParagraphs(text: string): number {
        if (!text) return 0;
        return text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
    }

    /**
     * 开始事务
     */
    async transaction<T>(callback: (prisma: any) => Promise<T>): Promise<T> {
        return await this.prisma.$transaction(callback);
    }

    /**
     * 原始查询
     */
    async query(sql: string, params: any[] = []): Promise<any> {
        return await this.prisma.$queryRawUnsafe(sql, ...params);
    }

    /**
     * 删除作品（级联删除相关数据）
     */
    async deleteWork(workId: string) {
        return await this.prisma.work.delete({
            where: { id: workId }
        });
    }

    /**
     * 删除章节（级联删除相关数据）
     */
    async deleteChapter(chapterId: string) {
        return await this.prisma.chapter.delete({
            where: { id: chapterId }
        });
    }

    /**
     * 删除内容
     */
    async deleteContent(contentId: string) {
        return await this.prisma.content.delete({
            where: { id: contentId }
        });
    }
}

export default GestallPrismaDatabase;
