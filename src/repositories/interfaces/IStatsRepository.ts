import { Stats } from './types';

/**
 * 统计仓储接口
 * 定义系统统计相关的数据访问操作
 */
export interface IStatsRepository {
    /**
     * 获取全系统统计信息
     * @returns 统计信息
     */
    getSystemStats(): Promise<Stats>;

    /**
     * 获取作者统计信息
     * @param authorId 作者ID
     * @returns 作者相关统计
     */
    getAuthorStats(authorId: string): Promise<{
        totalWorks: number;
        totalChapters: number;
        totalWords: number;
        totalCharacters: number;
    }>;

    /**
     * 获取作品统计信息
     * @param workId 作品ID
     * @returns 作品相关统计
     */
    getWorkStats(workId: string): Promise<{
        chapterCount: number;
        contentCount: number;
        totalWords: number;
        totalCharacters: number;
        lastUpdated: Date;
    }>;

    /**
     * 更新作品统计缓存
     * @param workId 作品ID
     */
    refreshWorkStats(workId: string): Promise<void>;

    /**
     * 获取写作活动统计
     * @param authorId 作者ID
     * @param startDate 开始日期
     * @param endDate 结束日期
     * @returns 活动统计
     */
    getActivityStats(authorId: string, startDate: Date, endDate: Date): Promise<{
        dailyWordCounts: Array<{ date: string; words: number }>;
        totalWords: number;
        activeDays: number;
    }>;
}