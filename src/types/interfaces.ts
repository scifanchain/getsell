// IPC通信接口定义
export interface IPCResponse<T = any> {
  success: boolean;
  error?: string;
  data?: T;
}

// 用户相关接口
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

// 项目/作品相关接口
export interface ProjectData {
  title: string;
  description?: string;
  genre?: string;
  authorId?: string;
  collaborationMode?: 'solo' | 'collaborative';
}

export interface Project {
  id: string;
  title: string;
  description?: string | null;
  genre?: string | null;
  author_id: string;
  collaboration_mode: string;
  status: string;
  created_at: number;
  updated_at: number;
  chapter_count: number;
  content_count: number;
}

// 章节相关接口
export interface ChapterData {
  projectId: string;
  title: string;
  parentId?: string;
  orderIndex?: number;
  subtitle?: string;
  description?: string;
  type?: 'chapter' | 'section' | 'scene';
  authorId?: string;
}

export interface Chapter {
  id: string;
  project_id: string;
  work_id: string;
  parent_id?: string | null;
  level: number;
  order_index: number;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  type: string;
  status: string;
  word_count: number;
  character_count: number;
  content_count: number;
  child_chapter_count: number;
  author_id: string;
  created_at: number;
  updated_at: number;
}

// 内容相关接口
export interface ContentData {
  projectId?: string;
  workId?: string;
  chapterId?: string;
  title?: string;
  type?: 'text' | 'image' | 'video';
  contentDelta?: string;
  contentHtml?: string;
  orderIndex?: number;
  authorId?: string;
}

export interface Content {
  id: string;
  work_id: string;
  chapter_id?: string;
  title?: string;
  type: string;
  content_delta: string;
  content_html: string;
  content_text: string;
  word_count: number;
  character_count: number;
  paragraph_count: number;
  order_index: number;
  status: string;
  version: number;
  author_id: string;
  created_at: number;
  updated_at: number;
}

// 统计信息接口
export interface SystemStats {
  authors: number;
  works: number;
  chapters: number;
  contents: number;
  characters: number;
  worldbuilding: number;
  chapter_levels: Record<string, number>;
  content_stats: {
    total_words: number;
    total_characters: number;
    total_contents: number;
  };
}

// 窗口控制接口
export interface WindowResponse {
  success: boolean;
  error?: string;
}

// 加密相关接口
export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

// 数据库相关接口
export interface DatabaseStats extends SystemStats {}