// ========== API 服务模块 ==========

/**
 * API 缓存管理器
 */
class ApiCache {
    constructor() {
        this.cache = {};
        this.TTL = 5 * 60 * 1000; // 5 分钟默认缓存时间
    }
    
    /**
     * 生成缓存键
     */
    _getKey(endpoint, params = {}) {
        return `${endpoint}:${JSON.stringify(params)}`;
    }
    
    /**
     * 检查缓存是否有效
     */
    isValid(key) {
        const item = this.cache[key];
        return item && (Date.now() - item.timestamp < this.TTL);
    }
    
    /**
     * 获取缓存数据
     */
    get(key) {
        if (this.isValid(key)) {
            return this.cache[key].data;
        }
        return null;
    }
    
    /**
     * 设置缓存
     */
    set(key, data) {
        this.cache[key] = {
            data,
            timestamp: Date.now()
        };
    }
    
    /**
     * 清除缓存
     */
    clear(endpoint) {
        Object.keys(this.cache).forEach(key => {
            if (key.startsWith(endpoint)) {
                delete this.cache[key];
            }
        });
    }
    
    /**
     * 清除所有缓存
     */
    clearAll() {
        this.cache = {};
    }
}

/**
 * API 请求控制器（取消过期请求）
 */
class RequestController {
    constructor() {
        this.controllers = new Map();
    }
    
    /**
     * 创建或获取请求控制器
     */
    getController(key) {
        // 如果已有相同请求，取消它
        if (this.controllers.has(key)) {
            this.controllers.get(key).abort();
        }
        
        const controller = new AbortController();
        this.controllers.set(key, controller);
        return controller;
    }
    
    /**
     * 清除请求控制器
     */
    clear(key) {
        this.controllers.delete(key);
    }
    
    /**
     * 清除所有请求控制器
     */
    clearAll() {
        this.controllers.forEach(controller => {
            try {
                controller.abort();
            } catch (e) {}
        });
        this.controllers.clear();
    }
}

// 创建全局实例
const apiCache = new ApiCache();
const requestController = new RequestController();

/**
 * 带缓存和取消功能的 API 请求函数
 */
export async function fetchWithCache(endpoint, options = {}, useCache = true) {
    const cacheKey = apiCache._getKey(endpoint, options.params);
    const requestKey = `req:${cacheKey}`;
    
    // 尝试从缓存获取
    if (useCache) {
        const cached = apiCache.get(cacheKey);
        if (cached) {
            console.log(`[Cache Hit] ${endpoint}`);
            return cached;
        }
    }
    
    console.log(`[Cache Miss] ${endpoint}`);
    
    // 获取请求控制器（会自动取消相同请求）
    const controller = requestController.getController(requestKey);
    
    try {
        const res = await fetch(`/api${endpoint}`, {
            ...options,
            signal: controller.signal
        });
        const data = await res.json();
        
        // 缓存 GET 请求结果
        if (useCache && (!options.method || options.method === 'GET')) {
            apiCache.set(cacheKey, data);
        }
        
        requestController.clear(requestKey);
        return data;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log(`[Request Cancelled] ${endpoint}`);
            throw new Error('请求已取消');
        }
        throw error;
    }
}

/**
 * 企业数据服务
 */
export const companyService = {
    async getAll() {
        return fetchWithCache('/companies', {}, true);
    },
    
    async getById(id) {
        return fetchWithCache(`/companies/${id}`, {}, true);
    },
    
    async create(data) {
        return fetchWithCache('/companies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }, false);
    },
    
    async update(id, data) {
        return fetchWithCache(`/companies/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }, false);
    },
    
    async delete(id) {
        return fetchWithCache(`/companies/${id}`, {
            method: 'DELETE'
        }, false);
    }
};

/**
 * 任务数据服务
 */
export const taskService = {
    async getAll() {
        return fetchWithCache('/marketing-tasks', {}, true);
    },
    
    async create(data) {
        return fetchWithCache('/marketing-tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }, false);
    },
    
    async update(id, data) {
        return fetchWithCache(`/marketing-tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }, false);
    },
    
    async delete(id) {
        return fetchWithCache(`/marketing-tasks/${id}`, {
            method: 'DELETE'
        }, false);
    }
};

/**
 * 周计划数据服务
 */
export const weekTaskService = {
    async getAll() {
        return fetchWithCache('/week-tasks', {}, true);
    },
    
    async create(data) {
        return fetchWithCache('/week-tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }, false);
    },
    
    async update(id, data) {
        return fetchWithCache(`/week-tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }, false);
    },
    
    async delete(id) {
        return fetchWithCache(`/week-tasks/${id}`, {
            method: 'DELETE'
        }, false);
    }
};

/**
 * 线索数据服务
 */
export const leadService = {
    async getBoards() {
        return fetchWithCache('/leads/boards', {}, true);
    },
    
    async getLeadsByBoard(boardId) {
        return fetchWithCache(`/leads/boards/${boardId}/leads`, {}, true);
    },
    
    async create(data) {
        return fetchWithCache('/leads/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }, false);
    },
    
    async update(id, data) {
        return fetchWithCache(`/leads/leads/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }, false);
    },
    
    async delete(id) {
        return fetchWithCache(`/leads/leads/${id}`, {
            method: 'DELETE'
        }, false);
    }
};
