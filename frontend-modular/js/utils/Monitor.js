// ========== 系统监控模块 ==========

/**
 * 性能监控类
 */
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            pageLoadTime: 0,
            apiResponseTimes: [],
            errorCount: 0,
            userActions: []
        };
        this.startTime = performance.now();
    }
    
    /**
     * 初始化监控
     */
    init() {
        this.trackPageLoad();
        this.trackErrors();
        this.trackUserActions();
        this.reportPeriodically();
    }
    
    /**
     * 追踪页面加载时间
     */
    trackPageLoad() {
        window.addEventListener('load', () => {
            const loadTime = performance.now() - this.startTime;
            this.metrics.pageLoadTime = loadTime;
            console.log(`[Monitor] Page loaded in ${loadTime.toFixed(2)}ms`);
            
            // 发送到监控服务器（如果有）
            this.sendMetric('page_load', loadTime);
        });
    }
    
    /**
     * 追踪 API 响应时间
     */
    trackApiRequest(url, startTime, endTime, success = true) {
        const duration = endTime - startTime;
        this.metrics.apiResponseTimes.push({
            url,
            duration,
            success,
            timestamp: Date.now()
        });
        
        // 保留最近 100 条记录
        if (this.metrics.apiResponseTimes.length > 100) {
            this.metrics.apiResponseTimes.shift();
        }
        
        console.log(`[Monitor] API ${success ? '✓' : '✗'} ${url} - ${duration.toFixed(2)}ms`);
        
        // 慢请求告警（> 3 秒）
        if (duration > 3000) {
            this.sendAlert('slow_api', { url, duration });
        }
    }
    
    /**
     * 追踪错误
     */
    trackErrors() {
        window.addEventListener('error', (event) => {
            this.metrics.errorCount++;
            
            const errorData = {
                message: event.message,
                source: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack,
                timestamp: Date.now()
            };
            
            console.error('[Monitor] Error:', errorData);
            this.sendMetric('error', errorData);
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            this.metrics.errorCount++;
            
            const errorData = {
                type: 'unhandledrejection',
                reason: event.reason?.message || event.reason,
                timestamp: Date.now()
            };
            
            console.error('[Monitor] Unhandled Promise Rejection:', errorData);
            this.sendMetric('error', errorData);
        });
    }
    
    /**
     * 追踪用户行为
     */
    trackUserActions() {
        // 点击事件
        document.addEventListener('click', (event) => {
            const target = event.target;
            const action = {
                type: 'click',
                target: target.tagName,
                text: target.textContent?.substring(0, 50),
                timestamp: Date.now()
            };
            
            this.metrics.userActions.push(action);
            
            // 保留最近 50 条记录
            if (this.metrics.userActions.length > 50) {
                this.metrics.userActions.shift();
            }
        });
        
        // 页面切换
        const originalSwitchTab = window.switchTab;
        if (originalSwitchTab) {
            window.switchTab = function(tab) {
                console.log(`[Monitor] Tab switched to: ${tab}`);
                return originalSwitchTab.apply(this, arguments);
            };
        }
    }
    
    /**
     * 定期报告
     */
    reportPeriodically() {
        setInterval(() => {
            this.reportMetrics();
        }, 60 * 1000); // 每分钟报告一次
    }
    
    /**
     * 报告指标
     */
    reportMetrics() {
        const report = {
            timestamp: Date.now(),
            pageLoadTime: this.metrics.pageLoadTime,
            apiCalls: this.metrics.apiResponseTimes.length,
            avgApiResponseTime: this.getAverageApiResponseTime(),
            errorCount: this.metrics.errorCount,
            userActions: this.metrics.userActions.length
        };
        
        console.log('[Monitor] Metrics Report:', report);
        this.sendMetric('report', report);
    }
    
    /**
     * 获取平均 API 响应时间
     */
    getAverageApiResponseTime() {
        if (this.metrics.apiResponseTimes.length === 0) return 0;
        
        const total = this.metrics.apiResponseTimes.reduce(
            (sum, item) => sum + item.duration, 
            0
        );
        return total / this.metrics.apiResponseTimes.length;
    }
    
    /**
     * 发送指标到服务器
     */
    sendMetric(type, data) {
        // 实际项目中应发送到监控服务器
        // fetch('/api/monitor', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ type, data, timestamp: Date.now() })
        // });
        
        // 演示用：输出到控制台
        console.log(`[Monitor] Sending ${type}:`, data);
    }
    
    /**
     * 发送告警
     */
    sendAlert(type, data) {
        console.warn(`[Monitor] ALERT [${type}]:`, data);
        this.sendMetric('alert', { type, data });
    }
    
    /**
     * 获取监控数据
     */
    getMetrics() {
        return {
            ...this.metrics,
            avgApiResponseTime: this.getAverageApiResponseTime()
        };
    }
    
    /**
     * 重置监控数据
     */
    reset() {
        this.metrics = {
            pageLoadTime: 0,
            apiResponseTimes: [],
            errorCount: 0,
            userActions: []
        };
    }
}

/**
 * 错误追踪装饰器
 */
export function trackError(target, name, descriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args) {
        const startTime = performance.now();
        try {
            const result = await originalMethod.apply(this, args);
            const endTime = performance.now();
            
            // 追踪成功
            if (window.performanceMonitor) {
                window.performanceMonitor.trackApiRequest(
                    name, 
                    startTime, 
                    endTime, 
                    true
                );
            }
            
            return result;
        } catch (error) {
            const endTime = performance.now();
            
            // 追踪失败
            if (window.performanceMonitor) {
                window.performanceMonitor.trackApiRequest(
                    name, 
                    startTime, 
                    endTime, 
                    false
                );
            }
            
            throw error;
        }
    };
    
    return descriptor;
}

// 创建全局实例
export const performanceMonitor = new PerformanceMonitor();

// 导出供全局使用
window.performanceMonitor = performanceMonitor;
