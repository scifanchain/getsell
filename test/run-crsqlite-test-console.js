/**
 * 在浏览器控制台中运行 CR-SQLite 测试
 * 
 * 使用方法：
 * 1. 打开 Electron 应用
 * 2. 打开开发者工具 (F12)
 * 3. 在 Console 中粘贴并运行此文件内容
 */

(async function testCRSQLite() {
  console.log('🚀 开始 CR-SQLite 测试...\n');

  try {
    // 运行基础测试
    console.log('📝 调用 test:crsqlite:basic...');
    const result = await window.electron.invoke('test:crsqlite:basic');

    if (result.success) {
      console.log('✅ 测试成功！\n');
      result.results.forEach(item => {
        const icon = item.status === 'success' ? '✅' : 
                     item.status === 'error' ? '❌' : 
                     '📝';
        console.log(`${icon} ${item.message}`);
        if (item.data) {
          console.log('   数据:', item.data);
        }
      });
    } else {
      console.error('❌ 测试失败:', result.error);
    }

    // 获取统计信息
    console.log('\n📊 获取统计信息...');
    const statsResult = await window.electron.invoke('test:crsqlite:stats');
    if (statsResult.success) {
      console.log('✅ 统计信息:', statsResult.stats);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
})();
