import { ipcMain } from 'electron';
import { ServiceContainer } from '../services/ServiceContainer';

/**
 * 作者相关的 IPC 处理器
 */
export class AuthorIPCHandler {
    constructor(private services: ServiceContainer) {}

    initialize() {
        console.log('📝 作者相关 IPC 处理器已注册');
        this.registerHandlers();
    }

    private registerHandlers() {
        console.log('🔧 开始注册作者相关 IPC 处理器...')
        
        // 作者登录
        ipcMain.handle('author:login', async (event, credentials) => {
            try {
                return await this.services.authorService.login(credentials);
            } catch (error) {
                console.error('Login error:', error);
                throw error;
            }
        });
        console.log('✅ author:login 处理器已注册')

        // 作者注册
        ipcMain.handle('author:register', async (event, userData) => {
            console.log('📨 收到作者注册请求:', userData?.username)
            try {
                return await this.services.authorService.register(userData);
            } catch (error) {
                console.error('Register error:', error);
                throw error;
            }
        });
        console.log('✅ author:register 处理器已注册')

        // 获取当前作者
        ipcMain.handle('author:getCurrentUser', async (event, userId) => {
            try {
                return await this.services.authorService.getCurrentUser(userId);
            } catch (error) {
                console.error('Get current user error:', error);
                throw error;
            }
        });
        console.log('✅ author:getCurrentUser 处理器已注册')

        // 更新作者资料
        ipcMain.handle('author:updateProfile', async (event, userId, updateData) => {
            try {
                return await this.services.authorService.updateProfile(userId, updateData);
            } catch (error) {
                console.error('Update profile error:', error);
                throw error;
            }
        });
        console.log('✅ author:updateProfile 处理器已注册')

        // 更改密码
        ipcMain.handle('author:changePassword', async (event, userId, currentPassword, newPassword) => {
            try {
                return await this.services.authorService.changePassword(userId, currentPassword, newPassword);
            } catch (error) {
                console.error('Change password error:', error);
                throw error;
            }
        });
        console.log('✅ author:changePassword 处理器已注册')

        // 获取作者统计
        ipcMain.handle('author:getStats', async (event, userId) => {
            try {
                return await this.services.authorService.getUserStats(userId);
            } catch (error) {
                console.error('Get user stats error:', error);
                throw error;
            }
        });
        console.log('✅ author:getStats 处理器已注册')

        // 根据邮箱查找作者
        ipcMain.handle('author:findByEmail', async (event, email) => {
            try {
                return await this.services.authorService.findByEmail(email);
            } catch (error) {
                console.error('Find by email error:', error);
                throw error;
            }
        });
        console.log('✅ author:findByEmail 处理器已注册')
        console.log('🎉 作者相关 IPC 处理器注册完成')
    }
}
