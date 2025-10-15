import { RepositoryContainer } from '../repositories/RepositoryContainer';
import { getCurrentTimestamp } from '../utils/timestamp';
import { ulid } from 'ulid';

/**
 * 内容数据传输接口
 */
export interface CreateContentData {
  chapterId?: string;  // 可选：根目录内容没有 chapterId
  workId: string;      // 必需：所有内容都属于某个作品
  authorId: string;
  content: string;
  format: 'prosemirror' | 'markdown' | 'plain';
  title?: string;
}

export interface UpdateContentData {
  content?: string;
  format?: 'prosemirror' | 'markdown' | 'plain';
  title?: string;
  chapterId?: string;
  orderIndex?: number;
}

export interface ContentInfo {
  id: string;
  chapterId?: string;  // 可选：根目录内容没有 chapterId
  title?: string;
  content: string;
  format: 'prosemirror' | 'markdown' | 'plain';
  wordCount: number;
  characterCount: number;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface AutoSaveResult {
  success: boolean;
  contentId: string;
  savedAt: string;
  wordCount: number;
  characterCount: number;
  error?: string; // 可选的错误信息
}

/**
 * 内容服务接口
 */
export interface IContentService {
  createContent(authorId: string, contentData: CreateContentData): Promise<ContentInfo>;
  getContent(contentId: string, userId: string): Promise<ContentInfo | null>;
  getContentByChapter(chapterId: string, userId: string): Promise<ContentInfo[]>;
  getContentByWork(workId: string): Promise<ContentInfo[]>;
  updateContent(contentId: string, userId: string, updateData: UpdateContentData): Promise<ContentInfo>;
  autoSaveContent(contentId: string, userId: string, content: string): Promise<AutoSaveResult>;
  deleteContent(contentId: string, userId: string): Promise<boolean>;
  getContentHistory(contentId: string, userId: string): Promise<ContentInfo[]>;
}

/**
 * 内容服务实现
 */
export class ContentService implements IContentService {
  constructor(private repositories: RepositoryContainer) {}

  /**
   * 检查用户对作品的写权限
   */
  private async checkWorkWriteAccess(workId: string, userId: string): Promise<boolean> {
    const work = await this.repositories.workRepository.findById(workId);
    if (!work) {
      return false;
    }
    
    // 作者有写权限
    if (work.authorId === userId) {
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
   * 创建新内容
   */
  async createContent(authorId: string, contentData: CreateContentData): Promise<ContentInfo> {
    let workId = contentData.workId;
    
    // 如果提供了章节ID，验证章节是否存在
    if (contentData.chapterId) {
      const chapter = await this.repositories.chapterRepository.findById(contentData.chapterId);
      if (!chapter) {
        throw new Error('章节不存在');
      }

      // 验证用户权限
      if (chapter.authorId !== authorId) {
        throw new Error('没有权限在此章节创建内容');
      }
      
      // 从章节获取 workId（优先级高于传入的 workId）
      workId = chapter.workId;
    }
    
    // 确保有 workId
    if (!workId) {
      throw new Error('必须提供 workId 或 chapterId');
    }

    // 计算字数和字符数
    const { wordCount, characterCount } = this.calculateStats(contentData.content);

    // 创建内容数据 - 匹配 ContentData 接口
    const createData = {
      workId,
      chapterId: contentData.chapterId || undefined, // 根目录内容的 chapterId 为 undefined
      title: contentData.title,
      contentJson: contentData.format === 'prosemirror' ? contentData.content : '',
      contentHtml: contentData.format === 'markdown' ? contentData.content : '',
      authorId,
      type: contentData.format || 'prosemirror'
    };

    const createdContent = await this.repositories.contentRepository.create(createData);
    
    // 返回映射后的内容信息
    return this.mapToContentInfo(createdContent);
  }

  /**
   * 获取内容详情
   */
  async getContent(contentId: string, userId: string): Promise<ContentInfo | null> {
    const content = await this.repositories.contentRepository.findById(contentId);
    
    if (!content) {
      return null;
    }

    // 验证权限
    if (content.chapterId) {
      // 如果内容属于某个章节，验证章节权限
      const chapter = await this.repositories.chapterRepository.findById(content.chapterId);
      if (!chapter || !this.checkChapterAccess(chapter, userId)) {
        throw new Error('没有访问此内容的权限');
      }
    } else {
      // 如果是根级别内容，验证作品权限
      const work = await this.repositories.workRepository.findById(content.workId);
      if (!work || work.authorId !== userId) {
        throw new Error('没有访问此内容的权限');
      }
    }

    return this.mapToContentInfo(content);
  }

  /**
   * 获取章节的所有内容
   */
  async getContentByChapter(chapterId: string, userId: string): Promise<ContentInfo[]> {
    // 验证章节权限
    const chapter = await this.repositories.chapterRepository.findById(chapterId);
    if (!chapter || !this.checkChapterAccess(chapter, userId)) {
      throw new Error('没有访问此章节的权限');
    }

    const contents = await this.repositories.contentRepository.findByChapter(chapterId);
    return contents.map(content => this.mapToContentInfo(content));
  }

  /**
   * 获取作品的所有内容
   */
  async getContentByWork(workId: string): Promise<ContentInfo[]> {
    const contents = await this.repositories.contentRepository.findByWork(workId);
    return contents.map(content => this.mapToContentInfo(content));
  }

  /**
   * 更新内容
   */
  async updateContent(contentId: string, userId: string, updateData: UpdateContentData): Promise<ContentInfo> {
    const content = await this.repositories.contentRepository.findById(contentId);
    if (!content) {
      throw new Error('内容不存在');
    }

    // 验证权限 - 只有作者和协作者可以编辑
    if (content.chapterId) {
      // 如果内容属于某个章节,通过 workId 检查权限
      const chapter = await this.repositories.chapterRepository.findById(content.chapterId);
      if (!chapter) {
        throw new Error('章节不存在');
      }
      
      if (!(await this.checkWorkWriteAccess(chapter.workId, userId))) {
        throw new Error('没有权限编辑此内容');
      }
    } else {
      // 如果是根级别内容,验证作品权限
      if (!(await this.checkWorkWriteAccess(content.workId, userId))) {
        throw new Error('没有权限编辑此内容');
      }
    }

    // 如果更新了内容文本，重新计算统计信息
    let wordCount = content.wordCount;
    let characterCount = content.characterCount;
    
    // 准备要传递给Repository的数据
    const repositoryUpdateData: any = {};
    
    if (updateData.content) {
      const stats = this.calculateStats(updateData.content);
      wordCount = stats.wordCount;
      characterCount = stats.characterCount;
      
      // 根据格式设置正确的内容字段
      if (updateData.format === 'prosemirror' || !updateData.format) {
        repositoryUpdateData.contentJson = updateData.content;
      } else {
        repositoryUpdateData.contentHtml = updateData.content;
      }
    }
    
    if (updateData.title !== undefined) {
      repositoryUpdateData.title = updateData.title;
    }
    
    if (updateData.chapterId !== undefined) {
      repositoryUpdateData.chapterId = updateData.chapterId;
    }
    
    if (updateData.orderIndex !== undefined) {
      repositoryUpdateData.orderIndex = updateData.orderIndex;
    }

    // 确保 version 字段存在，提供更严格的默认值处理
    let currentVersion = 1; // 默认版本号
    if (content.version && typeof content.version === 'number' && !isNaN(content.version)) {
      currentVersion = content.version;
    } else if (content.versionNumber && typeof content.versionNumber === 'number' && !isNaN(content.versionNumber)) {
      currentVersion = content.versionNumber;
    }
    
    const updateDataWithStats = {
      ...repositoryUpdateData,
      wordCount,
      characterCount,
      version: currentVersion + 1,
      updatedAt: getCurrentTimestamp()
    };

    const updatedContent = await this.repositories.contentRepository.update(contentId, updateDataWithStats);
    return this.mapToContentInfo(updatedContent);
  }

  /**
   * 自动保存内容
   */
  async autoSaveContent(contentId: string, userId: string, content: string): Promise<AutoSaveResult> {
    try {
      console.log('🔧 自动保存调试:', { 
        contentId, 
        userId, 
        contentLength: content.length,
        contentPreview: content.substring(0, 100) 
      })

      const updateData = {
        content,
        format: 'prosemirror' as const, // 明确指定格式
        updatedAt: getCurrentTimestamp()
      };

      const updatedContent = await this.updateContent(contentId, userId, updateData);
      
      console.log('✅ 自动保存成功:', { contentId, wordCount: updatedContent.wordCount })
      
      return {
        success: true,
        contentId,
        savedAt: new Date().toISOString(),
        wordCount: updatedContent.wordCount,
        characterCount: updatedContent.characterCount
      };
    } catch (error) {
      console.error('❌ 自动保存失败:', { contentId, userId, error });
      return {
        success: false,
        contentId,
        savedAt: new Date().toISOString(),
        wordCount: 0,
        characterCount: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 删除内容
   */
  async deleteContent(contentId: string, userId: string): Promise<boolean> {
    const content = await this.repositories.contentRepository.findById(contentId);
    if (!content) {
      return false;
    }

    // 验证权限
    if (content.chapterId) {
      // 如果内容属于某个章节，验证章节权限
      const chapter = await this.repositories.chapterRepository.findById(content.chapterId);
      if (!chapter || !this.checkChapterAccess(chapter, userId)) {
        throw new Error('没有权限删除此内容');
      }
    } else {
      // 如果是根级别内容，验证作品权限
      const work = await this.repositories.workRepository.findById(content.workId);
      if (!work || work.authorId !== userId) {
        throw new Error('没有权限删除此内容');
      }
    }

    try {
      await this.repositories.contentRepository.delete(contentId);
      return true;
    } catch (error) {
      console.error('Delete content failed:', error);
      return false;
    }
  }

  /**
   * 获取内容历史版本
   */
  async getContentHistory(contentId: string, userId: string): Promise<ContentInfo[]> {
    const content = await this.repositories.contentRepository.findById(contentId);
    if (!content) {
      throw new Error('内容不存在');
    }

    // 验证权限
    const chapter = await this.repositories.chapterRepository.findById(content.chapterId);
    if (!chapter || !this.checkChapterAccess(chapter, userId)) {
      throw new Error('没有权限查看此内容历史');
    }

    // 这里简化处理，实际应该从版本表获取
    return [this.mapToContentInfo(content)];
  }

  /**
   * 检查章节访问权限
   */
  private checkChapterAccess(chapter: any, userId: string): boolean {
    return chapter.authorId === userId;
  }

  /**
   * 计算文本统计信息
   */
  private calculateStats(content: string): { wordCount: number; characterCount: number } {
    if (!content) {
      return { wordCount: 0, characterCount: 0 };
    }

    // 移除HTML标签和ProseMirror格式
    const plainText = content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    
    // 字符数
    const characterCount = plainText.length;
    
    // 字数计算（中英文混合）
    const chineseChars = (plainText.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (plainText.match(/[a-zA-Z]+/g) || []).length;
    const wordCount = chineseChars + englishWords;

    return { wordCount, characterCount };
  }

  /**
   * 将数据库内容对象映射为内容信息对象
   */
  private mapToContentInfo(content: any): ContentInfo {
    // 根据存储格式获取内容文本
    let contentText = '';
    if (content.contentJson) {
      contentText = content.contentJson;
    } else if (content.contentHtml) {
      contentText = content.contentHtml;
    } else if (content.contentText) {
      contentText = content.contentText;
    }

    return {
      id: content.id,
      chapterId: content.chapterId,
      title: content.title,
      content: contentText,
      format: content.type || 'prosemirror',
      wordCount: content.wordCount || 0,
      characterCount: content.characterCount || 0,
      authorId: content.authorId,
      createdAt: new Date(Number(content.createdAt)).toISOString(),
      updatedAt: new Date(Number(content.updatedAt)).toISOString(),
      version: content.version || 1
    };
  }
}
