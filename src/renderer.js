// Gestell 渲染进程主脚本
let quillEditor = null;
let currentProject = null;
let currentChapter = null;

// DOM元素引用 - 在DOM加载后获取
let projectsList, newProjectBtn, newProjectModal, newProjectForm, createFirstProjectBtn;
let electronVersionEl, nodeVersionEl, dbStatusEl, ulidExampleEl;

// 早期暴露的函数 - 可以立即使用
window.showNewProjectModal = function() {
    console.log('🔄 早期showNewProjectModal被调用');
    const modal = document.getElementById('new-project-modal');
    if (modal) {
        modal.style.display = 'block';
        const titleInput = document.getElementById('project-title');
        if (titleInput) {
            titleInput.focus();
        }
        console.log('✅ 新项目模态框已显示');
    } else {
        console.error('❌ 新项目模态框元素未找到');
    }
};

window.hideNewProjectModal = function() {
    console.log('🔄 早期hideNewProjectModal被调用');
    const modal = document.getElementById('new-project-modal');
    if (modal) {
        modal.style.display = 'none';
        const form = document.getElementById('new-project-form');
        if (form) {
            form.reset();
        }
        console.log('✅ 新项目模态框已隐藏');
    }
};

// 初始化应用
async function initApp() {
    try {
        // 获取DOM元素引用
        initDOMReferences();
        
        // 测试API可用性
        console.log('测试 gestell API:', typeof gestell);
        console.log('测试 window API:', typeof gestell.window);
        
        // 检查Quill是否可用
        console.log('测试 Quill API:', typeof Quill);
        
        // 显示系统信息
        await loadSystemInfo();
        
        // 初始化编辑器 (如果Quill可用)
        if (typeof Quill !== 'undefined') {
            initQuillEditor();
        } else {
            console.warn('⚠️ Quill编辑器未加载，跳过编辑器初始化');
        }
        
        // 加载项目列表
        await loadProjects();
        
        // 绑定事件监听器
        bindEventListeners();
        
        console.log('🚀 Gestell应用初始化完成');
    } catch (error) {
        console.error('❌ 应用初始化失败:', error);
        showMessage('应用初始化失败: ' + error.message, 'error');
    }
}

// 初始化DOM元素引用
function initDOMReferences() {
    projectsList = document.getElementById('projects-list');
    newProjectBtn = document.getElementById('new-project-btn');
    newProjectModal = document.getElementById('new-project-modal');
    newProjectForm = document.getElementById('new-project-form');
    createFirstProjectBtn = document.getElementById('create-first-project');
    
    // 版本信息元素
    electronVersionEl = document.getElementById('electron-version');
    nodeVersionEl = document.getElementById('node-version');
    dbStatusEl = document.getElementById('db-status');
    ulidExampleEl = document.getElementById('ulid-example');
    
    console.log('🔗 DOM元素引用初始化:', {
        projectsList: !!projectsList,
        newProjectBtn: !!newProjectBtn,
        newProjectModal: !!newProjectModal,
        newProjectForm: !!newProjectForm
    });
}

// 加载系统信息
async function loadSystemInfo() {
    try {
        // 版本信息
        electronVersionEl.textContent = `Electron: ${await gestell.app.getVersion()}`;
        nodeVersionEl.textContent = `Node: ${await gestell.app.getNodeVersion()}`;
        
        // 数据库状态
        const statsResult = await gestell.system.getStats();
        if (statsResult.success) {
            dbStatusEl.textContent = `正常 (${statsResult.stats.projects || 0} 项目)`;
        } else {
            dbStatusEl.textContent = '连接失败';
        }
        
        // ULID示例
        const sampleUlid = await gestell.system.generateId();
        ulidExampleEl.textContent = sampleUlid;
        
    } catch (error) {
        console.error('加载系统信息失败:', error);
    }
}

// 初始化Quill编辑器
function initQuillEditor() {
    const editorElement = document.getElementById('quill-editor');
    if (!editorElement) return;

    quillEditor = new Quill('#quill-editor', {
        theme: 'snow',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'indent': '-1'}, { 'indent': '+1' }],
                ['blockquote', 'code-block'],
                ['link', 'image'],
                ['clean']
            ]
        },
        placeholder: '开始创作您的科幻故事...'
    });

    // 监听编辑器内容变化
    quillEditor.on('text-change', () => {
        updateWordCount();
    });

    console.log('📝 Quill编辑器初始化完成');
}

// 更新字数统计
function updateWordCount() {
    if (!quillEditor) return;
    
    const text = quillEditor.getText();
    const wordCount = text.trim().split(/\s+/).length;
    const charCount = text.length;
    
    const wordCountEl = document.getElementById('word-count');
    if (wordCountEl) {
        wordCountEl.textContent = `${wordCount} 词 / ${charCount} 字符`;
    }
}

// 加载项目列表
async function loadProjects() {
    try {
        projectsList.innerHTML = '<li class="nav-item loading">加载中...</li>';
        
        // TODO: 实现用户认证后，这里使用真实的用户ID
        const mockUserId = 'user_mock_001';
        const result = await gestell.project.list(mockUserId);
        
        if (result.success) {
            displayProjects(result.projects);
        } else {
            projectsList.innerHTML = '<li class="nav-item error">加载失败</li>';
        }
    } catch (error) {
        console.error('加载项目失败:', error);
        projectsList.innerHTML = '<li class="nav-item error">加载失败</li>';
    }
}

// 显示项目列表
function displayProjects(projects) {
    if (!projects || projects.length === 0) {
        projectsList.innerHTML = `
            <li class="nav-item empty">
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <span>还没有项目</span>
                    <small>开始您的科幻创作之旅</small>
                    <button class="btn btn-primary btn-sm" id="empty-create-btn" style="margin-top: 8px;">
                        ✨ 创建第一个项目
                    </button>
                </div>
            </li>
        `;
        
        // 为空状态的创建按钮绑定事件
        setTimeout(() => {
            const emptyCreateBtn = document.getElementById('empty-create-btn');
            emptyCreateBtn?.addEventListener('click', showNewProjectModal);
        }, 100);
        
        return;
    }

    const projectsHTML = projects.map(project => `
        <li class="nav-item project-item" data-project-id="${project.id}">
            <div class="project-info">
                <span class="project-title">${escapeHtml(project.title)}</span>
                <small class="project-genre">${getGenreLabel(project.genre)}</small>
                <div class="project-meta">
                    <span class="project-status">${getStatusLabel(project.status)}</span>
                    <span class="project-date">${formatDate(project.updated_at)}</span>
                </div>
            </div>
            <div class="project-actions">
                <button class="btn-icon" title="打开项目" data-action="open">📖</button>
                <button class="btn-icon" title="项目设置" data-action="settings">⚙️</button>
            </div>
        </li>
    `).join('');

    projectsList.innerHTML = projectsHTML;
    
    // 绑定项目点击事件
    document.querySelectorAll('.project-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const target = e.target;
            if (target.classList.contains('btn-icon')) {
                e.stopPropagation();
                const action = target.dataset.action;
                const projectId = item.dataset.projectId;
                
                if (action === 'open') {
                    openProject(projectId);
                } else if (action === 'settings') {
                    // TODO: 打开项目设置
                    showMessage('项目设置功能即将上线', 'info');
                }
            } else {
                // 点击项目项的其他区域也打开项目
                const projectId = item.dataset.projectId;
                openProject(projectId);
            }
        });
    });
}

// 获取类型标签
function getGenreLabel(genre) {
    const genreMap = {
        'hard-sci-fi': '硬科幻',
        'soft-sci-fi': '软科幻',
        'space-opera': '太空歌剧',
        'cyberpunk': '赛博朋克',
        'dystopian': '反乌托邦',
        'time-travel': '时间旅行',
        'alternate-history': '架空历史',
        'post-apocalyptic': '末世'
    };
    return genreMap[genre] || genre;
}

// 获取状态标签
function getStatusLabel(status) {
    const statusMap = {
        'draft': '草稿',
        'published': '已发布',
        'archived': '已归档'
    };
    return statusMap[status] || status;
}

// 格式化日期
function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return '今天';
    } else if (diffDays === 1) {
        return '昨天';
    } else if (diffDays < 7) {
        return `${diffDays}天前`;
    } else {
        return date.toLocaleDateString('zh-CN', { 
            month: 'short', 
            day: 'numeric' 
        });
    }
}

// 绑定事件监听器
function bindEventListeners() {
    console.log('🚀 开始绑定事件监听器...');
    
    // 窗口控制按钮已经通过HTML onclick属性绑定，这里不需要重复绑定
    console.log('ℹ️ 窗口控制按钮通过HTML onclick属性绑定');
    
    // 新建项目按钮事件绑定 - 添加调试信息
    console.log('📝 开始绑定项目按钮事件...');
    console.log('🔍 按钮元素状态:', {
        newProjectBtn: !!newProjectBtn,
        createFirstProjectBtn: !!createFirstProjectBtn,
        newProjectForm: !!newProjectForm
    });
    
    if (newProjectBtn) {
        newProjectBtn.addEventListener('click', function(e) {
            console.log('🆕 新建项目按钮被点击!');
            e.preventDefault();
            showNewProjectModal();
        });
        console.log('✅ 新建项目按钮事件已绑定');
    } else {
        console.error('❌ 新建项目按钮未找到!');
    }
    
    if (createFirstProjectBtn) {
        createFirstProjectBtn.addEventListener('click', function(e) {
            console.log('🆕 创建第一个项目按钮被点击!');
            e.preventDefault();
            showNewProjectModal();
        });
        console.log('✅ 创建第一个项目按钮事件已绑定');
    } else {
        console.log('ℹ️ 创建第一个项目按钮未找到(正常，页面可能有项目)');
    }
    
    // 项目创建表单
    if (newProjectForm) {
        newProjectForm.addEventListener('submit', handleCreateProject);
        console.log('✅ 项目创建表单事件已绑定');
    } else {
        console.error('❌ 项目创建表单未找到!');
    }
    
    // 全局点击调试 - 记录所有按钮点击
    document.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.classList.contains('btn')) {
            console.log('🖱️ 检测到按钮点击:', {
                id: e.target.id,
                classes: e.target.className,
                text: e.target.textContent.trim().substring(0, 20)
            });
        }
        
        // 模态框背景点击关闭
        if (e.target.classList.contains('modal') && newProjectModal) {
            hideNewProjectModal();
        }
    });
    
    // 绑定菜单事件
    bindMenuEvents();
    
    console.log('✅ 所有事件监听器绑定完成');
}

// 绑定菜单事件
function bindMenuEvents() {
    console.log('📋 开始绑定菜单事件...');
    
    // 菜单悬停效果
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        const label = item.querySelector('.menu-label');
        const dropdown = item.querySelector('.dropdown-menu');
        
        if (label && dropdown) {
            // 鼠标进入菜单项
            item.addEventListener('mouseenter', () => {
                // 关闭其他打开的菜单
                menuItems.forEach(otherItem => {
                    if (otherItem !== item) {
                        otherItem.classList.remove('active');
                    }
                });
                // 打开当前菜单
                item.classList.add('active');
            });
            
            // 鼠标离开菜单栏区域
            item.addEventListener('mouseleave', (e) => {
                // 延迟关闭，给用户时间移动到下拉菜单
                setTimeout(() => {
                    if (!item.matches(':hover')) {
                        item.classList.remove('active');
                    }
                }, 100);
            });
        }
    });
    
    // 菜单选项点击事件
    const menuOptions = document.querySelectorAll('.menu-option[data-action]');
    menuOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = option.getAttribute('data-action');
            handleMenuAction(action);
            
            // 关闭所有菜单
            menuItems.forEach(item => {
                item.classList.remove('active');
            });
        });
    });
    
    // 点击其他地方关闭菜单
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.menu-bar')) {
            menuItems.forEach(item => {
                item.classList.remove('active');
            });
        }
    });
    
    // 快捷键绑定
    bindKeyboardShortcuts();
    
    console.log('✅ 菜单事件绑定完成');
}

// 处理菜单操作
function handleMenuAction(action) {
    console.log(`🎯 执行菜单操作: ${action}`);
    
    switch (action) {
        // 文件菜单
        case 'new-project':
            showNewProjectModal();
            break;
        case 'open-project':
            // TODO: 实现打开项目
            showMessage('打开项目功能开发中...', 'info');
            break;
        case 'save':
            // TODO: 实现保存
            showMessage('保存功能开发中...', 'info');
            break;
        case 'save-as':
            // TODO: 实现另存为
            showMessage('另存为功能开发中...', 'info');
            break;
        case 'export':
            // TODO: 实现导出
            showMessage('导出功能开发中...', 'info');
            break;
        case 'import':
            // TODO: 实现导入
            showMessage('导入功能开发中...', 'info');
            break;
        case 'recent':
            // TODO: 实现最近项目
            showMessage('最近项目功能开发中...', 'info');
            break;
        case 'exit':
            gestell.window.close();
            break;
            
        // 编辑菜单
        case 'undo':
            if (quillEditor) {
                quillEditor.history.undo();
            }
            break;
        case 'redo':
            if (quillEditor) {
                quillEditor.history.redo();
            }
            break;
        case 'find':
            // TODO: 实现查找
            showMessage('查找功能开发中...', 'info');
            break;
        case 'replace':
            // TODO: 实现替换
            showMessage('替换功能开发中...', 'info');
            break;
            
        // 视图菜单
        case 'fullscreen':
            gestell.window.toggleFullscreen();
            break;
        case 'focus-mode':
            toggleFocusMode();
            break;
        case 'sidebar':
            toggleSidebar();
            break;
        case 'outline':
            switchView('outline');
            break;
        case 'preview':
            // TODO: 实现预览模式
            showMessage('预览模式开发中...', 'info');
            break;
        case 'zoom-in':
            adjustZoom(1.1);
            break;
        case 'zoom-out':
            adjustZoom(0.9);
            break;
        case 'zoom-reset':
            adjustZoom(1.0, true);
            break;
            
        // 工具菜单
        case 'characters':
            switchView('characters');
            break;
        case 'worldbuilding':
            switchView('worldbuilding');
            break;
        case 'timeline':
            // TODO: 实现时间线
            showMessage('时间线功能开发中...', 'info');
            break;
        case 'word-count':
            showWordCountStats();
            break;
        case 'spell-check':
            // TODO: 实现拼写检查
            showMessage('拼写检查功能开发中...', 'info');
            break;
        case 'blockchain':
            switchView('blockchain');
            break;
        case 'backup':
            // TODO: 实现备份管理
            showMessage('备份管理功能开发中...', 'info');
            break;
            
        // 帮助菜单
        case 'welcome':
            switchView('welcome');
            break;
        case 'shortcuts':
            showShortcutsHelp();
            break;
        case 'documentation':
            // TODO: 打开文档
            showMessage('使用文档功能开发中...', 'info');
            break;
        case 'updates':
            // TODO: 检查更新
            showMessage('检查更新功能开发中...', 'info');
            break;
        case 'about':
            showAboutDialog();
            break;
            
        default:
            console.warn(`未知的菜单操作: ${action}`);
            showMessage(`功能 "${action}" 开发中...`, 'info');
    }
}

// 绑定键盘快捷键
function bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl + 组合键
        if (e.ctrlKey) {
            switch (e.key.toLowerCase()) {
                case 'n':
                    e.preventDefault();
                    handleMenuAction('new-project');
                    break;
                case 'o':
                    e.preventDefault();
                    handleMenuAction('open-project');
                    break;
                case 's':
                    e.preventDefault();
                    if (e.shiftKey) {
                        handleMenuAction('save-as');
                    } else {
                        handleMenuAction('save');
                    }
                    break;
                case 'e':
                    e.preventDefault();
                    handleMenuAction('export');
                    break;
                case 'i':
                    e.preventDefault();
                    handleMenuAction('import');
                    break;
                case 'f':
                    e.preventDefault();
                    if (e.shiftKey) {
                        handleMenuAction('focus-mode');
                    } else {
                        handleMenuAction('find');
                    }
                    break;
                case 'h':
                    e.preventDefault();
                    if (e.shiftKey) {
                        handleMenuAction('welcome');
                    } else {
                        handleMenuAction('replace');
                    }
                    break;
                case 'b':
                    e.preventDefault();
                    if (e.shiftKey) {
                        handleMenuAction('blockchain');
                    } else {
                        handleMenuAction('sidebar');
                    }
                    break;
                case 'r':
                    e.preventDefault();
                    handleMenuAction('characters');
                    break;
                case 'w':
                    e.preventDefault();
                    if (e.shiftKey) {
                        handleMenuAction('word-count');
                    } else {
                        handleMenuAction('worldbuilding');
                    }
                    break;
                case 't':
                    e.preventDefault();
                    handleMenuAction('timeline');
                    break;
                case 'p':
                    e.preventDefault();
                    handleMenuAction('preview');
                    break;
                case '/':
                    e.preventDefault();
                    handleMenuAction('shortcuts');
                    break;
                case '=':
                case '+':
                    e.preventDefault();
                    handleMenuAction('zoom-in');
                    break;
                case '-':
                    e.preventDefault();
                    handleMenuAction('zoom-out');
                    break;
                case '0':
                    e.preventDefault();
                    handleMenuAction('zoom-reset');
                    break;
            }
        }
        
        // 功能键
        switch (e.key) {
            case 'F1':
                e.preventDefault();
                handleMenuAction('documentation');
                break;
            case 'F7':
                e.preventDefault();
                handleMenuAction('spell-check');
                break;
            case 'F11':
                e.preventDefault();
                handleMenuAction('fullscreen');
                break;
        }
        
        // Alt + F4
        if (e.altKey && e.key === 'F4') {
            e.preventDefault();
            handleMenuAction('exit');
        }
    });
}

// 显示新项目模态框 - 更新DOM引用版本
function showNewProjectModal() {
    console.log('🔄 showNewProjectModal 被调用 (DOM引用版本)');
    if (newProjectModal) {
        newProjectModal.style.display = 'block';
        const titleInput = document.getElementById('project-title');
        if (titleInput) {
            titleInput.focus();
        }
        console.log('✅ 新项目模态框已显示 (DOM引用版本)');
    } else {
        // 回退到直接DOM查询
        console.log('⚠️ 使用直接DOM查询作为回退');
        window.showNewProjectModal();
    }
}

// 隐藏新项目模态框 - 更新DOM引用版本
function hideNewProjectModal() {
    if (newProjectModal) {
        newProjectModal.style.display = 'none';
        newProjectForm?.reset();
    } else {
        // 回退到直接DOM查询
        window.hideNewProjectModal();
    }
}

// 处理项目创建
async function handleCreateProject(e) {
    e.preventDefault();
    
    try {
        // 直接从表单元素获取值
        const projectTitle = document.getElementById('project-title').value.trim();
        const projectDescription = document.getElementById('project-description').value.trim();
        const projectGenre = document.getElementById('project-genre').value;
        const collaborationMode = document.getElementById('collaboration-mode').value;
        
        const projectData = {
            title: projectTitle,
            description: projectDescription,
            genre: projectGenre,
            collaborationMode: collaborationMode,
            authorId: 'user_mock_001' // TODO: 使用真实用户ID
        };
        
        console.log('准备创建项目:', projectData);
        
        // 验证数据
        if (!projectData.title) {
            showMessage('请输入项目标题', 'error');
            document.getElementById('project-title').focus();
            return;
        }
        
        if (projectData.title.length < 2) {
            showMessage('项目标题至少需要2个字符', 'error');
            document.getElementById('project-title').focus();
            return;
        }
        
        showMessage('正在创建项目...', 'info');
        
        const result = await gestell.project.create(projectData);
        console.log('项目创建结果:', result);
        
        if (result.success) {
            showMessage('项目创建成功！', 'success');
            hideNewProjectModal();
            
            // 重置表单
            newProjectForm.reset();
            
            // 重新加载项目列表
            await loadProjects();
        } else {
            showMessage(`创建项目失败: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('创建项目时发生错误:', error);
        showMessage('创建项目时发生错误', 'error');
    }
}

// 处理项目点击
function handleProjectClick(e) {
    const projectItem = e.target.closest('.project-item');
    if (!projectItem) return;
    
    const projectId = projectItem.dataset.projectId;
    if (projectId) {
        openProject(projectId);
    }
}

// 打开项目
async function openProject(projectId) {
    try {
        currentProject = { id: projectId };
        showMessage('正在加载项目...', 'info');
        
        // 加载章节列表
        const result = await gestell.chapter.list(projectId);
        
        if (result.success) {
            // 如果有章节，打开第一个
            if (result.chapters.length > 0) {
                openChapter(result.chapters[0]);
            } else {
                // 创建第一个章节
                await createFirstChapter(projectId);
            }
            
            switchView('editor');
            showMessage('项目加载完成', 'success');
        } else {
            showMessage(`加载项目失败: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('打开项目失败:', error);
        showMessage('打开项目失败', 'error');
    }
}

// 创建第一个章节
async function createFirstChapter(projectId) {
    try {
        const chapterData = {
            projectId: projectId,
            title: '第一章',
            contentDelta: JSON.stringify(quillEditor.getContents()),
            contentHtml: quillEditor.root.innerHTML,
            orderIndex: 1,
            wordCount: 0,
            characterCount: 0
        };
        
        const result = await gestell.chapter.create(chapterData);
        
        if (result.success) {
            currentChapter = { 
                id: result.chapterId, 
                ...chapterData 
            };
            
            // 更新界面
            document.getElementById('chapter-title').value = chapterData.title;
        }
    } catch (error) {
        console.error('创建章节失败:', error);
    }
}

// 打开章节
function openChapter(chapter) {
    currentChapter = chapter;
    
    // 设置标题
    const titleInput = document.getElementById('chapter-title');
    if (titleInput) {
        titleInput.value = chapter.title;
    }
    
    // 设置内容
    if (quillEditor && chapter.content_delta) {
        try {
            const delta = JSON.parse(chapter.content_delta);
            quillEditor.setContents(delta);
        } catch (error) {
            console.error('加载章节内容失败:', error);
            quillEditor.setText(chapter.content_html || '');
        }
    }
    
    updateWordCount();
}

// 保存当前章节
async function saveCurrentChapter() {
    if (!currentChapter || !quillEditor) {
        showMessage('没有可保存的内容', 'warning');
        return;
    }
    
    try {
        showMessage('正在保存...', 'info');
        
        const titleInput = document.getElementById('chapter-title');
        const chapterData = {
            title: titleInput?.value || currentChapter.title,
            contentDelta: JSON.stringify(quillEditor.getContents()),
            contentHtml: quillEditor.root.innerHTML,
            wordCount: quillEditor.getText().trim().split(/\s+/).length,
            characterCount: quillEditor.getText().length
        };
        
        const result = await gestell.chapter.update(currentChapter.id, chapterData);
        
        if (result.success) {
            showMessage('保存成功', 'success');
            // 更新当前章节数据
            Object.assign(currentChapter, chapterData);
        } else {
            showMessage(`保存失败: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('保存章节失败:', error);
        showMessage('保存失败', 'error');
    }
}

// 切换视图
function switchView(viewName) {
    // 隐藏所有视图
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    
    // 显示目标视图
    const targetView = document.getElementById(`${viewName}-view`);
    if (targetView) {
        targetView.classList.add('active');
    }
    
    // 更新导航状态
    document.querySelectorAll('[data-view]').forEach(item => {
        item.classList.remove('active');
    });
    
    document.querySelector(`[data-view="${viewName}"]`)?.classList.add('active');
}

// 显示消息
function showMessage(message, type = 'info') {
    const statusMessage = document.getElementById('status-message');
    if (statusMessage) {
        statusMessage.textContent = message;
        statusMessage.className = `status-${type}`;
        
        // 3秒后恢复默认状态
        setTimeout(() => {
            statusMessage.textContent = '就绪';
            statusMessage.className = '';
        }, 3000);
    }
    
    console.log(`[${type.toUpperCase()}] ${message}`);
}

// HTML转义函数
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initApp);

// 错误处理
window.addEventListener('error', (e) => {
    console.error('页面错误:', e.error);
    showMessage('页面发生错误，请查看控制台', 'error');
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('未处理的Promise拒绝:', e.reason);
    showMessage('操作失败，请重试', 'error');
});

// 菜单辅助函数

// 切换专注模式
function toggleFocusMode() {
    const body = document.body;
    body.classList.toggle('focus-mode');
    const isFocusMode = body.classList.contains('focus-mode');
    showMessage(isFocusMode ? '已进入专注模式' : '已退出专注模式', 'info');
}

// 切换侧边栏
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.style.display = sidebar.style.display === 'none' ? 'block' : 'none';
        showMessage(sidebar.style.display === 'none' ? '侧边栏已隐藏' : '侧边栏已显示', 'info');
    }
}

// 调整缩放
function adjustZoom(factor, reset = false) {
    const currentZoom = reset ? 1.0 : parseFloat(document.body.style.zoom || '1') * factor;
    document.body.style.zoom = Math.max(0.5, Math.min(2.0, currentZoom));
    showMessage(`缩放: ${Math.round(currentZoom * 100)}%`, 'info');
}

// 显示字数统计
function showWordCountStats() {
    if (quillEditor) {
        const text = quillEditor.getText();
        const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
        const characters = text.length;
        const charactersNoSpaces = text.replace(/\s/g, '').length;
        
        const stats = `字数统计：
        总字数: ${words}
        总字符数: ${characters}
        字符数(不含空格): ${charactersNoSpaces}
        段落数: ${text.split('\n').filter(p => p.trim().length > 0).length}`;
        
        alert(stats);
    } else {
        showMessage('请先打开编辑器', 'warning');
    }
}

// 显示快捷键帮助
function showShortcutsHelp() {
    const shortcuts = `
Gestell 快捷键参考

文件操作：
Ctrl+N - 新建项目
Ctrl+O - 打开项目  
Ctrl+S - 保存
Ctrl+Shift+S - 另存为
Ctrl+E - 导出
Ctrl+I - 导入
Alt+F4 - 退出

编辑操作：
Ctrl+Z - 撤销
Ctrl+Y - 重做
Ctrl+X - 剪切
Ctrl+C - 复制
Ctrl+V - 粘贴
Ctrl+F - 查找
Ctrl+H - 替换

视图操作：
F11 - 全屏模式
Ctrl+Shift+F - 专注模式
Ctrl+B - 切换侧边栏
Ctrl+Shift+O - 大纲视图
Ctrl+P - 预览模式
Ctrl++ - 放大
Ctrl+- - 缩小
Ctrl+0 - 重置缩放

工具操作：
Ctrl+R - 角色管理
Ctrl+W - 世界观设定
Ctrl+T - 时间线
Ctrl+Shift+W - 字数统计
F7 - 拼写检查
Ctrl+Shift+B - 区块链同步

帮助：
Ctrl+Shift+H - 欢迎页面
Ctrl+/ - 快捷键参考
F1 - 使用文档
    `;
    
    alert(shortcuts);
}

// 显示关于对话框
function showAboutDialog() {
    const about = `
🌌 Gestell - 座架

版本: 0.1.0
去中心化的科幻小说创作平台

核心特性：
• 🔐 端到端加密保护
• ⛓️ 区块链版权验证  
• 🤝 安全协作创作
• 📝 智能写作辅助
• 🌍 去中心化存储

技术栈：
• Electron + SQLite3
• Quill.js 富文本编辑器
• 加密算法：AES-256
• 区块链：支持多链

开发者：Unity
许可证：MIT License

© 2025 Gestell Project
    `;
    
    alert(about);
}