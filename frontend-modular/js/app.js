// ========== CRM 系统主入口 ==========

import { dataManager } from './managers/DataManager.js';
import { fetchWithCache, companyService, taskService, weekTaskService, leadService } from './services/ApiService.js';
import { authService } from './services/AuthService.js';
import { debounce, throttle, storage } from './utils/helpers.js';
import { updateStatCard, updateCircleProgress, updateProgressBar, renderCompaniesTable, renderTodoDropdown } from './components/UIComponents.js';

// ========== 全局状态 ==========
const state = {
    currentTaskId: null,
    currentLeadBoardId: null,
    targets: storage.get('crm_targets', {}),
    contactFreqUpdated: false
};

// ========== 初始化函数 ==========
async function init() {
    try {
        // 1. 初始化权限系统（会显示登录框）
        if (!authService.init()) {
            return;
        }
        
        // 2. 加载企业数据
        await loadData();
        
        // 3. 加载其他模块数据
        await Promise.all([
            loadLeadBoards(),
            loadLeads(),
            loadTasks()
        ]);
        
        // 4. 初始化组件
        initWeekSelect();
        updateTargetsDisplay();
        loadWeekPlan();
        
        // 5. 默认显示线索板块列表
        const boardsList = document.getElementById('leadBoardsList');
        const leadsContent = document.getElementById('leadsContent');
        if (boardsList) boardsList.style.display = 'block';
        if (leadsContent) leadsContent.style.display = 'none';
        state.currentLeadBoardId = null;
        
        // 6. 更新待办提醒
        updateWeekTaskSummary();
        
        // 7. 初始化权限守卫
        initPermissionGuards();
        
        console.log('[App] 初始化完成');
    } catch (error) {
        console.error('[App] 初始化失败:', error);
    }
}

// ========== 权限守卫初始化 ==========
function initPermissionGuards() {
    // 企业相关按钮
    document.querySelectorAll('[data-permission="company:create"]').forEach(el => {
        if (!authService.hasPermission('company:create')) {
            el.style.display = 'none';
        }
    });
    
    document.querySelectorAll('[data-permission="company:edit"]').forEach(el => {
        if (!authService.hasPermission('company:edit')) {
            el.disabled = true;
        }
    });
    
    document.querySelectorAll('[data-permission="company:delete"]').forEach(el => {
        if (!authService.hasPermission('company:delete')) {
            el.style.display = 'none';
        }
    });
    
    document.querySelectorAll('[data-permission="company:export"]').forEach(el => {
        if (!authService.hasPermission('company:export')) {
            el.style.display = 'none';
        }
    });
    
    // 任务相关按钮
    document.querySelectorAll('[data-permission="task:create"]').forEach(el => {
        if (!authService.hasPermission('task:create')) {
            el.style.display = 'none';
        }
    });
    
    document.querySelectorAll('[data-permission="task:delete"]').forEach(el => {
        if (!authService.hasPermission('task:delete')) {
            el.style.display = 'none';
        }
    });
    
    // 线索相关按钮
    document.querySelectorAll('[data-permission="lead:create"]').forEach(el => {
        if (!authService.hasPermission('lead:create')) {
            el.style.display = 'none';
        }
    });
    
    document.querySelectorAll('[data-permission="lead:delete"]').forEach(el => {
        if (!authService.hasPermission('lead:delete')) {
            el.style.display = 'none';
        }
    });
}

// ========== 数据加载函数 ==========
async function loadData() {
    showLoading('正在加载企业数据...');
    try {
        const allCompanies = await companyService.getAll();
        dataManager.setCompanies(allCompanies);
        
        // 首次加载时自动更新联系频次
        if (!state.contactFreqUpdated) {
            await updateAllContactFrequency();
            state.contactFreqUpdated = true;
        }
        
        // 保持当前排序
        const currentSort = document.getElementById('sortSelect')?.value;
        if (currentSort && currentSort !== 'default') {
            sortCompanies(currentSort);
        } else {
            renderCompaniesTable(dataManager.getCompanies());
        }
    } catch (error) {
        console.error('[loadData] 加载失败:', error);
        const table = document.getElementById('companiesTable');
        if (table) {
            table.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#ef4444;">加载失败，请刷新页面重试</td></tr>';
        }
        showError('加载企业数据失败', 'loadData');
    } finally {
        hideLoading();
    }
}

async function loadTasks() {
    showLoading('正在加载任务...');
    try {
        const tasks = await taskService.getAll();
        window.allTasks = tasks;
        renderTasks();
        updateTaskFilterSelect();
    } catch (error) {
        console.error('[loadTasks] 加载失败:', error);
        window.allTasks = [];
        renderTasks();
        showError('加载任务失败，请刷新页面重试', 'loadTasks');
    } finally {
        hideLoading();
    }
}

async function loadWeekPlan() {
    const weekStart = document.getElementById('weekSelect')?.value;
    const week = getWeekInfoFromStart(weekStart);
    const container = document.getElementById('weekPlan');
    
    try {
        const tasks = await weekTaskService.getAll();
        window.allWeekTasks = tasks;
        window.allTodos = tasks;
        updateWeekTaskSummary();
        renderWeekTaskList();
    } catch (error) {
        console.error('[loadWeekPlan] 加载失败:', error);
        window.allWeekTasks = [];
        window.allTodos = [];
    }
    
    if (!window.allWeekTasks.length) {
        container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#999;">本周暂无待办，点击"添加待办"开始规划</div>';
        return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    container.innerHTML = week.days.map((date, i) => {
        const isToday = date === today;
        const tasks = window.allWeekTasks.filter(t => t.plan_date === date);
        const amTasks = tasks.filter(t => t.time_period === 'am');
        const pmTasks = tasks.filter(t => t.time_period === 'pm');
        
        return `
            <div class="day-card ${isToday?'today':''}">
                <h4>${weekDays[i]} ${date.substr(5)}</h4>
                <div class="day-tasks">
                    ${renderDayTasks(amTasks, '上午')}
                    ${renderDayTasks(pmTasks, '下午')}
                </div>
            </div>
        `;
    }).join('');
}

async function loadLeadBoards() {
    try {
        const boards = await leadService.getBoards();
        window.allLeadBoards = boards;
        renderLeadBoards();
    } catch (error) {
        console.error('[loadLeadBoards] 加载失败:', error);
        window.allLeadBoards = [];
    }
}

async function loadLeads() {
    if (!state.currentLeadBoardId) return;
    await viewLeadBoard(state.currentLeadBoardId);
}

// ========== 搜索历史管理 ==========
const SEARCH_HISTORY_KEY = 'crm_search_history';
const MAX_HISTORY = 10;

function getSearchHistory() {
    return storage.get(SEARCH_HISTORY_KEY, []);
}

function saveSearchHistory(query) {
    if (!query || query.trim().length === 0) return;
    
    let history = getSearchHistory();
    history = history.filter(item => item !== query);
    history.unshift(query);
    if (history.length > MAX_HISTORY) {
        history = history.slice(0, MAX_HISTORY);
    }
    storage.set(SEARCH_HISTORY_KEY, history);
}

function renderSearchHistory() {
    const dropdown = document.getElementById('searchHistoryDropdown');
    const history = getSearchHistory();
    
    if (history.length === 0) {
        dropdown?.classList.remove('active');
        return;
    }
    
    if (dropdown) {
        dropdown.innerHTML = history.map(item => `
            <div class="search-history-item" onclick="selectHistoryItem('${item.replace(/'/g, "\\'")}')">
                <span class="search-history-text">🔍 ${escapeHtml(item)}</span>
                <span class="search-history-delete" onclick="deleteSearchHistoryItem('${item.replace(/'/g, "\\'")}', event)">✕</span>
            </div>
        `).join('') + `<div class="search-history-clear" onclick="clearSearchHistory()">清空搜索历史</div>`;
        
        dropdown.classList.add('active');
    }
}

function deleteSearchHistoryItem(query, event) {
    event.stopPropagation();
    let history = getSearchHistory();
    history = history.filter(item => item !== query);
    storage.set(SEARCH_HISTORY_KEY, history);
    renderSearchHistory();
}

function clearSearchHistory() {
    storage.remove(SEARCH_HISTORY_KEY);
    renderSearchHistory();
}

function selectHistoryItem(query) {
    const input = document.getElementById('searchInput');
    if (input) {
        input.value = query;
        filterCompanies();
        saveSearchHistory(query);
        document.getElementById('searchHistoryDropdown')?.classList.remove('active');
    }
}

// ========== 标签页切换 ==========
async function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target?.classList.add('active');
    
    ['leads','tasks','companies','referrals','todo','weekly','reminders'].forEach(t => { 
        const el = document.getElementById(t+'Tab');
        if (el) el.style.display = t===tab?'block':'none';
    });
    
    switch(tab) {
        case 'companies':
            loadData();
            updateWeekTaskSummary();
            break;
        case 'leads':
            loadLeadBoards();
            updateWeekTaskSummary();
            // 显示板块列表
            const boardsList = document.getElementById('leadBoardsList');
            const leadsContent = document.getElementById('leadsContent');
            if (boardsList) boardsList.style.display = 'block';
            if (leadsContent) leadsContent.style.display = 'none';
            state.currentLeadBoardId = null;
            break;
        case 'tasks':
            loadTasks();
            updateWeekTaskSummary();
            break;
        case 'referrals':
            loadReferrals();
            updateWeekTaskSummary();
            break;
        case 'weekly':
            loadWeekPlan();
            updateWeekTaskSummary();
            break;
        case 'reminders':
            loadReminders();
            updateWeekTaskSummary();
            break;
        case 'todo':
            loadTodos();
            updateWeekTaskSummary();
            break;
    }
}

// ========== UI 辅助函数 ==========
function showLoading(message = '加载中...') {
    const loading = document.getElementById('globalLoading');
    const loadingText = document.getElementById('loadingText');
    if (loading && loadingText) {
        loadingText.textContent = message;
        loading.classList.add('active');
    }
}

function hideLoading() {
    const loading = document.getElementById('globalLoading');
    if (loading) {
        loading.classList.remove('active');
    }
}

function showError(message, context = '') {
    if (context) {
        console.error(`[${context}]`, message);
    }
    alert(message);
}

// ========== 导出全局函数 ==========
window.init = init;
window.switchTab = switchTab;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.showError = showError;
window.saveSearchHistory = saveSearchHistory;
window.renderSearchHistory = renderSearchHistory;
window.deleteSearchHistoryItem = deleteSearchHistoryItem;
window.clearSearchHistory = clearSearchHistory;
window.selectHistoryItem = selectHistoryItem;

// ========== 启动应用 ==========
document.addEventListener('DOMContentLoaded', () => {
    init();
});
