import { IWorkService, CreateWorkData, WorkInfo, WorkQueryOptions, UpdateWorkData, WorkStats, PublishResult } from './interfaces';
import { RepositoryContainer } from '../data/RepositoryContainer';
import { ulid } from 'ulid';

/**
 * 作品服务实现
 * 处理作品相关的业务逻辑
 */
export class WorkService implements IWorkService {
    constructor(private repositories: RepositoryContainer) {}

    /**
     * 创建新作品
     */
    async createWork(authorId: string, workData: CreateWorkData): Promise<WorkInfo> {
        // 验证作者是否存在
        const author = await this.repositories.userRepository.findById(authorId);
        if (!author) {
            throw new Error('作者不存在');
        }

        // 创建作品数据
        const createData = {
            title: workData.title,
            description: workData.description,
            genre: workData.genre || 'science_fiction',
            authorId: authorId,
            collaborationMode: workData.collaborationMode || 'solo'
        };

        const createdWork = await this.repositories.workRepository.create(createData);
        return this.mapToWorkInfo(createdWork);
    }

    /**
     * 获取作品详情
     */
    async getWork(workId: string, userId: string): Promise<WorkInfo | null> {
        const work = await this.repositories.workRepository.findById(workId);
        
        if (!work) {
            return null;
        }

        // 检查用户权限（作者或协作者）
        if (!this.checkWorkAccess(work, userId)) {
            throw new Error('没有访问此作品的权限');
        }

        return this.mapToWorkInfo(work);
    }

    /**
     * 获取用户的作品列表
     */
    async getUserWorks(userId: string, options?: WorkQueryOptions): Promise<WorkInfo[]> {
        const paginationOptions = {
            skip: options?.offset || 0,
            take: options?.limit || 20
        };

        const sortOptions = {
            field: options?.sortBy || 'updatedAt',
            direction: options?.sortOrder || 'desc'
        };

        const works = await this.repositories.workRepository.findByAuthor(
            userId, 
            paginationOptions, 
            sortOptions
        );

        return works.map(work => this.mapToWorkInfo(work));
    }

    /**
     * 更新作品信息
     */
    async updateWork(workId: string, userId: string, updateData: UpdateWorkData): Promise<WorkInfo> {
        // 获取作品并检查权限
        const work = await this.repositories.workRepository.findById(workId);
        if (!work) {
            throw new Error('作品不存在');
        }

        if (!this.checkWorkAccess(work, userId)) {
            throw new Error('没有修改此作品的权限');
        }

        const updatedWork = await this.repositories.workRepository.update(workId, updateData);
        
        // 如果更新了统计信息，刷新缓存
        if (updateData.status) {
            await this.repositories.statsRepository.refreshWorkStats(workId);
        }

        return this.mapToWorkInfo(updatedWork);
    }

    /**
     * 删除作品
     */
    async deleteWork(workId: string, userId: string): Promise<void> {
        // 获取作品并检查权限
        const work = await this.repositories.workRepository.findById(workId);
        if (!work) {
            throw new Error('作品不存在');
        }

        if (work.authorId !== userId) {
            throw new Error('只有作者可以删除作品');
        }

        await this.repositories.workRepository.delete(workId);
    }

    /**
     * 搜索作品
     */
    async searchWorks(query: string, userId?: string): Promise<WorkInfo[]> {
        const works = await this.repositories.workRepository.search(query, userId);
        return works.map(work => this.mapToWorkInfo(work));
    }

    /**
     * 获取作品统计信息
     */
    async getWorkStats(workId: string): Promise<WorkStats> {
        const [basicStats, detailStats] = await Promise.all([
            this.repositories.workRepository.getStats(workId),
            this.repositories.statsRepository.getWorkStats(workId)
        ]);

        return {
            chapterCount: basicStats.chapterCount,
            contentCount: detailStats.contentCount,
            totalWords: basicStats.totalWords,
            totalCharacters: basicStats.totalCharacters,
            avgWordsPerChapter: basicStats.chapterCount > 0 ? 
                Math.round(basicStats.totalWords / basicStats.chapterCount) : 0,
            lastUpdated: detailStats.lastUpdated,
            writingDays: this.calculateWritingDays(detailStats.lastUpdated),
            completionPercentage: this.calculateCompletionPercentage(basicStats.totalWords, 50000) // 假设目标5万字
        };
    }

    /**
     * 发布作品
     */
    async publishWork(workId: string, userId: string): Promise<PublishResult> {
        // 获取作品并检查权限
        const work = await this.repositories.workRepository.findById(workId);
        if (!work) {
            throw new Error('作品不存在');
        }

        if (work.authorId !== userId) {
            throw new Error('只有作者可以发布作品');
        }

        // 检查作品是否准备好发布
        const stats = await this.getWorkStats(workId);
        if (stats.totalWords < 100) {
            return {
                success: false,
                message: '作品内容太少，无法发布（至少需要100字）'
            };
        }

        // 更新作品状态为已发布
        await this.repositories.workRepository.update(workId, {
            status: 'published',
            isPublic: true,
            publishedAt: BigInt(Date.now())
        } as any);

        return {
            success: true,
            message: '作品发布成功',
            publishedAt: new Date(),
            publishUrl: `/works/${workId}` // 假设的公开链接
        };
    }

    /**
     * 将数据库作品对象映射为作品信息对象
     */
    private mapToWorkInfo(work: any): WorkInfo {
        return {
            id: work.id,
            title: work.title,
            subtitle: work.subtitle,
            description: work.description,
            genre: work.genre,
            tags: work.tags ? work.tags.split(',') : [],
            author: {
                id: work.author.id,
                username: work.author.username,
                displayName: work.author.displayName
            },
            status: work.status as any,
            collaborationMode: work.collaborationMode,
            progressPercentage: work.progressPercentage || 0,
            totalWords: work.totalWords || 0,
            totalCharacters: work.totalCharacters || 0,
            chapterCount: work.chapterCount || 0,
            targetWords: work.targetWords,
            isPublic: work.isPublic || false,
            createdAt: new Date(Number(work.createdAt)),
            updatedAt: new Date(Number(work.updatedAt)),
            publishedAt: work.publishedAt ? new Date(Number(work.publishedAt)) : undefined
        };
    }

    /**
     * 检查用户是否有访问作品的权限
     */
    private checkWorkAccess(work: any, userId: string): boolean {
        // 作者有完全访问权限
        if (work.authorId === userId) {
            return true;
        }

        // 检查是否是协作者（如果实现了协作功能）
        if (work.collaborators) {
            const collaborators = work.collaborators.split(',');
            return collaborators.includes(userId);
        }

        // 如果是公开作品，允许只读访问
        return work.isPublic;
    }

    /**
     * 计算写作天数
     */
    private calculateWritingDays(lastUpdated: Date): number {
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - lastUpdated.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    /**
     * 计算完成百分比
     */
    private calculateCompletionPercentage(currentWords: number, targetWords: number): number {
        if (targetWords <= 0) return 0;
        return Math.min(100, Math.round((currentWords / targetWords) * 100));
    }
}