const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { ulid } = require('ulid');

/**
 * Gestell 数据库管理器
 * 为去中心化科幻写作软件提供数据存储
 */
class GestallDatabase {
    constructor(dbPath = null) {
        // 默认数据库路径
        this.dbPath = dbPath || path.join(__dirname, '../../data/gestell.db');
        
        // 确保数据目录存在
        const dataDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // 初始化数据库连接
        this.db = new Database(this.dbPath);
        this.db.pragma('journal_mode = WAL'); // 提升并发性能
        this.db.pragma('synchronous = NORMAL'); // 平衡性能和安全
        this.db.pragma('cache_size = 1000000'); // 1GB缓存
        this.db.pragma('temp_store = MEMORY'); // 临时数据存内存
        
        // 检查和执行数据库迁移
        this.checkAndMigrate();
        
        // 初始化数据表
        this.initTables();
        
        // 确保默认用户存在
        this.createDefaultUser();
        
        console.log('🗄️ Gestell数据库初始化成功:', this.dbPath);
    }

    /**
     * 检查和执行数据库迁移
     */
    checkAndMigrate() {
        // 创建版本管理表
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS schema_version (
                version INTEGER PRIMARY KEY,
                applied_at INTEGER NOT NULL
            )
        `);

        // 获取当前数据库版本
        const currentVersion = this.getCurrentSchemaVersion();
        const targetVersion = 2; // 新的数据库版本

        console.log(`📊 数据库版本检查: 当前版本 ${currentVersion}, 目标版本 ${targetVersion}`);

        if (currentVersion < targetVersion) {
            console.log('🔄 开始数据库迁移...');
            this.migrateToVersion2();
            this.setSchemaVersion(targetVersion);
            console.log('✅ 数据库迁移完成');
        }
    }

    /**
     * 获取当前数据库版本
     */
    getCurrentSchemaVersion() {
        try {
            const result = this.db.prepare('SELECT MAX(version) as version FROM schema_version').get();
            return result?.version || 1;
        } catch (error) {
            return 1; // 默认版本1
        }
    }

    /**
     * 设置数据库版本
     */
    setSchemaVersion(version) {
        this.db.prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)').run(version, Date.now());
    }

    /**
     * 迁移到版本2 - 重构章节和内容结构
     */
    migrateToVersion2() {
        try {
            // 检查旧的章节表是否存在
            const tablesInfo = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='chapters'").get();
            
            if (tablesInfo) {
                console.log('📦 备份现有数据...');
                
                // 备份现有章节数据（如果有）
                try {
                    const oldChapters = this.db.prepare('SELECT * FROM chapters').all();
                    
                    // 重命名旧表
                    this.db.exec('ALTER TABLE chapters RENAME TO chapters_backup');
                    
                    // 创建新的章节表
                    this.createNewChaptersTable();
                    
                    // 迁移数据
                    this.migrateChapterData(oldChapters);
                    
                    console.log(`✅ 迁移了 ${oldChapters.length} 个章节记录`);
                } catch (error) {
                    console.warn('章节数据迁移失败:', error.message);
                    // 如果迁移失败，删除备份表，重新创建
                    try {
                        this.db.exec('DROP TABLE IF EXISTS chapters_backup');
                        this.createNewChaptersTable();
                    } catch (e) {
                        console.error('创建新章节表失败:', e.message);
                    }
                }
            } else {
                // 没有旧表，直接创建新表
                this.createNewChaptersTable();
            }

            // 创建新的内容表
            this.createContentsTable();
            
            // 创建默认用户（如果不存在）
            this.createDefaultUser();
            
        } catch (error) {
            console.error('数据库迁移失败:', error);
            throw error;
        }
    }

    /**
     * 创建新的章节表
     */
    createNewChaptersTable() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS chapters (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                title TEXT NOT NULL,
                parent_id TEXT, -- 父章节ID，NULL表示根级章节
                level INTEGER NOT NULL DEFAULT 1, -- 章节层级：1-3
                order_index INTEGER NOT NULL, -- 在同级中的排序
                description TEXT, -- 章节描述
                status TEXT DEFAULT 'draft', -- draft, completed, archived
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects (id),
                FOREIGN KEY (parent_id) REFERENCES chapters (id),
                CONSTRAINT level_check CHECK (level BETWEEN 1 AND 3),
                CONSTRAINT parent_level_check CHECK (
                    (level = 1 AND parent_id IS NULL) OR
                    (level > 1 AND parent_id IS NOT NULL)
                )
            )
        `);
    }

    /**
     * 创建内容表
     */
    createContentsTable() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS contents (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                chapter_id TEXT, -- 所属章节ID，NULL表示属于作品根节点
                title TEXT NOT NULL,
                content_delta TEXT, -- Quill Delta格式内容
                content_html TEXT, -- 渲染后的HTML
                content_text TEXT, -- 纯文本内容（用于搜索）
                word_count INTEGER DEFAULT 0,
                character_count INTEGER DEFAULT 0,
                order_index INTEGER NOT NULL, -- 在同级中的排序
                tags TEXT, -- JSON格式标签
                notes TEXT, -- 作者备注
                blockchain_hash TEXT,
                version INTEGER DEFAULT 1,
                status TEXT DEFAULT 'draft', -- draft, published, archived
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects (id),
                FOREIGN KEY (chapter_id) REFERENCES chapters (id)
            )
        `);
    }

    /**
     * 迁移章节数据
     */
    migrateChapterData(oldChapters) {
        const insertChapter = this.db.prepare(`
            INSERT INTO chapters (id, project_id, title, parent_id, level, order_index, description, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertContent = this.db.prepare(`
            INSERT INTO contents (id, project_id, chapter_id, title, content_delta, content_html, content_text, word_count, character_count, order_index, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        oldChapters.forEach((chapter, index) => {
            // 将旧章节作为新的章节（只保留目录功能）
            insertChapter.run(
                chapter.id,
                chapter.project_id,
                chapter.title,
                null, // 所有旧章节都作为根级章节
                1, // 层级1
                index, // 使用索引作为排序
                null, // 描述
                chapter.status || 'draft',
                chapter.created_at,
                chapter.updated_at
            );

            // 如果章节有内容，转换为内容记录
            if (chapter.content_delta || chapter.content_html) {
                const contentId = this.generateId();
                const contentText = this.extractTextFromDelta(chapter.content_delta);
                
                insertContent.run(
                    contentId,
                    chapter.project_id,
                    chapter.id, // 关联到对应的章节
                    `${chapter.title} - 内容`, // 内容标题
                    chapter.content_delta || '',
                    chapter.content_html || '',
                    contentText,
                    chapter.word_count || this.countWords(contentText),
                    chapter.character_count || contentText.length,
                    0, // 排序
                    chapter.status || 'draft',
                    chapter.created_at,
                    chapter.updated_at
                );
            }
        });
    }

    /**
     * 初始化数据库表结构
     */
    /**
     * 初始化数据库表结构
     */
    initTables() {
        // 用户表
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE,
                password_hash TEXT NOT NULL,
                public_key TEXT,
                private_key_encrypted TEXT,
                profile_data TEXT, -- JSON格式用户资料
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )
        `);

        // 作品项目表
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                genre TEXT, -- 科幻子类型
                author_id TEXT NOT NULL,
                collaboration_mode TEXT DEFAULT 'private', -- private, public, invite
                metadata TEXT, -- JSON格式元数据
                blockchain_hash TEXT, -- 区块链哈希
                status TEXT DEFAULT 'draft', -- draft, published, archived
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY (author_id) REFERENCES users (id)
            )
        `);

        // 章节表和内容表在迁移中已处理
        // 这里确保表存在（如果是全新数据库）
        this.createNewChaptersTable();
        this.createContentsTable();

        // 内容版本历史表
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS content_versions (
                id TEXT PRIMARY KEY,
                content_id TEXT NOT NULL,
                content_delta TEXT NOT NULL,
                content_html TEXT,
                content_text TEXT,
                word_count INTEGER DEFAULT 0,
                character_count INTEGER DEFAULT 0,
                version_number INTEGER NOT NULL,
                change_summary TEXT,
                author_id TEXT NOT NULL,
                blockchain_hash TEXT,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (content_id) REFERENCES contents (id),
                FOREIGN KEY (author_id) REFERENCES users (id)
            )
        `);

        // 角色表
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS characters (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                appearance TEXT,
                personality TEXT,
                background TEXT,
                relationships TEXT,
                image_url TEXT,
                tags TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects (id)
            )
        `);

        // 世界观设定表
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS worldbuilding (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                category TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                details TEXT,
                references_data TEXT,
                tags TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects (id)
            )
        `);

        // 区块链同步记录表
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS blockchain_sync (
                id TEXT PRIMARY KEY,
                content_id TEXT NOT NULL, -- 关联的内容ID
                content_type TEXT NOT NULL, -- project, chapter, character, etc.
                blockchain_hash TEXT NOT NULL,
                transaction_hash TEXT,
                block_number INTEGER,
                sync_status TEXT DEFAULT 'pending', -- pending, confirmed, failed
                sync_data TEXT, -- JSON格式同步数据
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )
        `);

        // 协作日志表
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS collaboration_logs (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                action TEXT NOT NULL, -- create, edit, delete, comment, etc.
                target_type TEXT NOT NULL, -- chapter, character, worldbuilding
                target_id TEXT NOT NULL,
                changes TEXT, -- JSON格式变更详情
                message TEXT, -- 操作说明
                created_at INTEGER NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects (id),
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `);

        // 创建索引优化查询性能
        this.createIndexes();
    }

    /**
     * 创建数据库索引
     */
    createIndexes() {
        const indexes = [
            // 项目相关索引
            'CREATE INDEX IF NOT EXISTS idx_projects_author ON projects (author_id)',
            'CREATE INDEX IF NOT EXISTS idx_projects_status ON projects (status)',
            
            // 章节相关索引
            'CREATE INDEX IF NOT EXISTS idx_chapters_project ON chapters (project_id)',
            'CREATE INDEX IF NOT EXISTS idx_chapters_parent ON chapters (parent_id)',
            'CREATE INDEX IF NOT EXISTS idx_chapters_level ON chapters (project_id, level)',
            'CREATE INDEX IF NOT EXISTS idx_chapters_order ON chapters (project_id, parent_id, order_index)',
            
            // 内容相关索引
            'CREATE INDEX IF NOT EXISTS idx_contents_project ON contents (project_id)',
            'CREATE INDEX IF NOT EXISTS idx_contents_chapter ON contents (chapter_id)',
            'CREATE INDEX IF NOT EXISTS idx_contents_order ON contents (project_id, chapter_id, order_index)',
            'CREATE INDEX IF NOT EXISTS idx_contents_status ON contents (status)',
            'CREATE INDEX IF NOT EXISTS idx_contents_text_search ON contents (content_text)',
            
            // 版本历史索引
            'CREATE INDEX IF NOT EXISTS idx_content_versions_content ON content_versions (content_id)',
            'CREATE INDEX IF NOT EXISTS idx_content_versions_author ON content_versions (author_id)',
            
            // 角色和世界观索引
            'CREATE INDEX IF NOT EXISTS idx_characters_project ON characters (project_id)',
            'CREATE INDEX IF NOT EXISTS idx_worldbuilding_project ON worldbuilding (project_id)',
            'CREATE INDEX IF NOT EXISTS idx_worldbuilding_category ON worldbuilding (project_id, category)',
            
            // 区块链和协作索引
            'CREATE INDEX IF NOT EXISTS idx_blockchain_content ON blockchain_sync (content_id, content_type)',
            'CREATE INDEX IF NOT EXISTS idx_collaboration_project ON collaboration_logs (project_id)',
            'CREATE INDEX IF NOT EXISTS idx_collaboration_user ON collaboration_logs (user_id)'
        ];

        indexes.forEach(sql => {
            try {
                this.db.exec(sql);
            } catch (error) {
                console.warn('创建索引失败:', error.message);
            }
        });
    }

    /**
     * 生成ULID
     */
    generateId() {
        return ulid();
    }

    /**
     * 获取当前时间戳
     */
    getTimestamp() {
        return Date.now();
    }

    /**
     * 开始事务
     */
    transaction(callback) {
        return this.db.transaction(callback);
    }

    /**
     * 执行SQL查询
     */
    prepare(sql) {
        return this.db.prepare(sql);
    }

    /**
     * 执行SQL语句
     */
    exec(sql) {
        return this.db.exec(sql);
    }

    /**
     * 关闭数据库连接
     */
    close() {
        if (this.db) {
            this.db.close();
            console.log('🗄️ 数据库连接已关闭');
        }
    }

    /**
     * 获取数据库统计信息
     */
    getStats() {
        const stats = {};
        
        // 获取各表记录数
        const tables = ['users', 'projects', 'chapters', 'contents', 'characters', 'worldbuilding'];
        tables.forEach(table => {
            try {
                const result = this.db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
                stats[table] = result.count;
            } catch (error) {
                stats[table] = 0;
            }
        });

        // 获取章节层级统计
        try {
            const levelStats = this.db.prepare(`
                SELECT level, COUNT(*) as count 
                FROM chapters 
                GROUP BY level
            `).all();
            stats.chapter_levels = {};
            levelStats.forEach(row => {
                stats.chapter_levels[`level_${row.level}`] = row.count;
            });
        } catch (error) {
            stats.chapter_levels = {};
        }

        // 获取内容统计
        try {
            const contentStats = this.db.prepare(`
                SELECT 
                    SUM(word_count) as total_words,
                    SUM(character_count) as total_characters,
                    COUNT(CASE WHEN chapter_id IS NULL THEN 1 END) as root_contents,
                    COUNT(CASE WHEN chapter_id IS NOT NULL THEN 1 END) as chapter_contents
                FROM contents
            `).get();
            stats.content_stats = contentStats;
        } catch (error) {
            stats.content_stats = {
                total_words: 0,
                total_characters: 0,
                root_contents: 0,
                chapter_contents: 0
            };
        }

        // 获取数据库大小
        try {
            const sizeResult = this.db.prepare("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()").get();
            stats.database_size = sizeResult.size;
        } catch (error) {
            stats.database_size = 0;
        }

        return stats;
    }

    /**
     * 获取项目的完整章节树结构
     */
    getChapterTree(projectId) {
        const chapters = this.db.prepare(`
            SELECT * FROM chapters 
            WHERE project_id = ? 
            ORDER BY level, order_index
        `).all(projectId);

        // 构建树形结构
        const tree = [];
        const chaptersMap = new Map();

        // 先处理所有章节
        chapters.forEach(chapter => {
            chaptersMap.set(chapter.id, {
                ...chapter,
                children: []
            });
        });

        // 构建父子关系
        chapters.forEach(chapter => {
            const chapterNode = chaptersMap.get(chapter.id);
            if (chapter.parent_id) {
                const parent = chaptersMap.get(chapter.parent_id);
                if (parent) {
                    parent.children.push(chapterNode);
                }
            } else {
                tree.push(chapterNode);
            }
        });

        return tree;
    }

    /**
     * 获取章节的所有内容
     */
    getChapterContents(chapterId = null, projectId) {
        let query, params;
        
        if (chapterId) {
            // 获取特定章节的内容
            query = `
                SELECT * FROM contents 
                WHERE chapter_id = ? AND project_id = ?
                ORDER BY order_index
            `;
            params = [chapterId, projectId];
        } else {
            // 获取作品根节点的内容
            query = `
                SELECT * FROM contents 
                WHERE chapter_id IS NULL AND project_id = ?
                ORDER BY order_index
            `;
            params = [projectId];
        }

        return this.db.prepare(query).all(...params);
    }

    /**
     * 获取项目的完整内容结构（章节+内容）
     */
    getProjectStructure(projectId) {
        const chapterTree = this.getChapterTree(projectId);
        const rootContents = this.getChapterContents(null, projectId);

        // 为每个章节添加内容
        const addContentsToChapter = (chapter) => {
            chapter.contents = this.getChapterContents(chapter.id, projectId);
            chapter.children.forEach(addContentsToChapter);
        };

        chapterTree.forEach(addContentsToChapter);

        return {
            chapters: chapterTree,
            rootContents: rootContents
        };
    }

    /**
     * 创建新章节
     */
    createChapter(projectId, title, parentId = null, orderIndex = 0) {
        const level = parentId ? this.getChapterLevel(parentId) + 1 : 1;
        
        if (level > 3) {
            throw new Error('章节层级不能超过3层');
        }

        const chapterId = this.generateId();
        const timestamp = this.getTimestamp();

        this.db.prepare(`
            INSERT INTO chapters (
                id, project_id, title, parent_id, level, order_index, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(chapterId, projectId, title, parentId, level, orderIndex, timestamp, timestamp);

        return chapterId;
    }

    /**
     * 创建新内容
     */
    createContent(projectId, title, chapterId = null, contentDelta = '', orderIndex = 0) {
        const contentId = this.generateId();
        const timestamp = this.getTimestamp();

        // 从Delta内容提取纯文本和HTML
        const contentText = this.extractTextFromDelta(contentDelta);
        const contentHtml = this.deltaToHtml(contentDelta);
        const wordCount = this.countWords(contentText);
        const characterCount = contentText.length;

        this.db.prepare(`
            INSERT INTO contents (
                id, project_id, chapter_id, title, content_delta, content_html, 
                content_text, word_count, character_count, order_index, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(contentId, projectId, chapterId, title, contentDelta, contentHtml, 
                contentText, wordCount, characterCount, orderIndex, timestamp, timestamp);

        return contentId;
    }

    /**
     * 获取章节层级
     */
    getChapterLevel(chapterId) {
        const chapter = this.db.prepare('SELECT level FROM chapters WHERE id = ?').get(chapterId);
        return chapter ? chapter.level : 0;
    }

    /**
     * 简单的Delta文本提取（实际应用中可能需要更复杂的解析）
     */
    extractTextFromDelta(delta) {
        if (!delta) return '';
        try {
            const deltaObj = typeof delta === 'string' ? JSON.parse(delta) : delta;
            if (deltaObj.ops) {
                return deltaObj.ops
                    .filter(op => typeof op.insert === 'string')
                    .map(op => op.insert)
                    .join('');
            }
            return '';
        } catch (error) {
            return '';
        }
    }

    /**
     * 简单的Delta到HTML转换（实际应用中需要使用Quill的转换器）
     */
    deltaToHtml(delta) {
        const text = this.extractTextFromDelta(delta);
        return text.replace(/\n/g, '<br>');
    }

    /**
     * 简单的字数统计
     */
    countWords(text) {
        if (!text) return 0;
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    /**
     * 创建默认用户
     */
    createDefaultUser() {
        try {
            // 检查是否已存在默认用户
            const existingUser = this.db.prepare('SELECT id FROM users WHERE id = ?').get('user_mock_001');
            
            if (!existingUser) {
                const timestamp = Date.now();
                
                this.db.prepare(`
                    INSERT INTO users (id, username, email, password_hash, profile_data, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(
                    'user_mock_001',
                    'gestell_user',
                    'user@gestell.local',
                    'mock_password_hash', // 在实际应用中应该是真实的哈希
                    JSON.stringify({
                        displayName: 'Gestell用户',
                        bio: '使用Gestell进行科幻创作',
                        preferences: {
                            theme: 'dark',
                            editorMode: 'advanced'
                        }
                    }),
                    timestamp,
                    timestamp
                );
                
                console.log('✅ 创建默认用户: user_mock_001');
            } else {
                console.log('ℹ️ 默认用户已存在');
            }
        } catch (error) {
            console.error('创建默认用户失败:', error);
            throw error;
        }
    }
}

module.exports = GestallDatabase;