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

        if (currentVersion < targetVersion && currentVersion > 1) {
            // 只有当数据库版本大于1时才执行迁移
            // 如果是全新数据库（版本1），直接在initTables中创建新表
            console.log('🔄 开始数据库迁移...');
            this.migrateToVersion2();
            this.setSchemaVersion(targetVersion);
            console.log('✅ 数据库迁移完成');
        } else if (currentVersion === 1) {
            // 全新数据库，设置为最新版本
            this.setSchemaVersion(targetVersion);
            console.log('🆕 新数据库，直接设置为最新版本');
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
                work_id TEXT NOT NULL, -- 所属作品ID
                parent_id TEXT, -- 父章节ID，NULL表示根级章节
                level INTEGER NOT NULL DEFAULT 1, -- 章节层级：1-3
                order_index INTEGER NOT NULL, -- 在同级中的排序
                title TEXT NOT NULL,
                subtitle TEXT, -- 章节副标题
                description TEXT, -- 章节描述
                type TEXT DEFAULT 'chapter', -- part, chapter, section, scene, epilogue, prologue, appendix
                status TEXT DEFAULT 'draft', -- draft, writing, review, completed, published
                word_count INTEGER DEFAULT 0, -- 章节总字数（包含子章节）
                character_count INTEGER DEFAULT 0, -- 章节总字符数
                content_count INTEGER DEFAULT 0, -- 直接内容数量
                child_chapter_count INTEGER DEFAULT 0, -- 子章节数量
                progress_percentage REAL DEFAULT 0.0, -- 完成百分比
                target_words INTEGER, -- 目标字数
                author_id TEXT NOT NULL, -- 章节作者（支持章节级协作）
                story_timeline_start TEXT, -- 故事时间线开始
                story_timeline_end TEXT, -- 故事时间线结束
                tags TEXT, -- JSON格式标签
                blockchain_hash TEXT, -- 章节内容哈希
                is_public BOOLEAN DEFAULT FALSE,
                published_at INTEGER,
                metadata TEXT, -- JSON格式元数据
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY (work_id) REFERENCES works (id),
                FOREIGN KEY (author_id) REFERENCES authors (id),
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
                work_id TEXT NOT NULL, -- 所属作品ID
                chapter_id TEXT, -- 所属章节ID，NULL表示属于作品根节点
                order_index INTEGER NOT NULL, -- 在同级中的排序
                title TEXT, -- 内容标题
                type TEXT DEFAULT 'text', -- text, dialogue, description, action, thought, narration, note, outline, sketch
                content_delta TEXT, -- Quill Delta格式内容
                content_html TEXT, -- 渲染后的HTML
                content_text TEXT, -- 纯文本内容（用于搜索）
                word_count INTEGER DEFAULT 0,
                character_count INTEGER DEFAULT 0,
                paragraph_count INTEGER DEFAULT 0,
                status TEXT DEFAULT 'draft', -- draft, writing, review, completed, published
                version INTEGER DEFAULT 1, -- 版本号
                author_id TEXT NOT NULL, -- 内容作者
                is_collaborative BOOLEAN DEFAULT FALSE, -- 是否为协作内容
                contributors TEXT, -- JSON格式贡献者列表
                story_timeline TEXT, -- 故事时间点
                characters_involved TEXT, -- JSON格式涉及角色
                location TEXT, -- 故事地点
                scene_description TEXT, -- 场景描述
                tags TEXT, -- JSON格式标签
                emotion_tone TEXT, -- 情感色调: neutral, happy, sad, angry, fearful, surprised, etc.
                importance_level INTEGER DEFAULT 3, -- 重要性等级(1-5)
                content_hash TEXT, -- 内容哈希值
                blockchain_timestamp INTEGER, -- 上链时间戳
                copyright_status TEXT DEFAULT 'draft', -- draft, pending, registered, published
                is_public BOOLEAN DEFAULT FALSE,
                published_at INTEGER,
                writing_duration INTEGER DEFAULT 0, -- 写作时长(秒)
                last_edited_at INTEGER NOT NULL,
                last_editor_id TEXT, -- 最后编辑者
                notes TEXT, -- 作者备注
                metadata TEXT, -- JSON格式元数据
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY (work_id) REFERENCES works (id),
                FOREIGN KEY (chapter_id) REFERENCES chapters (id),
                FOREIGN KEY (author_id) REFERENCES authors (id),
                FOREIGN KEY (last_editor_id) REFERENCES authors (id)
            )
        `);
    }

    /**
     * 迁移章节数据
     */
    migrateChapterData(oldChapters) {
        const insertChapter = this.db.prepare(`
            INSERT INTO chapters (
                id, work_id, title, parent_id, level, order_index, subtitle, description, 
                type, status, word_count, character_count, content_count, child_chapter_count,
                progress_percentage, target_words, author_id, story_timeline_start, 
                story_timeline_end, tags, blockchain_hash, is_public, published_at, 
                metadata, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertContent = this.db.prepare(`
            INSERT INTO contents (
                id, work_id, chapter_id, order_index, title, type, content_delta, 
                content_html, content_text, word_count, character_count, paragraph_count,
                status, version, author_id, is_collaborative, contributors, story_timeline,
                characters_involved, location, scene_description, tags, emotion_tone,
                importance_level, content_hash, blockchain_timestamp, copyright_status,
                is_public, published_at, writing_duration, last_edited_at, last_editor_id,
                notes, metadata, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        oldChapters.forEach((chapter, index) => {
            // 将旧章节作为新的章节
            insertChapter.run(
                chapter.id,
                chapter.project_id || chapter.work_id, // 兼容字段名变化
                chapter.title,
                null, // 所有旧章节都作为根级章节
                1, // 层级1
                index, // 使用索引作为排序
                null, // subtitle
                chapter.description || null,
                'chapter', // type
                chapter.status || 'draft',
                0, // word_count
                0, // character_count
                0, // content_count
                0, // child_chapter_count
                0.0, // progress_percentage
                null, // target_words
                chapter.author_id || 'user_mock_001', // 默认作者
                null, // story_timeline_start
                null, // story_timeline_end
                null, // tags
                null, // blockchain_hash
                false, // is_public
                null, // published_at
                null, // metadata
                chapter.created_at || Date.now(),
                chapter.updated_at || Date.now()
            );

            // 如果章节有内容，转换为内容记录
            if (chapter.content_delta || chapter.content_html) {
                const contentId = this.generateId();
                const contentText = this.extractTextFromDelta(chapter.content_delta);
                
                insertContent.run(
                    contentId,
                    chapter.project_id || chapter.work_id,
                    chapter.id, // 关联到对应的章节
                    0, // order_index
                    `${chapter.title} - 内容`, // 内容标题
                    'text', // type
                    chapter.content_delta || '',
                    chapter.content_html || '',
                    contentText,
                    chapter.word_count || this.countWords(contentText),
                    chapter.character_count || contentText.length,
                    this.countParagraphs(contentText), // paragraph_count
                    chapter.status || 'draft',
                    1, // version
                    chapter.author_id || 'user_mock_001', // author_id
                    false, // is_collaborative
                    null, // contributors
                    null, // story_timeline
                    null, // characters_involved
                    null, // location
                    null, // scene_description
                    null, // tags
                    'neutral', // emotion_tone
                    3, // importance_level
                    null, // content_hash
                    null, // blockchain_timestamp
                    'draft', // copyright_status
                    false, // is_public
                    null, // published_at
                    0, // writing_duration
                    chapter.updated_at || Date.now(), // last_edited_at
                    chapter.author_id || 'user_mock_001', // last_editor_id
                    chapter.notes || null,
                    null, // metadata
                    chapter.created_at || Date.now(),
                    chapter.updated_at || Date.now()
                );
            }
        });
    }

    /**
     * 迁移users表到authors表
     */
    migrateUsersToAuthors() {
        try {
            const tablesInfo = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
            
            if (tablesInfo) {
                console.log('📦 迁移users表到authors表...');
                
                const oldUsers = this.db.prepare('SELECT * FROM users').all();
                
                const insertAuthor = this.db.prepare(`
                    INSERT INTO authors (
                        id, username, display_name, email, bio, avatar_url, 
                        wallet_address, public_key, private_key_encrypted,
                        total_works, total_words, status, preferences,
                        last_active_at, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);

                oldUsers.forEach(user => {
                    // 解析profile_data
                    let profileData = {};
                    try {
                        profileData = user.profile_data ? JSON.parse(user.profile_data) : {};
                    } catch (e) {
                        profileData = {};
                    }

                    insertAuthor.run(
                        user.id,
                        user.username,
                        profileData.displayName || user.username,
                        user.email || null,
                        profileData.bio || null,
                        profileData.avatar_url || null,
                        null, // wallet_address
                        user.public_key || null,
                        user.private_key_encrypted || null,
                        0, // total_works
                        0, // total_words  
                        'active', // status
                        user.profile_data || null, // preferences
                        null, // last_active_at
                        user.created_at || Date.now(),
                        user.updated_at || Date.now()
                    );
                });

                // 重命名旧表
                this.db.exec('ALTER TABLE users RENAME TO users_backup');
                console.log(`✅ 迁移了 ${oldUsers.length} 个用户记录到authors表`);
            }
        } catch (error) {
            console.warn('用户数据迁移失败:', error.message);
        }
    }

    /**
     * 迁移projects表到works表
     */
    migrateProjectsToWorks() {
        try {
            const tablesInfo = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='projects'").get();
            
            if (tablesInfo) {
                console.log('📦 迁移projects表到works表...');
                
                const oldProjects = this.db.prepare('SELECT * FROM projects').all();
                
                const insertWork = this.db.prepare(`
                    INSERT INTO works (
                        id, title, subtitle, description, cover_image_url, genre, tags,
                        author_id, collaboration_mode, collaborators, status, progress_percentage,
                        total_words, total_characters, chapter_count, target_words,
                        target_completion_date, blockchain_hash, nft_token_id, nft_contract_address,
                        copyright_hash, is_public, license_type, published_at, metadata,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);

                oldProjects.forEach(project => {
                    // 转换collaboration_mode
                    let collaborationMode = 'solo';
                    if (project.collaboration_mode === 'public') collaborationMode = 'open';
                    else if (project.collaboration_mode === 'invite') collaborationMode = 'invite_only';

                    insertWork.run(
                        project.id,
                        project.title,
                        null, // subtitle
                        project.description || null,
                        null, // cover_image_url
                        project.genre || null,
                        null, // tags
                        project.author_id || 'user_mock_001',
                        collaborationMode,
                        null, // collaborators
                        project.status || 'draft',
                        0.0, // progress_percentage
                        0, // total_words
                        0, // total_characters
                        0, // chapter_count
                        null, // target_words
                        null, // target_completion_date
                        project.blockchain_hash || null,
                        null, // nft_token_id
                        null, // nft_contract_address
                        null, // copyright_hash
                        false, // is_public
                        'all_rights_reserved', // license_type
                        null, // published_at
                        project.metadata || null,
                        project.created_at || Date.now(),
                        project.updated_at || Date.now()
                    );
                });

                // 重命名旧表
                this.db.exec('ALTER TABLE projects RENAME TO projects_backup');
                console.log(`✅ 迁移了 ${oldProjects.length} 个项目记录到works表`);
            }
        } catch (error) {
            console.warn('项目数据迁移失败:', error.message);
        }
    }

    /**
     * 统计段落数量
     */
    countParagraphs(text) {
        if (!text) return 0;
        return text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
    }

    /**
     * 初始化数据库表结构
     */
    /**
     * 初始化数据库表结构
     */
    initTables() {
        // 作者表 (重命名为authors，对应原来的users)
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS authors (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                display_name TEXT,
                email TEXT UNIQUE,
                bio TEXT,
                avatar_url TEXT,
                wallet_address TEXT, -- 区块链钱包地址
                public_key TEXT, -- 公钥
                private_key_encrypted TEXT, -- 加密私钥
                total_works INTEGER DEFAULT 0,
                total_words INTEGER DEFAULT 0,
                status TEXT DEFAULT 'active', -- active, inactive, suspended, verified
                preferences TEXT, -- JSON格式用户偏好
                last_active_at INTEGER,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )
        `);

        // 兼容性：如果存在旧的users表，迁移数据
        this.migrateUsersToAuthors();

        // 作品表 (重命名为works，对应原来的projects)
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS works (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                subtitle TEXT,
                description TEXT,
                cover_image_url TEXT,
                genre TEXT, -- 科幻子类型: hard_sci_fi, soft_sci_fi, space_opera, cyberpunk等
                tags TEXT, -- JSON格式标签数组
                author_id TEXT NOT NULL,
                collaboration_mode TEXT DEFAULT 'solo', -- solo, invite_only, open, dao
                collaborators TEXT, -- JSON格式协作者列表
                status TEXT DEFAULT 'draft', -- draft, writing, review, completed, published, archived
                progress_percentage REAL DEFAULT 0.0,
                total_words INTEGER DEFAULT 0,
                total_characters INTEGER DEFAULT 0,
                chapter_count INTEGER DEFAULT 0,
                target_words INTEGER,
                target_completion_date INTEGER,
                blockchain_hash TEXT, -- 区块链哈希
                nft_token_id TEXT, -- NFT Token ID
                nft_contract_address TEXT, -- NFT合约地址
                copyright_hash TEXT, -- 版权哈希
                is_public BOOLEAN DEFAULT FALSE,
                license_type TEXT DEFAULT 'all_rights_reserved', -- 许可证类型
                published_at INTEGER,
                metadata TEXT, -- JSON格式元数据
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY (author_id) REFERENCES authors (id)
            )
        `);

        // 兼容性：如果存在旧的projects表，迁移数据
        this.migrateProjectsToWorks();

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
                FOREIGN KEY (author_id) REFERENCES authors (id)
            )
        `);

        // 角色表
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS characters (
                id TEXT PRIMARY KEY,
                work_id TEXT NOT NULL,
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
                FOREIGN KEY (work_id) REFERENCES works (id)
            )
        `);

        // 世界观设定表
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS worldbuilding (
                id TEXT PRIMARY KEY,
                work_id TEXT NOT NULL,
                category TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                details TEXT,
                references_data TEXT,
                tags TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY (work_id) REFERENCES works (id)
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
                work_id TEXT NOT NULL,
                author_id TEXT NOT NULL,
                action TEXT NOT NULL, -- create, edit, delete, comment, etc.
                target_type TEXT NOT NULL, -- chapter, character, worldbuilding
                target_id TEXT NOT NULL,
                changes TEXT, -- JSON格式变更详情
                message TEXT, -- 操作说明
                created_at INTEGER NOT NULL,
                FOREIGN KEY (work_id) REFERENCES works (id),
                FOREIGN KEY (author_id) REFERENCES authors (id)
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
            // 作品相关索引
            'CREATE INDEX IF NOT EXISTS idx_works_author ON works (author_id)',
            'CREATE INDEX IF NOT EXISTS idx_works_status ON works (status)',
            
            // 章节相关索引
            'CREATE INDEX IF NOT EXISTS idx_chapters_work ON chapters (work_id)',
            'CREATE INDEX IF NOT EXISTS idx_chapters_parent ON chapters (parent_id)',
            'CREATE INDEX IF NOT EXISTS idx_chapters_level ON chapters (work_id, level)',
            'CREATE INDEX IF NOT EXISTS idx_chapters_order ON chapters (work_id, parent_id, order_index)',
            
            // 内容相关索引
            'CREATE INDEX IF NOT EXISTS idx_contents_work ON contents (work_id)',
            'CREATE INDEX IF NOT EXISTS idx_contents_chapter ON contents (chapter_id)',
            'CREATE INDEX IF NOT EXISTS idx_contents_order ON contents (work_id, chapter_id, order_index)',
            'CREATE INDEX IF NOT EXISTS idx_contents_status ON contents (status)',
            'CREATE INDEX IF NOT EXISTS idx_contents_text_search ON contents (content_text)',
            
            // 版本历史索引
            'CREATE INDEX IF NOT EXISTS idx_content_versions_content ON content_versions (content_id)',
            'CREATE INDEX IF NOT EXISTS idx_content_versions_author ON content_versions (author_id)',
            
            // 角色和世界观索引
            'CREATE INDEX IF NOT EXISTS idx_characters_work ON characters (work_id)',
            'CREATE INDEX IF NOT EXISTS idx_worldbuilding_work ON worldbuilding (work_id)',
            'CREATE INDEX IF NOT EXISTS idx_worldbuilding_category ON worldbuilding (work_id, category)',
            
            // 区块链和协作索引
            'CREATE INDEX IF NOT EXISTS idx_blockchain_content ON blockchain_sync (content_id, content_type)',
            'CREATE INDEX IF NOT EXISTS idx_collaboration_work ON collaboration_logs (work_id)',
            'CREATE INDEX IF NOT EXISTS idx_collaboration_author ON collaboration_logs (author_id)'
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
        const tables = ['authors', 'works', 'chapters', 'contents', 'characters', 'worldbuilding'];
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
                id, work_id, title, parent_id, level, order_index, author_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(chapterId, projectId, title, parentId, level, orderIndex, 'user_mock_001', timestamp, timestamp);

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
                id, work_id, chapter_id, order_index, title, type, content_delta, 
                content_html, content_text, word_count, character_count, paragraph_count,
                status, version, author_id, is_collaborative, contributors, story_timeline,
                characters_involved, location, scene_description, tags, emotion_tone,
                importance_level, content_hash, blockchain_timestamp, copyright_status,
                is_public, published_at, writing_duration, last_edited_at, last_editor_id,
                notes, metadata, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(contentId, projectId, chapterId, orderIndex, title, 'text', contentDelta, contentHtml, 
                contentText, wordCount, characterCount, this.countParagraphs(contentText), 
                'draft', 1, 'user_mock_001', false, null, null, null, null, null, null, 'neutral',
                3, null, null, 'draft', false, null, 0, timestamp, 'user_mock_001', null, null, timestamp, timestamp);

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
            const existingUser = this.db.prepare('SELECT id FROM authors WHERE id = ?').get('user_mock_001');
            
            if (!existingUser) {
                const timestamp = Date.now();
                
                this.db.prepare(`
                    INSERT INTO authors (
                        id, username, display_name, email, bio, avatar_url,
                        wallet_address, public_key, private_key_encrypted,
                        total_works, total_words, status, preferences,
                        last_active_at, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                    'user_mock_001',
                    'gestell_user',
                    'Gestell用户',
                    'user@gestell.local',
                    '使用Gestell进行科幻创作',
                    null, // avatar_url
                    null, // wallet_address
                    null, // public_key
                    null, // private_key_encrypted
                    0, // total_works
                    0, // total_words
                    'active', // status
                    JSON.stringify({
                        theme: 'dark',
                        editorMode: 'advanced'
                    }), // preferences
                    null, // last_active_at
                    timestamp,
                    timestamp
                );
                
                console.log('✅ 创建默认作者: user_mock_001');
            } else {
                console.log('ℹ️ 默认作者已存在');
            }
        } catch (error) {
            console.error('创建默认作者失败:', error);
            throw error;
        }
    }
}

module.exports = GestallDatabase;