const { PrismaClient } = require('../generated/prisma');
const { ulid } = require('ulid');

/**
 * Gestell Prisma数据库管理器
 * 使用Prisma ORM为去中心化科幻写作软件提供数据存储
 */
class GestallPrismaDatabase {
    constructor() {
        // 初始化Prisma客户端
        this.prisma = new PrismaClient({
            log: ['query', 'info', 'warn', 'error'],
            datasources: {
                db: {
                    url: process.env.DATABASE_URL || 'file:./data/gestell.db'
                }
            }
        });

        console.log('🗄️ Gestell Prisma数据库初始化成功');
    }

    /**
     * 连接数据库
     */
    async connect() {
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
    async disconnect() {
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
    generateId() {
        return ulid();
    }

    /**
     * 获取当前时间戳（BigInt格式）
     */
    getTimestamp() {
        return BigInt(Date.now());
    }

    /**
     * 创建默认用户
     */
    async createDefaultUser() {
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
            console.warn('⚠️ 创建默认用户失败:', error.message);
        }
    }

    /**
     * 创建新用户
     */
    async createUser(userData) {
        const timestamp = this.getTimestamp();

        return await this.prisma.author.create({
            data: {
                id: userData.id,
                username: userData.username,
                displayName: userData.displayName || userData.username,
                email: userData.email,
                bio: userData.bio || null,
                passwordHash: userData.passwordHash,
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
    async createWork(workData) {
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
    async getWorksList(authorId = 'user_mock_001') {
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
    async getWorkById(workId) {
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
    async createChapter(chapterData) {
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
    async getChaptersList(workId) {
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
    async createContent(contentData) {
        const timestamp = this.getTimestamp();
        const contentId = this.generateId();

        // 计算文本统计
        const textContent = this.extractTextFromDelta(contentData.contentDelta || '');
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
                contentDelta: contentData.contentDelta || '',
                contentHtml: contentData.contentHtml || '',
                contentText: textContent,
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
    async getContentsList(workId, chapterId = null) {
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
    async updateWork(workId, updateData) {
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
    async updateChapter(chapterId, updateData) {
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
    async updateContent(contentId, updateData) {
        const timestamp = this.getTimestamp();
        
        // 如果更新了内容，重新计算统计
        if (updateData.contentDelta) {
            const textContent = this.extractTextFromDelta(updateData.contentDelta);
            updateData.contentText = textContent;
            updateData.wordCount = this.countWords(textContent);
            updateData.characterCount = textContent.length;
            updateData.paragraphCount = this.countParagraphs(textContent);
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
    async getStats() {
        const stats = {};
        
        // 并行获取各种统计
        const [
            authorsCount,
            worksCount,
            chaptersCount,
            contentsCount,
            charactersCount,
            worldbuildingCount
        ] = await Promise.all([
            this.prisma.author.count(),
            this.prisma.work.count(),
            this.prisma.chapter.count(),
            this.prisma.content.count(),
            this.prisma.character.count(),
            this.prisma.worldbuilding.count()
        ]);

        stats.authors = authorsCount;
        stats.works = worksCount;
        stats.chapters = chaptersCount;
        stats.contents = contentsCount;
        stats.characters = charactersCount;
        stats.worldbuilding = worldbuildingCount;

        // 获取章节层级统计
        const chapterLevels = await this.prisma.chapter.groupBy({
            by: ['level'],
            _count: { level: true }
        });

        stats.chapter_levels = {};
        chapterLevels.forEach(item => {
            stats.chapter_levels[`level_${item.level}`] = item._count.level;
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

        stats.content_stats = {
            total_words: contentStats._sum.wordCount || 0,
            total_characters: contentStats._sum.characterCount || 0,
            total_contents: contentStats._count.id || 0
        };

        return stats;
    }

    /**
     * 文本处理工具方法
     */
    extractTextFromDelta(delta) {
        if (!delta) return '';
        try {
            const deltaObj = typeof delta === 'string' ? JSON.parse(delta) : delta;
            if (deltaObj.ops) {
                return deltaObj.ops
                    .filter(op => typeof op.insert === 'string')
                    .map(op => op.insert)
                    .join('');
            }
            return '';
        } catch (error) {
            return delta.toString();
        }
    }

    countWords(text) {
        if (!text) return 0;
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    countParagraphs(text) {
        if (!text) return 0;
        return text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
    }

    /**
     * 开始事务
     */
    async transaction(callback) {
        return await this.prisma.$transaction(callback);
    }

    /**
     * 原始查询
     */
    async query(sql, params = []) {
        return await this.prisma.$queryRawUnsafe(sql, ...params);
    }

    /**
     * 删除作品（级联删除相关数据）
     */
    async deleteWork(workId) {
        return await this.prisma.work.delete({
            where: { id: workId }
        });
    }

    /**
     * 删除章节（级联删除相关数据）
     */
    async deleteChapter(chapterId) {
        return await this.prisma.chapter.delete({
            where: { id: chapterId }
        });
    }

    /**
     * 删除内容
     */
    async deleteContent(contentId) {
        return await this.prisma.content.delete({
            where: { id: contentId }
        });
    }
}

module.exports = GestallPrismaDatabase;