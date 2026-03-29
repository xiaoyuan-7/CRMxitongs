// ========== 数据管理器模块 ==========

import { storage } from '../utils/helpers.js';

export class DataManager {
    constructor() {
        this.companies = [];
        this.listeners = [];
        this.history = {
            opened: [],
            active: [],
            hq: []
        };
    }
    
    /**
     * 设置企业数据并通知所有监听器
     */
    setCompanies(data) {
        const oldStats = this.getStats();
        this.companies = data;
        this.notifyListeners();
        
        // 记录历史数据用于趋势计算
        this.recordHistory(oldStats);
    }
    
    /**
     * 记录历史数据
     */
    recordHistory(oldStats) {
        const now = Date.now();
        const newStats = this.getStats();
        
        // 只记录有变化的数据
        if (oldStats.opened !== newStats.opened) {
            this.history.opened.push({ value: newStats.opened, timestamp: now });
            if (this.history.opened.length > 10) this.history.opened.shift();
        }
        if (oldStats.active !== newStats.active) {
            this.history.active.push({ value: newStats.active, timestamp: now });
            if (this.history.active.length > 10) this.history.active.shift();
        }
        if (oldStats.hq !== newStats.hq) {
            this.history.hq.push({ value: newStats.hq, timestamp: now });
            if (this.history.hq.length > 10) this.history.hq.shift();
        }
    }
    
    /**
     * 获取趋势
     */
    getTrend(type) {
        const history = this.history[type] || [];
        if (history.length < 2) return { direction: 'flat', percent: 0 };
        
        const last = history[history.length - 1].value;
        const prev = history[history.length - 2].value;
        
        if (prev === 0) return { direction: 'flat', percent: 0 };
        
        const change = last - prev;
        const percent = Math.round((change / prev) * 100);
        
        return {
            direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat',
            percent: Math.abs(percent)
        };
    }
    
    /**
     * 获取当前统计数据
     */
    getStats() {
        return {
            total: this.companies.length,
            opened: this.getOpenedCount(),
            active: this.getActiveCount(),
            hq: this.getHqCount()
        };
    }
    
    /**
     * 添加数据更新监听器
     */
    addListener(callback) {
        this.listeners.push(callback);
    }
    
    /**
     * 通知所有监听器数据已更新
     */
    notifyListeners() {
        this.listeners.forEach(cb => {
            try {
                cb(this.companies);
            } catch (e) {
                console.error('DataManager listener error:', e);
            }
        });
    }
    
    /**
     * 获取企业数据
     */
    getCompanies() {
        return this.companies;
    }
    
    /**
     * 获取已开户数量
     */
    getOpenedCount() {
        return this.companies.filter(c => c.is_account_opened).length;
    }
    
    /**
     * 获取有效户总数（仅统计已落地企业）
     */
    getActiveCount() {
        const completed = this.companies.filter(c => c.landing_cycle === 'completed');
        return completed.reduce((sum, c) => sum + (c.active_count || 0), 0);
    }
    
    /**
     * 获取高质量客户总数（仅统计已落地企业）
     */
    getHqCount() {
        const completed = this.companies.filter(c => c.landing_cycle === 'completed');
        return completed.reduce((sum, c) => sum + (c.hq_count || 0), 0);
    }
    
    /**
     * 获取已落地企业数量
     */
    getCompletedCount() {
        return this.companies.filter(c => c.landing_cycle === 'completed').length;
    }
}

// 创建全局实例
export const dataManager = new DataManager();
