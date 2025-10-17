/**
 * 共享类型定义 - 主进程和渲染进程都可以使用
 * 
 * 架构说明:
 * - 数据库实体类型统一从 schema.ts 导出
 * - 此文件仅保留 IPC 接口、响应类型和输入数据类型
 */

// ============================================
// 从 schema.ts 重新导出数据库实体类型
// ============================================
export type {
  // Read 类型（查询返回）
  Author,
  Work,
  Chapter,
  Content,
  ContentVersion,
  CollaborativeDocument,
  // Create 类型（插入数据）
  NewAuthor,
  NewWork,
  NewChapter,
  NewContent,
  NewContentVersion,
  NewCollaborativeDocument,
  // Update 类型（部分更新）
  UpdateAuthor,
  UpdateWork,
  UpdateChapter,
  UpdateContent,
  // Delete 类型（删除条件）
  DeleteAuthor,
  DeleteWork,
  DeleteChapter,
  DeleteContent,
  DeleteContentVersion,
  DeleteCollaborativeDocument,
} from '../db/schema';

// ============================================
// IPC 通信接口
// ============================================
export interface IPCResponse<T = any> {
  success: boolean;
  error?: string;
  data?: T;
}

// ============================================
// 输入数据类型（简化版，用于 IPC 传输）
// ============================================
export interface AuthorData {
  username: string;
  email: string;
  password: string;
  displayName?: string;
  bio?: string;
}

export interface WorkData {
  title: string;
  description?: string;
  authorId: string;
  genre?: string;
  collaborationMode?: string;
}

export interface ChapterData {
  title: string;
  workId: string;
  orderIndex: number;
  parentId?: string;
  subtitle?: string;
  description?: string;
  type?: 'chapter' | 'volume' | 'section';
  authorId?: string;
}

export interface ContentData {
  title: string;
  chapterId: string;
  orderIndex: number;
  workId: string;
  type?: string;
  contentJson?: string;
  authorId?: string;
}

// ============================================
// 特殊响应类型
// ============================================
export interface AuthorCreateResponse {
  authorId: string;
  publicKey: string;
}

export interface WindowResponse {
  success: boolean;
  error?: string;
}

// ============================================
// 通用类型
// ============================================
export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export interface SystemStats {
  authors: number;
  works: number;
  chapters: number;
  storage: {
    used: number;
    total: number;
  };
}

export interface PaginationOptions {
  skip?: number;
  take?: number;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}