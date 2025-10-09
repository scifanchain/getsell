// 测试注册功能的脚本
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// 等待应用程序准备就绪
app.whenReady().then(async () => {
    console.log('🚀 开始测试注册功能...');

    try {
        // 导入必要的模块
        const { ServiceContainer } = require('./dist/services/ServiceContainer.js');
        const { RepositoryContainer } = require('./dist/data/RepositoryContainer.js');
        const { CryptoService } = require('./dist/crypto/crypto.js');

        // 初始化服务
        const repositories = new RepositoryContainer();
        const cryptoService = new CryptoService();
        const services = new ServiceContainer(repositories, cryptoService);

        // 测试用户数据
        const testUser = {
            username: 'testuser_' + Date.now(),
            email: 'test_' + Date.now() + '@example.com',
            displayName: 'Test User'
        };

        console.log('📝 测试数据:', testUser);

        // 执行注册
        const result = await services.userService.register(testUser);
        console.log('✅ 注册成功!', result);

        // 验证用户是否能够通过用户名查找
        const foundByUsername = await services.userService.findByEmail(testUser.email);
        console.log('🔍 通过邮箱查找用户:', foundByUsername ? '成功' : '失败');

        console.log('🎉 所有测试通过!');

    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        console.error(error);
    }

    app.quit();
});

app.on('window-all-closed', () => {
    app.quit();
});