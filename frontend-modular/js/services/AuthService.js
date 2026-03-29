// ========== 权限认证服务模块 ==========

import { storage } from '../utils/helpers.js';

/**
 * 用户角色定义
 */
export const ROLES = {
    ADMIN: 'admin',           // 管理员 - 所有权限
    MANAGER: 'manager',       // 经理 - 查看 + 编辑
    SALES: 'sales',          // 销售 - 查看 + 部分编辑
    VIEWER: 'viewer'         // 观察员 - 只读
};

/**
 * 权限定义
 */
export const PERMISSIONS = {
    // 企业相关
    COMPANY_VIEW: 'company:view',
    COMPANY_CREATE: 'company:create',
    COMPANY_EDIT: 'company:edit',
    COMPANY_DELETE: 'company:delete',
    COMPANY_EXPORT: 'company:export',
    
    // 任务相关
    TASK_VIEW: 'task:view',
    TASK_CREATE: 'task:create',
    TASK_EDIT: 'task:edit',
    TASK_DELETE: 'task:delete',
    
    // 线索相关
    LEAD_VIEW: 'lead:view',
    LEAD_CREATE: 'lead:create',
    LEAD_EDIT: 'lead:edit',
    LEAD_DELETE: 'lead:delete',
    
    // 系统相关
    USER_MANAGE: 'user:manage',
    SYSTEM_CONFIG: 'system:config'
};

/**
 * 角色权限映射
 */
const ROLE_PERMISSIONS = {
    [ROLES.ADMIN]: Object.values(PERMISSIONS),
    
    [ROLES.MANAGER]: [
        PERMISSIONS.COMPANY_VIEW,
        PERMISSIONS.COMPANY_CREATE,
        PERMISSIONS.COMPANY_EDIT,
        PERMISSIONS.TASK_VIEW,
        PERMISSIONS.TASK_CREATE,
        PERMISSIONS.TASK_EDIT,
        PERMISSIONS.LEAD_VIEW,
        PERMISSIONS.LEAD_CREATE,
        PERMISSIONS.LEAD_EDIT,
        PERMISSIONS.COMPANY_EXPORT
    ],
    
    [ROLES.SALES]: [
        PERMISSIONS.COMPANY_VIEW,
        PERMISSIONS.COMPANY_EDIT,
        PERMISSIONS.TASK_VIEW,
        PERMISSIONS.TASK_EDIT,
        PERMISSIONS.LEAD_VIEW,
        PERMISSIONS.LEAD_EDIT
    ],
    
    [ROLES.VIEWER]: [
        PERMISSIONS.COMPANY_VIEW,
        PERMISSIONS.TASK_VIEW,
        PERMISSIONS.LEAD_VIEW
    ]
};

/**
 * 认证服务类
 */
class AuthService {
    constructor() {
        this.currentUser = null;
        this.LOGIN_KEY = 'crm_auth_user';
        this.SESSION_TIMEOUT = 8 * 60 * 60 * 1000; // 8 小时
    }
    
    /**
     * 用户登录
     */
    async login(username, password) {
        try {
            // 模拟登录验证（实际项目应调用后端 API）
            const user = await this._authenticate(username, password);
            
            if (user) {
                user.loginTime = Date.now();
                this.currentUser = user;
                storage.set(this.LOGIN_KEY, user);
                return { success: true, user };
            }
            
            return { success: false, message: '用户名或密码错误' };
        } catch (error) {
            console.error('[AuthService] login error:', error);
            return { success: false, message: '登录失败，请稍后重试' };
        }
    }
    
    /**
     * 模拟认证（实际应调用后端）
     */
    async _authenticate(username, password) {
        // 模拟延迟
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 演示用账户（实际应从后端获取）
        const users = [
            { id: 1, username: 'admin', password: 'admin123', name: '管理员', role: ROLES.ADMIN },
            { id: 2, username: 'manager', password: 'manager123', name: '经理', role: ROLES.MANAGER },
            { id: 3, username: 'sales', password: 'sales123', name: '销售', role: ROLES.SALES },
            { id: 4, username: 'viewer', password: 'viewer123', name: '观察员', role: ROLES.VIEWER }
        ];
        
        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
            // 移除密码字段
            const { password, ...safeUser } = user;
            return safeUser;
        }
        
        return null;
    }
    
    /**
     * 用户登出
     */
    logout() {
        this.currentUser = null;
        storage.remove(this.LOGIN_KEY);
        window.location.reload();
    }
    
    /**
     * 获取当前用户
     */
    getCurrentUser() {
        if (!this.currentUser) {
            this.currentUser = storage.get(this.LOGIN_KEY);
        }
        
        // 检查会话是否过期
        if (this.currentUser && this.currentUser.loginTime) {
            const now = Date.now();
            if (now - this.currentUser.loginTime > this.SESSION_TIMEOUT) {
                this.logout();
                return null;
            }
        }
        
        return this.currentUser;
    }
    
    /**
     * 检查是否已登录
     */
    isAuthenticated() {
        return !!this.getCurrentUser();
    }
    
    /**
     * 检查是否有指定权限
     */
    hasPermission(permission) {
        const user = this.getCurrentUser();
        if (!user) return false;
        
        const permissions = ROLE_PERMISSIONS[user.role] || [];
        return permissions.includes(permission);
    }
    
    /**
     * 检查是否有任一权限
     */
    hasAnyPermission(permissions) {
        return permissions.some(p => this.hasPermission(p));
    }
    
    /**
     * 检查是否有所有权限
     */
    hasAllPermissions(permissions) {
        return permissions.every(p => this.hasPermission(p));
    }
    
    /**
     * 检查角色
     */
    hasRole(role) {
        const user = this.getCurrentUser();
        return user && user.role === role;
    }
    
    /**
     * 检查是否有任一角色
     */
    hasAnyRole(roles) {
        const user = this.getCurrentUser();
        return user && roles.includes(user.role);
    }
    
    /**
     * 获取用户角色
     */
    getRole() {
        const user = this.getCurrentUser();
        return user ? user.role : null;
    }
    
    /**
     * 权限守卫 - 用于按钮/功能显示控制
     */
    guard(permission, element) {
        if (!this.hasPermission(permission)) {
            if (element) {
                element.style.display = 'none';
                element.disabled = true;
            }
            return false;
        }
        return true;
    }
    
    /**
     * 权限守卫 - 用于页面访问控制
     */
    guardPage(requiredPermission) {
        if (!this.isAuthenticated()) {
            this.showLoginModal();
            return false;
        }
        
        if (!this.hasPermission(requiredPermission)) {
            this.showAccessDenied();
            return false;
        }
        
        return true;
    }
    
    /**
     * 显示登录框
     */
    showLoginModal() {
        // 创建登录模态框
        const modal = document.createElement('div');
        modal.id = 'loginModal';
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:400px;">
                <div class="modal-header">
                    <h2>🔐 用户登录</h2>
                </div>
                <div class="modal-body">
                    <form id="loginForm">
                        <div class="info-item">
                            <label>用户名</label>
                            <input type="text" id="loginUsername" required placeholder="请输入用户名">
                        </div>
                        <div class="info-item">
                            <label>密码</label>
                            <input type="password" id="loginPassword" required placeholder="请输入密码">
                        </div>
                        <div style="margin-top:16px;display:flex;gap:12px;justify-content:flex-end;">
                            <button type="submit" class="btn btn-primary" style="flex:1;">登录</button>
                        </div>
                    </form>
                    <div style="margin-top:16px;padding:12px;background:#f0f9ff;border-radius:6px;font-size:12px;color:#0369a1;">
                        <strong>演示账户：</strong><br>
                        管理员：admin / admin123<br>
                        经理：manager / manager123<br>
                        销售：sales / sales123<br>
                        观察员：viewer / viewer123
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 绑定登录事件
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;
            
            const result = await this.login(username, password);
            
            if (result.success) {
                modal.remove();
                window.location.reload();
            } else {
                alert(result.message);
            }
        });
    }
    
    /**
     * 显示访问拒绝
     */
    showAccessDenied() {
        alert('❌ 您没有权限访问此功能，请联系管理员');
    }
    
    /**
     * 显示用户信息
     */
    showUserInfo(containerId) {
        const user = this.getCurrentUser();
        const container = document.getElementById(containerId);
        
        if (!container || !user) return;
        
        container.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:14px;">👤 ${user.name}</span>
                <span class="badge badge-blue">${this.getRoleName(user.role)}</span>
                <button class="btn btn-sm btn-secondary" onclick="authService.logout()" style="margin-left:8px;">退出</button>
            </div>
        `;
    }
    
    /**
     * 获取角色名称
     */
    getRoleName(role) {
        const names = {
            [ROLES.ADMIN]: '管理员',
            [ROLES.MANAGER]: '经理',
            [ROLES.SALES]: '销售',
            [ROLES.VIEWER]: '观察员'
        };
        return names[role] || role;
    }
    
    /**
     * 初始化权限控制
     */
    init() {
        if (!this.isAuthenticated()) {
            this.showLoginModal();
            return false;
        }
        
        // 显示用户信息
        this.showUserInfo('userInfo');
        
        // 初始化权限守卫
        this.initGuards();
        
        return true;
    }
    
    /**
     * 初始化所有权限守卫
     */
    initGuards() {
        // 企业相关
        this.guard(PERMISSIONS.COMPANY_CREATE, document.querySelector('[data-permission="company:create"]'));
        this.guard(PERMISSIONS.COMPANY_EDIT, document.querySelector('[data-permission="company:edit"]'));
        this.guard(PERMISSIONS.COMPANY_DELETE, document.querySelector('[data-permission="company:delete"]'));
        this.guard(PERMISSIONS.COMPANY_EXPORT, document.querySelector('[data-permission="company:export"]'));
        
        // 任务相关
        this.guard(PERMISSIONS.TASK_CREATE, document.querySelector('[data-permission="task:create"]'));
        this.guard(PERMISSIONS.TASK_EDIT, document.querySelector('[data-permission="task:edit"]'));
        this.guard(PERMISSIONS.TASK_DELETE, document.querySelector('[data-permission="task:delete"]'));
        
        // 线索相关
        this.guard(PERMISSIONS.LEAD_CREATE, document.querySelector('[data-permission="lead:create"]'));
        this.guard(PERMISSIONS.LEAD_EDIT, document.querySelector('[data-permission="lead:edit"]'));
        this.guard(PERMISSIONS.LEAD_DELETE, document.querySelector('[data-permission="lead:delete"]'));
    }
}

// 创建全局实例
export const authService = new AuthService();

// 导出供全局使用
window.authService = authService;
