// Gestell 主应用脚本

class GestallApp {
    constructor() {
        this.currentWork = null;
        this.works = [];
        this.stats = {};
        this.init();
    }

    async init() {
        this.setupTitleBar();
        this.setupEventListeners();
        await this.loadInitialData();
    }

    // 设置标题栏控制
    setupTitleBar() {
        const minBtn = document.getElementById('min-btn');
        const maxBtn = document.getElementById('max-btn');
        const closeBtn = document.getElementById('close-btn');

        minBtn?.addEventListener('click', () => {
            window.electronAPI.invoke('window:minimize');
        });

        maxBtn?.addEventListener('click', () => {
            window.electronAPI.invoke('window:toggleMaximize');
        });

        closeBtn?.addEventListener('click', () => {
            window.electronAPI.invoke('window:close');
        });
    }

    // 设置事件监听器
    setupEventListeners() {
        // 新建作品按钮
        document.getElementById('new-work-btn')?.addEventListener('click', () => {
            this.showCreateWorkModal();
        });

        // 刷新统计按钮
        document.getElementById('refresh-stats-btn')?.addEventListener('click', () => {
            this.loadStats();
        });

        // 性能测试按钮
        document.getElementById('test-performance-btn')?.addEventListener('click', () => {
            this.openPerformanceTest();
        });

        // 查看结构按钮
        document.getElementById('view-schema-btn')?.addEventListener('click', () => {
            this.showDatabaseSchema();
        });

        // 快速开始按钮
        document.getElementById('quick-start-btn')?.addEventListener('click', () => {
            this.showCreateWorkModal();
        });

        // 创建第一部作品按钮
        document.getElementById('create-first-work')?.addEventListener('click', () => {
            this.showCreateWorkModal();
        });

        // 导入作品按钮
        document.getElementById('import-work')?.addEventListener('click', () => {
            this.showImportModal();
        });

        // 模态对话框控制
        document.getElementById('modal-close')?.addEventListener('click', () => {
            this.hideModal();
        });

        document.getElementById('modal-cancel')?.addEventListener('click', () => {
            this.hideModal();
        });

        document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'modal-overlay') {
                this.hideModal();
            }
        });

        // 作品详情面板控制
        document.getElementById('close-work-panel')?.addEventListener('click', () => {
            this.hideWorkDetailPanel();
        });
    }

    // 加载初始数据
    async loadInitialData() {
        try {
            await Promise.all([
                this.loadWorks(),
                this.loadStats()
            ]);

            // 更新数据库状态显示
            const dbStatus = document.getElementById('db-status');
            if (dbStatus) {
                dbStatus.textContent = '🔗 混合数据库';
                dbStatus.style.background = '#4caf50';
            }
        } catch (error) {
            console.error('加载初始数据失败:', error);
            this.showError('加载数据失败: ' + error.message);
        }
    }

    // 加载作品列表
    async loadWorks() {
        try {
            const result = await window.electronAPI.invoke('project:list', 'user_mock_001');
            if (result.success) {
                this.works = result.projects || [];
                this.renderWorksList();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('加载作品列表失败:', error);
            this.showError('加载作品列表失败');
        }
    }

    // 渲染作品列表
    renderWorksList() {
        const worksList = document.getElementById('works-list');
        if (!worksList) return;

        if (this.works.length === 0) {
            worksList.innerHTML = `
                <div class="empty-state">
                    <p>还没有任何作品</p>
                    <button class="btn-small" onclick="app.showCreateWorkModal()">创建第一部作品</button>
                </div>
            `;
            return;
        }

        const html = this.works.map(work => `
            <div class="work-item" data-work-id="${work.id}" onclick="app.selectWork('${work.id}')">
                <div class="work-title">${this.escapeHtml(work.title)}</div>
                <div class="work-meta">
                    <span>${work.chapter_count || 0}章</span>
                    <span>${this.formatDate(work.updated_at)}</span>
                </div>
            </div>
        `).join('');

        worksList.innerHTML = html;
    }

    // 选择作品
    async selectWork(workId) {
        // 更新选中状态
        document.querySelectorAll('.work-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-work-id="${workId}"]`)?.classList.add('active');

        // 加载作品详情
        try {
            this.currentWork = this.works.find(w => w.id === workId);
            if (this.currentWork) {
                await this.showWorkDetail(this.currentWork);
            }
        } catch (error) {
            console.error('加载作品详情失败:', error);
            this.showError('加载作品详情失败');
        }
    }

    // 显示作品详情
    async showWorkDetail(work) {
        const panel = document.getElementById('work-detail-panel');
        const titleEl = document.getElementById('work-title');
        const infoEl = document.getElementById('work-info');

        if (titleEl) titleEl.textContent = work.title;
        
        if (infoEl) {
            infoEl.innerHTML = `
                <div class="work-meta-detail">
                    <p><strong>类型:</strong> ${work.genre || '未分类'}</p>
                    <p><strong>状态:</strong> ${this.getStatusText(work.status)}</p>
                    <p><strong>创建时间:</strong> ${this.formatDate(work.created_at)}</p>
                    <p><strong>更新时间:</strong> ${this.formatDate(work.updated_at)}</p>
                    <p><strong>章节数:</strong> ${work.chapter_count || 0}</p>
                    <p><strong>内容数:</strong> ${work.content_count || 0}</p>
                </div>
                <div class="work-description">
                    <h4>简介</h4>
                    <p>${work.description || '暂无简介'}</p>
                </div>
            `;
        }

        // 加载章节列表
        await this.loadChapters(work.id);

        // 显示面板
        panel?.classList.add('active');
    }

    // 加载章节列表
    async loadChapters(workId) {
        try {
            const result = await window.electronAPI.invoke('chapter:list', workId);
            if (result.success) {
                this.renderChaptersTree(result.chapters || []);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('加载章节列表失败:', error);
            const chaptersTree = document.getElementById('chapters-tree');
            if (chaptersTree) {
                chaptersTree.innerHTML = '<p class="error-text">加载章节失败</p>';
            }
        }
    }

    // 渲染章节树
    renderChaptersTree(chapters) {
        const chaptersTree = document.getElementById('chapters-tree');
        if (!chaptersTree) return;

        if (chapters.length === 0) {
            chaptersTree.innerHTML = `
                <div class="empty-state">
                    <p>还没有任何章节</p>
                    <button class="btn-small" onclick="app.showCreateChapterModal()">创建第一章</button>
                </div>
            `;
            return;
        }

        const html = chapters.map(chapter => `
            <div class="chapter-item level-${chapter.level}" data-chapter-id="${chapter.id}">
                <div class="chapter-title">${this.escapeHtml(chapter.title)}</div>
                <div class="chapter-meta">
                    ${chapter.type} · ${chapter.content_count || 0}内容 · ${this.formatDate(chapter.updated_at)}
                </div>
            </div>
        `).join('');

        chaptersTree.innerHTML = html;
    }

    // 隐藏作品详情面板
    hideWorkDetailPanel() {
        const panel = document.getElementById('work-detail-panel');
        panel?.classList.remove('active');
        this.currentWork = null;
    }

    // 加载统计信息
    async loadStats() {
        try {
            const result = await window.electronAPI.invoke('system:getStats');
            if (result.success) {
                this.stats = result.stats;
                this.renderStats();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('加载统计信息失败:', error);
            this.showError('加载统计信息失败');
        }
    }

    // 渲染统计信息
    renderStats() {
        const statsGrid = document.getElementById('stats-grid');
        if (!statsGrid) return;

        const html = `
            <div class="stat-item">
                <div class="stat-value">${this.stats.works || 0}</div>
                <div class="stat-label">作品</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${this.stats.chapters || 0}</div>
                <div class="stat-label">章节</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${this.stats.contents || 0}</div>
                <div class="stat-label">内容</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${this.stats.authors || 0}</div>
                <div class="stat-label">作者</div>
            </div>
        `;

        statsGrid.innerHTML = html;
    }

    // 显示创建作品模态框
    showCreateWorkModal() {
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');
        const modalConfirm = document.getElementById('modal-confirm');

        if (modalTitle) modalTitle.textContent = '创建新作品';
        
        if (modalBody) {
            modalBody.innerHTML = `
                <form id="create-work-form">
                    <div class="form-group">
                        <label class="form-label">作品标题 *</label>
                        <input type="text" class="form-input" id="work-title-input" placeholder="输入作品标题" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">作品简介</label>
                        <textarea class="form-input form-textarea" id="work-description-input" placeholder="简要描述您的作品"></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">类型</label>
                        <select class="form-select" id="work-genre-input">
                            <option value="">选择类型</option>
                            <option value="hard_sci_fi">硬科幻</option>
                            <option value="soft_sci_fi">软科幻</option>
                            <option value="space_opera">太空歌剧</option>
                            <option value="cyberpunk">赛博朋克</option>
                            <option value="dystopian">反乌托邦</option>
                            <option value="time_travel">时间旅行</option>
                            <option value="alien">外星人</option>
                            <option value="robot_ai">机器人/AI</option>
                        </select>
                    </div>
                </form>
            `;
        }

        // 更新确认按钮事件
        if (modalConfirm) {
            modalConfirm.onclick = () => this.createWork();
        }

        this.showModal();
    }

    // 创建作品
    async createWork() {
        const titleInput = document.getElementById('work-title-input');
        const descriptionInput = document.getElementById('work-description-input');
        const genreInput = document.getElementById('work-genre-input');

        const title = titleInput?.value.trim();
        if (!title) {
            this.showError('请输入作品标题');
            return;
        }

        try {
            const result = await window.electronAPI.invoke('project:create', {
                title,
                description: descriptionInput?.value.trim() || '',
                genre: genreInput?.value || '',
                authorId: 'user_mock_001'
            });

            if (result.success) {
                this.hideModal();
                await this.loadWorks();
                this.showSuccess('作品创建成功！');
                
                // 自动选择新创建的作品
                if (result.projectId) {
                    setTimeout(() => this.selectWork(result.projectId), 100);
                }
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('创建作品失败:', error);
            this.showError('创建作品失败: ' + error.message);
        }
    }

    // 显示创建章节模态框
    showCreateChapterModal() {
        if (!this.currentWork) {
            this.showError('请先选择一个作品');
            return;
        }

        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');
        const modalConfirm = document.getElementById('modal-confirm');

        if (modalTitle) modalTitle.textContent = '创建新章节';
        
        if (modalBody) {
            modalBody.innerHTML = `
                <form id="create-chapter-form">
                    <div class="form-group">
                        <label class="form-label">章节标题 *</label>
                        <input type="text" class="form-input" id="chapter-title-input" placeholder="输入章节标题" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">章节副标题</label>
                        <input type="text" class="form-input" id="chapter-subtitle-input" placeholder="输入章节副标题">
                    </div>
                    <div class="form-group">
                        <label class="form-label">章节描述</label>
                        <textarea class="form-input form-textarea" id="chapter-description-input" placeholder="描述本章节的内容"></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">章节类型</label>
                        <select class="form-select" id="chapter-type-input">
                            <option value="chapter">普通章节</option>
                            <option value="part">部分/卷</option>
                            <option value="section">小节</option>
                            <option value="prologue">序章</option>
                            <option value="epilogue">尾声</option>
                            <option value="appendix">附录</option>
                        </select>
                    </div>
                </form>
            `;
        }

        // 更新确认按钮事件
        if (modalConfirm) {
            modalConfirm.onclick = () => this.createChapter();
        }

        this.showModal();
    }

    // 创建章节
    async createChapter() {
        const titleInput = document.getElementById('chapter-title-input');
        const subtitleInput = document.getElementById('chapter-subtitle-input');
        const descriptionInput = document.getElementById('chapter-description-input');
        const typeInput = document.getElementById('chapter-type-input');

        const title = titleInput?.value.trim();
        if (!title) {
            this.showError('请输入章节标题');
            return;
        }

        if (!this.currentWork) {
            this.showError('请先选择一个作品');
            return;
        }

        try {
            const result = await window.electronAPI.invoke('chapter:create', {
                projectId: this.currentWork.id,
                title,
                subtitle: subtitleInput?.value.trim() || '',
                description: descriptionInput?.value.trim() || '',
                type: typeInput?.value || 'chapter',
                authorId: 'user_mock_001'
            });

            if (result.success) {
                this.hideModal();
                await this.loadChapters(this.currentWork.id);
                this.showSuccess('章节创建成功！');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('创建章节失败:', error);
            this.showError('创建章节失败: ' + error.message);
        }
    }

    // 打开性能测试
    openPerformanceTest() {
        // 在新窗口中打开性能测试页面
        window.open('test/database-performance.html', '_blank');
    }

    // 显示数据库结构
    showDatabaseSchema() {
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');

        if (modalTitle) modalTitle.textContent = '数据库结构';
        
        if (modalBody) {
            modalBody.innerHTML = `
                <div class="schema-info">
                    <h4>🗄️ 混合数据库架构</h4>
                    <p>当前使用 better-sqlite3 (同步) + Prisma (类型安全) 的混合架构</p>
                    
                    <h4>📊 数据表结构</h4>
                    <ul>
                        <li><strong>authors</strong> - 作者信息表</li>
                        <li><strong>works</strong> - 作品主表</li>
                        <li><strong>chapters</strong> - 章节表 (支持3层嵌套)</li>
                        <li><strong>contents</strong> - 内容表 (Delta格式)</li>
                        <li><strong>content_versions</strong> - 内容版本历史</li>
                        <li><strong>characters</strong> - 角色设定表</li>
                        <li><strong>worldbuilding</strong> - 世界观设定表</li>
                        <li><strong>blockchain_sync</strong> - 区块链同步记录</li>
                        <li><strong>collaboration_logs</strong> - 协作日志</li>
                    </ul>
                    
                    <h4>🔗 关系设计</h4>
                    <p>Authors → Works → Chapters → Contents</p>
                    <p>支持层次化章节结构和版本控制</p>
                </div>
                
                <style>
                .schema-info ul { margin: 10px 0; padding-left: 20px; }
                .schema-info li { margin: 4px 0; }
                .schema-info h4 { margin: 16px 0 8px 0; color: #e94560; }
                </style>
            `;
        }

        this.showModal();
    }

    // 显示模态框
    showModal() {
        const overlay = document.getElementById('modal-overlay');
        overlay?.style.setProperty('display', 'flex');
    }

    // 隐藏模态框
    hideModal() {
        const overlay = document.getElementById('modal-overlay');
        overlay?.style.setProperty('display', 'none');
    }

    // 显示成功消息
    showSuccess(message) {
        // 简单的成功提示实现
        const toast = document.createElement('div');
        toast.className = 'toast toast-success';
        toast.textContent = '✅ ' + message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // 显示错误消息
    showError(message) {
        // 简单的错误提示实现
        const toast = document.createElement('div');
        toast.className = 'toast toast-error';
        toast.textContent = '❌ ' + message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    // 工具方法
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(timestamp) {
        if (!timestamp) return '未知';
        const date = new Date(typeof timestamp === 'bigint' ? Number(timestamp) : timestamp);
        return date.toLocaleDateString('zh-CN');
    }

    getStatusText(status) {
        const statusMap = {
            'draft': '草稿',
            'writing': '创作中',
            'review': '审阅中',
            'completed': '已完成',
            'published': '已发布',
            'archived': '已归档'
        };
        return statusMap[status] || status;
    }
}

// 初始化应用
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new GestallApp();
});

// Toast样式
const toastStyles = `
    .toast {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 16px;
        border-radius: 6px;
        color: white;
        font-size: 14px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    }
    
    .toast-success {
        background: #4caf50;
    }
    
    .toast-error {
        background: #f44336;
    }
    
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;

// 注入Toast样式
const styleSheet = document.createElement('style');
styleSheet.textContent = toastStyles;
document.head.appendChild(styleSheet);