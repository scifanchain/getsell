/**
 * 共享类型定义 - 主进程和渲染进程都可以使用
 */

// IPC通信接口定义
export interface IPCResponse<T = any> {
  success: boolean;
  error?: string;
  data?: T;
}

// 用户相关接口
export interface User {
  id: string
  name: string
  email: string
  createdAt: string
  updatedAt: string
}

export interface UserData {
  username: string;
  email: string;
  password: string;
  displayName?: string;
  bio?: string;
}

export interface UserCreateResponse {
  userId: string;
  publicKey: string;
}

// 作品相关接口
export interface Work {
  id: string
  title: string
  description?: string
  authorId: string
  genre?: string
  collaborationMode?: string
  createdAt: string
  updatedAt: string
  chapters?: Chapter[]
}

export interface WorkData {
  title: string;
  description?: string;
  authorId: string;
  genre?: string;
  collaborationMode?: string;
}

// 章节相关接口
export interface Chapter {
  id: string
  title: string
  content?: string
  workId: string
  orderIndex: number
  parentId?: string
  subtitle?: string
  description?: string
  type?: 'chapter' | 'volume' | 'section'
  authorId?: string
  createdAt: string
  updatedAt: string
}

export interface ChapterData {
  title: string;
  content?: string;
  workId: string;
  orderIndex: number;
  parentId?: string;
  subtitle?: string;
  description?: string;
  type?: 'chapter' | 'volume' | 'section';
  authorId?: string;
}

// 内容相关接口
export interface Content {
  id: string;
  title: string;
  content: string;
  chapterId: string;
  orderIndex: number;
  tags?: string[];
  workId: string;
  type?: string;
  contentJson?: string;  // ProseMirror 文档的 JSON 表示
  contentHtml?: string;  // HTML 表示
  authorId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContentData {
  title: string;
  content: string;
  chapterId: string;
  orderIndex: number;
  tags?: string[];
  workId: string;
  type?: string;
  contentJson?: string;  // ProseMirror 文档的 JSON 表示
  contentHtml?: string;  // HTML 表示
  authorId?: string;
}

// 系统统计接口
export interface SystemStats {
  users: number
  works: number
  chapters: number
  storage: {
    used: number
    total: number
  }
}

// 窗口相关接口
export interface WindowResponse {
  success: boolean;
  error?: string;
}

// 密钥对接口
export interface KeyPair {
  publicKey: string;
  privateKey: string;
}