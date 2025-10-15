/**
 * 检查数据库表结构的脚本
 */
const Database = require('better-sqlite3');
const path = require('path');

// 数据库路径
const dbPath = path.join(__dirname, 'gestell-crsqlite.db');

console.log(`检查数据库: ${dbPath}`);

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
    
    const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
    
    columns.forEach(col => {
      console.log(`  ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
    });
  }
  
  db.close();
  
} catch (error) {
  console.error('错误:', error.message);
}