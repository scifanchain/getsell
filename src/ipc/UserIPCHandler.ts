import { ipcMain } from 'electron';
import { ServiceContainer } from '../services/ServiceContainer';

/**
 * 用户相关的 IPC 处理器
 */
export class UserIPCHandler {
    constructor(private services: ServiceContainer) {}

    initialize() {
        console.log('📝 用户相关 IPC 处理器已注册');
        this.registerHandlers();
    }

    private registerHandlers() {
        // 用户登录
        ipcMain.handle('user:login', async (event, credentials) => {
            try {
                return await this.services.userService.login(credentials);
            } catch (error) {
                console.error('Login error:', error);
                throw error;
            }
        });

        // 用户注册
        ipcMain.handle('user:register', async (event, userData) => {
            try {
                return await this.services.userService.register(userData);
            } catch (error) {
                console.error('Register error:', error);
                throw error;
            }
        });

        // 获取当前用户
        ipcMain.handle('user:getCurrentUser', async (event, userId) => {
            try {
                return await this.services.userService.getCurrentUser(userId);
            } catch (error) {
                console.error('Get current user error:', error);
                throw error;
            }
        });

        // 更新用户资料
        ipcMain.handle('user:updateProfile', async (event, userId, updateData) => {
            try {
                return await this.services.userService.updateProfile(userId, updateData);
            } catch (error) {
                console.error('Update profile error:', error);
                throw error;
            }
        });

        // 更改密码
        ipcMain.handle('user:changePassword', async (event, userId, currentPassword, newPassword) => {
            try {
                return await this.services.userService.changePassword(userId, currentPassword, newPassword);
            } catch (error) {
                console.error('Change password error:', error);
                throw error;
            }
        });

        // 获取用户统计
        ipcMain.handle('user:getStats', async (event, userId) => {
            try {
                return await this.services.userService.getUserStats(userId);
            } catch (error) {
                console.error('Get user stats error:', error);
                throw error;
            }
        });

        // 根据邮箱查找用户
        ipcMain.handle('user:findByEmail', async (event, email) => {
            try {
                return await this.services.userService.findByEmail(email);
            } catch (error) {
                console.error('Find by email error:', error);
                throw error;
            }
        });
    }
}