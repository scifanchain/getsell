import { PrismaClient } from '../../generated/prisma';
import { getCurrentTimestamp } from '../../utils/timestamp';
import { IStatsRepository, Stats } from '../interfaces';

/**
 * Prisma 统计仓储实现
 * 处理所有统计相关的数据操作
 */
export class PrismaStatsRepository implements IStatsRepository {
    constructor(private prisma: PrismaClient) {}

    /**
     * 获取全系统统计信息
     */
    async getSystemStats(): Promise<Stats> {
        // 并行获取所有统计数据
        const [
            authorsCount,
            worksCount,
            chaptersCount,
            contentsCount,
            charactersCount,
            chapterLevels,
            contentStats
        ] = await Promise.all([
            this.prisma.author.count(),
            this.prisma.work.count(),
            this.prisma.chapter.count(),
            this.prisma.content.count(),
            this.prisma.character.count(),
            this.getChapterLevelStats(),
            this.getContentStats()
        ]);

        return {
            authors: authorsCount,
            works: worksCount,
            chapters: chaptersCount,
            contents: contentsCount,
            characters: charactersCount,
            worldbuilding: 0, // TODO: 实现世界观建设模型后更新
            chapter_levels: chapterLevels,
            content_stats: contentStats
        };
    }

    /**
     * 获取用户统计信息
     */
    async getUserStats(userId: string): Promise<{
        totalWorks: number;
        totalChapters: number;
        totalWords: number;
        totalCharacters: number;
    }> {
        const [
            worksCount,
            chaptersCount,
            contentStats
        ] = await Promise.all([
            this.prisma.work.count({
                where: { authorId: userId }
            }),
            this.prisma.chapter.count({
                where: { authorId: userId }
            }),
            this.prisma.content.aggregate({
                where: { authorId: userId },
                _sum: {
                    wordCount: true,
                    characterCount: true
                }
            })
        ]);

        return {
            totalWorks: worksCount,
            totalChapters: chaptersCount,
            totalWords: contentStats._sum.wordCount || 0,
            totalCharacters: contentStats._sum.characterCount || 0
        };
    }

    /**
     * 获取作品统计信息
     */
    async getWorkStats(workId: string): Promise<{
        chapterCount: number;
        contentCount: number;
        totalWords: number;
        totalCharacters: number;
        lastUpdated: Date;
    }> {
        const [
            chapterCount,
            contentCount,
            contentStats,
            lastUpdate
        ] = await Promise.all([
            this.prisma.chapter.count({
                where: { workId }
            }),
            this.prisma.content.count({
                where: { workId }
            }),
            this.prisma.content.aggregate({
                where: { workId },
                _sum: {
                    wordCount: true,
                    characterCount: true
                }
            }),
            this.prisma.content.findFirst({
                where: { workId },
                orderBy: { updatedAt: 'desc' },
                select: { updatedAt: true }
            })
        ]);

        return {
            chapterCount,
            contentCount,
            totalWords: contentStats._sum.wordCount || 0,
            totalCharacters: contentStats._sum.characterCount || 0,
            lastUpdated: lastUpdate ? new Date(Number(lastUpdate.updatedAt)) : new Date()
        };
    }

    /**
     * 更新作品统计缓存
     */
    async refreshWorkStats(workId: string): Promise<void> {
        const stats = await this.getWorkStats(workId);
        const timestamp = getCurrentTimestamp();

        // 更新作品表中的统计字段
        await this.prisma.work.update({
            where: { id: workId },
            data: {
                totalWords: stats.totalWords,
                totalCharacters: stats.totalCharacters,
                chapterCount: stats.chapterCount,
                updatedAt: timestamp
            }
        });
    }

    /**
     * 获取写作活动统计
     */
    async getActivityStats(userId: string, startDate: Date, endDate: Date): Promise<{
        dailyWordCounts: Array<{ date: string; words: number }>;
        totalWords: number;
        activeDays: number;
    }> {
        // 直接使用 Date 对象进行查询
        const contentUpdates = await this.prisma.content.findMany({
            where: {
                authorId: userId,
                updatedAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            select: {
                updatedAt: true,
                wordCount: true
            },
            orderBy: { updatedAt: 'asc' }
        });

        // 按日期分组统计
        const dailyStats = new Map<string, number>();
        let totalWords = 0;

        for (const update of contentUpdates) {
            const date = new Date(Number(update.updatedAt)).toISOString().split('T')[0];
            const currentCount = dailyStats.get(date) || 0;
            dailyStats.set(date, currentCount + update.wordCount);
            totalWords += update.wordCount;
        }

        // 转换为数组格式
        const dailyWordCounts = Array.from(dailyStats.entries()).map(([date, words]) => ({
            date,
            words
        }));

        return {
            dailyWordCounts,
            totalWords,
            activeDays: dailyStats.size
        };
    }

    /**
     * 获取章节层级统计
     */
    private async getChapterLevelStats(): Promise<Record<string, number>> {
        const chapters = await this.prisma.chapter.findMany({
            select: {
                id: true,
                parentId: true
            }
        });

        // 计算每个章节的层级
        const levelCounts: Record<string, number> = {};
        
        for (const chapter of chapters) {
            const level = await this.calculateChapterLevel(chapter.id, chapter.parentId);
            const levelKey = `level_${level}`;
            levelCounts[levelKey] = (levelCounts[levelKey] || 0) + 1;
        }

        return levelCounts;
    }

    /**
     * 计算章节层级
     */
    private async calculateChapterLevel(chapterId: string, parentId: string | null): Promise<number> {
        if (!parentId) {
            return 1; // 根级章节
        }

        const parent = await this.prisma.chapter.findUnique({
            where: { id: parentId },
            select: { parentId: true }
        });

        if (!parent) {
            return 1;
        }

        return 1 + await this.calculateChapterLevel(parentId, parent.parentId);
    }

    /**
     * 获取内容统计
     */
    private async getContentStats(): Promise<{
        total_words: number;
        total_characters: number;
        total_contents: number;
    }> {
        const stats = await this.prisma.content.aggregate({
            _sum: {
                wordCount: true,
                characterCount: true
            },
            _count: true
        });

        return {
            total_words: stats._sum.wordCount || 0,
            total_characters: stats._sum.characterCount || 0,
            total_contents: stats._count
        };
    }
}
