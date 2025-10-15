/**
 * 使用 Electron 环境检查数据库表结构
 */
const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

console.log('开始检查数据库表结构...');

// 使用 Electron 的 userData 路径
const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'gestell-crsqlite.db');

console.log(`数据库路径: ${dbPath}`);

try {
  const db = new Database(dbPath, { readonly: true });
  
  // 获取所有表
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'crsql_%'
    ORDER BY name
  `).all();
  
  console.log('\n=== 数据库表列表 ===');
  tables.forEach(table => {
    console.log(`- ${table.name}`);
  });
  
  // 检查每个表的字段结构
  for (const table of tables) {
    console.log(`\n=== 表 ${table.name} 的字段结构 ===`);
    
    try {
      const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
      
      columns.forEach(col => {
        console.log(`  ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
      });
    } catch (error) {
      console.log(`  错误: ${error.message}`);
    }
  }
  
  db.close();
  console.log('\n检查完成！');
  
} catch (error) {
  console.error('错误:', error.message);
}

// 退出进程
process.exit(0);