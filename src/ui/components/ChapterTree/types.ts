/**
 * ChapterTree 组件类型定义
 * 
 * 该模块定义了章节树组件使用的所有类型和接口
 */

import type { Content } from '../../types/models'

/**
 * 章节类型
 */
export interface ChapterLocal {
  /** 章节唯一标识符 */
  id: string
  /** 章节标题 */
  title: string
  /** 父章节ID (可选，根章节为 undefined) */
  parentId?: string
  /** 排序索引 */
  orderIndex: number
  /** 层级深度 (0=根章节, 1=一级子章节, 2=二级子章节, 3=三级子章节) */
  level: number
  /** 章节类型 */
  type?: 'chapter' | 'volume' | 'section'
  /** 字符数统计 */
  characterCount?: number
  /** 内容数量 */
  contentCount?: number
  /** 子章节数量 */
  childChapterCount?: number
  /** 作品ID */
  workId: string
  /** 作者ID */
  authorId?: string
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
}

/**
 * 章节树事件类型
 */
export interface ChapterTreeEvents {
  /** 切换章节展开/折叠 */
  'chapter-toggle': (chapterId: string) => void
  /** 选择章节 */
  'chapter-select': (chapterId: string) => void
  /** 编辑章节 */
  'chapter-edit': (chapter: ChapterLocal) => void
  /** 删除章节 */
  'chapter-delete': (chapterId: string) => void
  /** 添加根章节 */
  'add-chapter': () => void
  /** 添加子章节 */
  'add-sub-chapter': (parentId: string) => void
  /** 添加内容 */
  'add-content': (data: { chapterId?: string }) => void
  /** 选择内容 */
  'content-select': (contentId: string) => void
  /** 编辑内容 */
  'content-edit': (content: Content) => void
  /** 删除内容 */
  'content-delete': (contentId: string) => void
  /** 章节重新排序 */
  'chapters-reorder': (chapters: Array<{ id: string; parentId?: string; orderIndex: number; level: number }>) => void
  /** 内容重新排序 */
  'contents-reorder': (contents: Array<{ id: string; chapterId?: string; orderIndex: number }>) => void
  /** 拖拽错误 */
  'drag-error': (message: string) => void
}

/**
 * 拖拽移动验证结果
 */
export interface MoveValidation {
  /** 是否允许移动 */
  allowed: boolean
  /** 错误信息 (如果不允许移动) */
  error?: string
}

/**
 * 拖拽事件类型
 */
export interface DragEvent {
  /** 被拖拽的元素 */
  dragged: ChapterLocal | Content
  /** 目标位置的元素 */
  related: ChapterLocal | Content
  /** 相对位置 */
  relatedPosition: 'before' | 'after' | 'inside'
}

/**
 * 内容重导出
 */
export type { Content }
