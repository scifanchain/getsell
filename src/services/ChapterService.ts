import { RepositoryContainer } from '../repositories/RepositoryContainer';
import { ulid } from 'ulid';

/**
 * 章节数据传输接口
 */
export interface CreateChapterData {
  workId: string;
  title: string;
  parentId?: string;
  orderIndex?: number;
  subtitle?: string;
  description?: string;
  type?: 'chapter' | 'volume' | 'section';
  authorId: string;
}

export interface UpdateChapterData {
  title?: string;
  subtitle?: string;
  description?: string;
  orderIndex?: number;
  type?: 'chapter' | 'volume' | 'section';
}

export interface ChapterInfo {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  workId: string;
  parentId?: string;
  orderIndex: number;
  level: number;
  type: 'chapter' | 'volume' | 'section';
  authorId: string;
  characterCount: number;
  contentCount: number;
  childChapterCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 章节服务接口
 */
export interface IChapterService {
  createChapter(authorId: string, chapterData: CreateChapterData): Promise<ChapterInfo>;
  getChapter(chapterId: string, userId?: string): Promise<ChapterInfo | null>;
  getChaptersByWork(workId: string, userId?: string): Promise<ChapterInfo[]>;
  updateChapter(chapterId: string, userId: string, updateData: UpdateChapterData): Promise<ChapterInfo>;
  deleteChapter(chapterId: string, userId: string): Promise<void>;
  reorderChapters(workId: string, userId: string, chapterOrders: { chapterId: string; orderIndex: number }[]): Promise<void>;
}

/**
 * 章节服务实现
 * 处理章节相关的业务逻辑
 */
export class ChapterService implements IChapterService {
    constructor(private repositories: RepositoryContainer) {}

    /**
     * 检查用户对作品的写权限
     */
    private async checkWorkWriteAccess(workId: string, userId: string): Promise<boolean> {
        console.log('🔐 checkWorkWriteAccess 被调用:', { workId, userId });
        const work = await this.repositories.workRepository.findById(workId);
        console.log('🔐 查找作品结果:', { work, hasWork: !!work, authorId: work?.authorId });
        if (!work) {
            console.log('❌ 作品不存在');
            return false;
        }
        
        // 作者有写权限
        if (work.authorId === userId) {
            console.log('✅ 用户是作品作者，有写权限');
            return true;
        }
        
        // 协作者有写权限
        if (work.collaborators) {
            const collaborators = work.collaborators.split(',');
            return collaborators.includes(userId);
        }
        
        return false;
    }

    /**
     * 创建新章节
     * 章节层级限制:最多支持3层 (1. 卷 -> 2. 章 -> 3. 节)
     */
    async createChapter(authorId: string, chapterData: CreateChapterData): Promise<ChapterInfo> {
        console.log('📝 ChapterService.createChapter 被调用:', {
            authorId,
            chapterData,
            hasWorkId: !!chapterData.workId,
            workId: chapterData.workId
        });
        
        // 验证作品是否存在且用户有权限
        const work = await this.repositories.workRepository.findById(chapterData.workId);
        console.log('📝 查找作品结果:', { work, hasWork: !!work });
        if (!work) {
            throw new Error('作品不存在');
        }

        // 只有作者和协作者可以创建章节
        if (!(await this.checkWorkWriteAccess(chapterData.workId, authorId))) {
            throw new Error('没有权限在此作品中创建章节');
        }

        // 如果指定了父章节，验证父章节是否存在
        if (chapterData.parentId) {
            const parentChapter = await this.repositories.chapterRepository.findById(chapterData.parentId);
            if (!parentChapter || parentChapter.workId !== chapterData.workId) {
                throw new Error('指定的父章节不存在或不属于此作品');
            }
        }

        // 如果没有指定顺序，设置为最后
        let orderIndex = chapterData.orderIndex;
        if (orderIndex === undefined) {
            const siblings = chapterData.parentId 
                ? await this.repositories.chapterRepository.findChildren(chapterData.parentId)
                : await this.repositories.chapterRepository.findByWork(chapterData.workId, false);
            orderIndex = siblings.length;
        }

        // 创建章节数据（不包含 id，由 repository 自动生成）
        const createData = {
            title: chapterData.title,
            subtitle: chapterData.subtitle,
            description: chapterData.description,
            workId: chapterData.workId,
            parentId: chapterData.parentId,
            orderIndex: orderIndex,
            type: chapterData.type || 'chapter',
            authorId: authorId
        };
        
        console.log('📝 准备创建章节，数据:', createData);

        const createdChapter = await this.repositories.chapterRepository.create(createData);
        return this.mapToChapterInfo(createdChapter);
    }

    /**
     * 获取章节详情（查看不需要登录）
     */
    async getChapter(chapterId: string, userId?: string): Promise<ChapterInfo | null> {
        const chapter = await this.repositories.chapterRepository.findById(chapterId);
        
        if (!chapter) {
            return null;
        }

        // 查看章节不需要权限检查
        return this.mapToChapterInfo(chapter);
    }

    /**
     * 获取作品的章节列表（查看不需要登录）
     */
    async getChaptersByWork(workId: string, userId?: string): Promise<ChapterInfo[]> {
        // 所有用户都可以查看章节列表(只读)
        // 验证作品是否存在
        const work = await this.repositories.workRepository.findById(workId);
        if (!work) {
            throw new Error('作品不存在');
        }

        // 不检查权限 - 所有用户可以查看章节

        const chapters = await this.repositories.chapterRepository.findByWork(workId);
        return chapters.map(chapter => this.mapToChapterInfo(chapter));
    }

    /**
     * 更新章节
     */
    async updateChapter(chapterId: string, userId: string, updateData: UpdateChapterData): Promise<ChapterInfo> {
        const chapter = await this.repositories.chapterRepository.findById(chapterId);
        
        if (!chapter) {
            throw new Error('章节不存在');
        }

        // 检查用户权限
        if (!await this.checkChapterAccess(chapter, userId)) {
            throw new Error('没有权限修改此章节');
        }

        const updatedChapter = await this.repositories.chapterRepository.update(chapterId, updateData);
        return this.mapToChapterInfo(updatedChapter);
    }

    /**
     * 删除章节
     */
    async deleteChapter(chapterId: string, userId: string): Promise<void> {
        const chapter = await this.repositories.chapterRepository.findById(chapterId);
        
        if (!chapter) {
            throw new Error('章节不存在');
        }

        // 检查用户权限
        if (!await this.checkChapterAccess(chapter, userId)) {
            throw new Error('没有权限删除此章节');
        }

        // 检查是否有子章节
        const childChapters = await this.repositories.chapterRepository.findChildren(chapterId);
        if (childChapters.length > 0) {
            throw new Error('不能删除包含子章节的章节，请先删除或移动子章节');
        }

        await this.repositories.chapterRepository.delete(chapterId);
    }

    /**
     * 重新排序章节
     */
    async reorderChapters(workId: string, userId: string, chapterOrders: { chapterId: string; orderIndex: number }[]): Promise<void> {
        // 验证作品权限
        const work = await this.repositories.workRepository.findById(workId);
        if (!work) {
            throw new Error('作品不存在');
        }

        if (work.authorId !== userId) {
            throw new Error('没有权限重新排序此作品的章节');
        }

        // 批量更新章节顺序
        for (const order of chapterOrders) {
            await this.repositories.chapterRepository.update(order.chapterId, {
                orderIndex: order.orderIndex
            });
        }
    }

    /**
     * 检查章节访问权限
     */
    private async checkChapterAccess(chapter: any, userId: string): Promise<boolean> {
        const work = await this.repositories.workRepository.findById(chapter.workId);
        if (!work) {
            return false;
        }

        // 检查是否是作者或协作者
        return work.authorId === userId;
        // TODO: 添加协作者权限检查
    }

    /**
     * 映射数据库章节对象到 ChapterInfo
     */
    private mapToChapterInfo(chapter: any): ChapterInfo {
        const formatDate = (date: any): string => {
            if (!date) return new Date().toISOString();
            if (date instanceof Date) return date.toISOString();
            if (typeof date === 'string') return new Date(date).toISOString();
            if (typeof date === 'number') return new Date(date).toISOString();
            return new Date().toISOString();
        };

        return {
            id: chapter.id,
            title: chapter.title,
            subtitle: chapter.subtitle,
            description: chapter.description,
            workId: chapter.workId,
            parentId: chapter.parentId,
            orderIndex: chapter.orderIndex || 0,
            level: chapter.level || 1,
            type: chapter.type || 'chapter',
            authorId: chapter.authorId,
            characterCount: chapter.characterCount || 0,
            contentCount: chapter.contentCount || 0,
            childChapterCount: chapter.childChapterCount || 0,
            createdAt: formatDate(chapter.createdAt),
            updatedAt: formatDate(chapter.updatedAt)
        };
    }
}