import { RepositoryContainer } from '../data/RepositoryContainer';
import { getCurrentTimestamp } from '../utils/timestamp';
import { ulid } from 'ulid';

/**
 * 内容数据传输接口
 */
export interface CreateContentData {
  chapterId: string;
  authorId: string;
  content: string;
  format: 'prosemirror' | 'markdown' | 'plain';
  title?: string;
}

export interface UpdateContentData {
  content?: string;
  format?: 'prosemirror' | 'markdown' | 'plain';
  title?: string;
}

export interface ContentInfo {
  id: string;
  chapterId: string;
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
}

/**
 * 内容服务接口
 */
export interface IContentService {
  createContent(authorId: string, contentData: CreateContentData): Promise<ContentInfo>;
  getContent(contentId: string, userId: string): Promise<ContentInfo | null>;
  getContentByChapter(chapterId: string, userId: string): Promise<ContentInfo[]>;
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
   * 创建新内容
   */
  async createContent(authorId: string, contentData: CreateContentData): Promise<ContentInfo> {
    // 验证章节是否存在
    const chapter = await this.repositories.chapterRepository.findById(contentData.chapterId);
    if (!chapter) {
      throw new Error('章节不存在');
    }

    // 验证用户权限
    if (chapter.authorId !== authorId) {
      throw new Error('没有权限在此章节创建内容');
    }

    // 计算字数和字符数
    const { wordCount, characterCount } = this.calculateStats(contentData.content);

    // 创建内容数据 - 匹配 ContentData 接口
    const createData = {
      workId: chapter.workId, // 从章节获取 workId
      chapterId: contentData.chapterId,
      title: contentData.title,
      contentJson: contentData.format === 'prosemirror' ? contentData.content : '',
      contentHtml: contentData.format === 'markdown' ? contentData.content : '',
      authorId,
      type: contentData.format || 'prosemirror'
    };

    const createdContent = await this.repositories.contentRepository.create(createData);
    
    // 手动添加统计信息，因为 Repository 可能不会自动计算
    return {
      ...this.mapToContentInfo(createdContent),
      wordCount,
      characterCount,
      content: contentData.content,
      format: contentData.format as 'prosemirror' | 'markdown' | 'plain'
    };
  }

  /**
   * 获取内容详情
   */
  async getContent(contentId: string, userId: string): Promise<ContentInfo | null> {
    const content = await this.repositories.contentRepository.findById(contentId);
    
    if (!content) {
      return null;
    }

    // 验证权限 - 获取章节信息
    const chapter = await this.repositories.chapterRepository.findById(content.chapterId);
    if (!chapter || !this.checkChapterAccess(chapter, userId)) {
      throw new Error('没有访问此内容的权限');
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
   * 更新内容
   */
  async updateContent(contentId: string, userId: string, updateData: UpdateContentData): Promise<ContentInfo> {
    const content = await this.repositories.contentRepository.findById(contentId);
    if (!content) {
      throw new Error('内容不存在');
    }

    // 验证权限
    const chapter = await this.repositories.chapterRepository.findById(content.chapterId);
    if (!chapter || !this.checkChapterAccess(chapter, userId)) {
      throw new Error('没有权限编辑此内容');
    }

    // 如果更新了内容文本，重新计算统计信息
    let wordCount = content.wordCount;
    let characterCount = content.characterCount;
    
    if (updateData.content) {
      const stats = this.calculateStats(updateData.content);
      wordCount = stats.wordCount;
      characterCount = stats.characterCount;
    }

    const updateDataWithStats = {
      ...updateData,
      wordCount,
      characterCount,
      version: content.version + 1,
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
      const updateData = {
        content,
        updatedAt: getCurrentTimestamp()
      };

      const updatedContent = await this.updateContent(contentId, userId, updateData);
      
      return {
        success: true,
        contentId,
        savedAt: new Date().toISOString(),
        wordCount: updatedContent.wordCount,
        characterCount: updatedContent.characterCount
      };
    } catch (error) {
      console.error('Auto save failed:', error);
      return {
        success: false,
        contentId,
        savedAt: new Date().toISOString(),
        wordCount: 0,
        characterCount: 0
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
    const chapter = await this.repositories.chapterRepository.findById(content.chapterId);
    if (!chapter || !this.checkChapterAccess(chapter, userId)) {
      throw new Error('没有权限删除此内容');
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
    return {
      id: content.id,
      chapterId: content.chapterId,
      title: content.title,
      content: content.content,
      format: content.format || 'prosemirror',
      wordCount: content.wordCount || 0,
      characterCount: content.characterCount || 0,
      authorId: content.authorId,
      createdAt: new Date(Number(content.createdAt)).toISOString(),
      updatedAt: new Date(Number(content.updatedAt)).toISOString(),
      version: content.version || 1
    };
  }
}
