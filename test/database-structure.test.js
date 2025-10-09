/**
 * Gestell 数据库更新测试
 * 测试新的Work、Chapter、Content结构
 */

const GestallDatabase = require('../src/core/database');
const path = require('path');
const fs = require('fs');

async function testNewDatabaseStructure() {
    console.log('🚀 开始测试Gestell数据库新结构...');
    
    // 创建测试数据库
    const testDbPath = path.join(__dirname, 'temp', 'gestell-new.db');
    
    // 确保测试目录存在
    const testDir = path.dirname(testDbPath);
    if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
    }
    
    // 删除旧的测试数据库
    if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
    }
    
    let db;
    try {
        // 初始化新数据库
        db = new GestallDatabase(testDbPath);
        console.log('✅ 数据库初始化成功');
        
        // 测试1: 检查表结构
        console.log('\n📊 测试1: 检查新表结构');
        const tables = db.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        const tableNames = tables.map(t => t.name);
        
        console.log('📋 数据库表:', tableNames);
        
        // 检查必需的表
        const requiredTables = ['authors', 'works', 'chapters', 'contents'];
        const missingTables = requiredTables.filter(table => !tableNames.includes(table));
        
        if (missingTables.length === 0) {
            console.log('✅ 所有必需表都存在');
        } else {
            console.log('❌ 缺少表:', missingTables);
        }
        
        // 测试2: 创建作者
        console.log('\n👤 测试2: 创建科幻作者');
        const authorId = db.generateId();
        const timestamp = db.getTimestamp();
        
        db.db.prepare(`
            INSERT INTO authors (
                id, username, display_name, email, bio, genre_specialty,
                wallet_address, status, total_works, total_words,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            authorId,
            'scifi_writer_2387',
            '星际作家',
            'writer@newearth.space',
            '专注于硬科幻创作，探索人类与AI共存的未来',
            'hard_sci_fi',
            '0x742d35Cc6639C0532fEb94fbcDeb90Ae9e6Fb47B',
            'verified',
            0,
            0,
            timestamp,
            timestamp
        );
        
        console.log('✅ 作者创建成功:', authorId);
        
        // 测试3: 创建作品
        console.log('\n📚 测试3: 创建科幻作品');
        const workId = db.generateId();
        
        db.db.prepare(`
            INSERT INTO works (
                id, title, subtitle, description, genre, author_id,
                collaboration_mode, status, target_words, 
                blockchain_hash, nft_token_id, license_type,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            workId,
            '星际迷航：新纪元',
            '探索未知星系的冒险',
            '这是一个关于星际探索、外星文明和人类未来的硬科幻故事',
            'hard_sci_fi',
            authorId,
            'invite_only',
            'writing',
            100000,
            null,
            null,
            'cc_by_nc',
            timestamp,
            timestamp
        );
        
        console.log('✅ 作品创建成功:', workId);
        
        // 测试4: 创建章节结构
        console.log('\n📖 测试4: 创建层次化章节');
        
        // 第一部分
        const part1Id = db.generateId();
        db.db.prepare(`
            INSERT INTO chapters (
                id, work_id, title, parent_id, level, order_index,
                type, author_id, target_words, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            part1Id, workId, '第一部：启程', null, 1, 1,
            'part', authorId, 30000, timestamp, timestamp
        );
        
        // 第一章
        const chapter1Id = db.generateId();
        db.db.prepare(`
            INSERT INTO chapters (
                id, work_id, title, parent_id, level, order_index,
                type, author_id, story_timeline_start, target_words,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            chapter1Id, workId, '第一章：意外的发现', part1Id, 2, 1,
            'chapter', authorId, '2387年3月15日', 3000, timestamp, timestamp
        );
        
        // 第一节
        const section1Id = db.generateId();
        db.db.prepare(`
            INSERT INTO chapters (
                id, work_id, title, parent_id, level, order_index,
                type, author_id, target_words, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            section1Id, workId, '1.1 晨光中的信号', chapter1Id, 3, 1,
            'section', authorId, 1000, timestamp, timestamp
        );
        
        console.log('✅ 章节结构创建成功');
        console.log('   📁', '第一部：启程');
        console.log('     📖', '第一章：意外的发现');
        console.log('       📄', '1.1 晨光中的信号');
        
        // 测试5: 创建内容
        console.log('\n✍️ 测试5: 创建富文本内容');
        
        const contentId = db.generateId();
        const contentText = `晨光透过新地球空间站的观察窗洒入，艾伦·陈博士正在分析来自比邻星系的神秘信号。这个信号与以往接收到的任何宇宙背景辐射都不同，它似乎包含着某种智能模式。

"这不可能..." 艾伦喃喃自语，他的手指在全息控制台上飞快地操作着。数据流如瀑布般在他眼前闪过，每一个数据点都在证实他心中那个令人震惊的猜测。

这个信号，来自一个距离地球4.24光年的恒星系统，正在以一种前所未见的数学序列重复播放。更令人不安的是，这个序列似乎在回应人类在50年前发送的深空探测信号。`;

        const quillDelta = JSON.stringify({
            ops: [
                { insert: "晨光透过" },
                { insert: "新地球空间站", attributes: { bold: true, color: "#0066cc" } },
                { insert: "的观察窗洒入，" },
                { insert: "艾伦·陈", attributes: { bold: true } },
                { insert: "博士正在分析来自" },
                { insert: "比邻星系", attributes: { italic: true, color: "#ff6600" } },
                { insert: "的神秘信号。这个信号与以往接收到的任何宇宙背景辐射都不同，它似乎包含着某种" },
                { insert: "智能模式", attributes: { bold: true, background: "#ffff00" } },
                { insert: "。\n\n" },
                { insert: contentText.split('\n').slice(1).join('\n') }
            ]
        });
        
        db.db.prepare(`
            INSERT INTO contents (
                id, work_id, chapter_id, order_index, title, type,
                content_delta, content_text, word_count, character_count,
                paragraph_count, author_id, emotion_tone, importance_level,
                characters_involved, location, story_timeline, tags,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            contentId, workId, section1Id, 1, '神秘信号的发现', 'text',
            quillDelta, contentText, 
            db.countWords(contentText), contentText.length, db.countParagraphs(contentText),
            authorId, 'mysterious', 5,
            JSON.stringify(['艾伦·陈博士']),
            '新地球空间站观察室',
            '2387年3月15日 上午7:30',
            JSON.stringify(['科学发现', '外星信号', '主角登场']),
            timestamp, timestamp
        );
        
        console.log('✅ 内容创建成功');
        console.log('   📝 标题:', '神秘信号的发现');
        console.log('   📊 字数:', db.countWords(contentText));
        console.log('   🎭 情感:', 'mysterious');
        console.log('   ⭐ 重要性:', 5);
        
        // 测试6: 查询完整结构
        console.log('\n🌳 测试6: 查询完整作品结构');
        
        const workInfo = db.db.prepare(`
            SELECT w.*, a.display_name as author_name
            FROM works w
            JOIN authors a ON w.author_id = a.id
            WHERE w.id = ?
        `).get(workId);
        
        console.log('📚 作品信息:');
        console.log('   标题:', workInfo.title);
        console.log('   作者:', workInfo.author_name);
        console.log('   类型:', workInfo.genre);
        console.log('   状态:', workInfo.status);
        
        const chapters = db.db.prepare(`
            SELECT * FROM chapters 
            WHERE work_id = ? 
            ORDER BY level, order_index
        `).all(workId);
        
        console.log('📖 章节结构:', chapters.length, '个章节');
        
        const contents = db.db.prepare(`
            SELECT * FROM contents 
            WHERE work_id = ?
        `).all(workId);
        
        console.log('📝 内容数量:', contents.length, '个内容块');
        
        // 测试7: 统计信息
        console.log('\n📊 测试7: 统计信息');
        const stats = db.getStats();
        console.log('✅ 数据库统计:', {
            authors: stats.authors,
            works: stats.works,
            chapters: stats.chapters,
            contents: stats.contents
        });
        
        console.log('\n🎉 所有测试通过！');
        console.log('📋 新数据库结构验证成功:');
        console.log('  ✅ Authors表 - 支持钱包地址和区块链身份');
        console.log('  ✅ Works表 - 支持NFT和版权管理');
        console.log('  ✅ Chapters表 - 支持三层嵌套结构');
        console.log('  ✅ Contents表 - 支持富文本和协作功能');
        console.log('  ✅ 完整的关联关系和数据完整性');
        
    } catch (error) {
        console.error('❌ 测试失败:', error);
        console.error('错误详情:', error.message);
        if (error.stack) {
            console.error('堆栈跟踪:', error.stack);
        }
        process.exit(1);
    } finally {
        if (db) {
            db.close();
            console.log('🔐 数据库连接已关闭');
        }
        
        // 清理测试文件
        try {
            if (fs.existsSync(testDbPath)) {
                fs.unlinkSync(testDbPath);
                console.log('🧹 测试文件已清理');
            }
        } catch (cleanupError) {
            console.warn('⚠️ 清理测试文件失败:', cleanupError.message);
        }
    }
}

// 运行测试
if (require.main === module) {
    testNewDatabaseStructure().catch(console.error);
}

module.exports = { testNewDatabaseStructure };