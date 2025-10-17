/**
 * 数据验证器
 * 提供应用层的数据验证功能
 */

// ============================================
// 协作模式验证
// ============================================

/**
 * 协作模式枚举
 * - private: 作品私有,不协作
 * - team: 只有固定的team成员可以协作
 * - public: 开放给所有人协作
 */
export const COLLABORATION_MODES = ['private', 'team', 'public'] as const;

export type CollaborationMode = typeof COLLABORATION_MODES[number];

/**
 * 检查是否为有效的协作模式
 */
export function isValidCollaborationMode(mode: string): mode is CollaborationMode {
  return COLLABORATION_MODES.includes(mode as CollaborationMode);
}

/**
 * 验证并返回协作模式,无效时返回默认值
 */
export function validateCollaborationMode(mode?: string): CollaborationMode {
  if (!mode) return 'private';
  if (!isValidCollaborationMode(mode)) {
    console.warn(`无效的协作模式: ${mode}. 使用默认值 'private'`);
    return 'private';
  }
  return mode;
}

/**
 * 获取协作模式的中文描述
 */
export function getCollaborationModeLabel(mode: CollaborationMode): string {
  const labels: Record<CollaborationMode, string> = {
    private: '私有创作',
    team: '团队协作',
    public: '公开协作'
  };
  return labels[mode];
}

/**
 * 获取协作模式的详细说明
 */
export function getCollaborationModeDescription(mode: CollaborationMode): string {
  const descriptions: Record<CollaborationMode, string> = {
    private: '仅作者本人可编辑,不与他人协作',
    team: '仅指定的团队成员可以协同编辑',
    public: '开放给所有用户,任何人都可以参与编辑'
  };
  return descriptions[mode];
}

// ============================================
// 作品状态验证
// ============================================

export const WORK_STATUSES = ['draft', 'published', 'archived'] as const;
export type WorkStatus = typeof WORK_STATUSES[number];

export function isValidWorkStatus(status: string): status is WorkStatus {
  return WORK_STATUSES.includes(status as WorkStatus);
}

export function validateWorkStatus(status?: string): WorkStatus {
  if (!status) return 'draft';
  if (!isValidWorkStatus(status)) {
    console.warn(`无效的作品状态: ${status}. 使用默认值 'draft'`);
    return 'draft';
  }
  return status;
}

// ============================================
// 章节类型验证
// ============================================

export const CHAPTER_TYPES = ['chapter', 'volume', 'section'] as const;
export type ChapterType = typeof CHAPTER_TYPES[number];

export function isValidChapterType(type: string): type is ChapterType {
  return CHAPTER_TYPES.includes(type as ChapterType);
}

export function validateChapterType(type?: string): ChapterType {
  if (!type) return 'chapter';
  if (!isValidChapterType(type)) {
    console.warn(`无效的章节类型: ${type}. 使用默认值 'chapter'`);
    return 'chapter';
  }
  return type;
}

// ============================================
// 内容类型验证
// ============================================

export const CONTENT_TYPES = ['text', 'dialogue', 'scene', 'note'] as const;
export type ContentType = typeof CONTENT_TYPES[number];

export function isValidContentType(type: string): type is ContentType {
  return CONTENT_TYPES.includes(type as ContentType);
}

export function validateContentType(type?: string): ContentType {
  if (!type) return 'text';
  if (!isValidContentType(type)) {
    console.warn(`无效的内容类型: ${type}. 使用默认值 'text'`);
    return 'text';
  }
  return type;
}
