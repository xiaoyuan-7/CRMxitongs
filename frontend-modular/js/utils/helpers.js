// ========== 工具函数模块 ==========

/**
 * XSS 防护：转义 HTML 特殊字符
 */
export function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 高亮文本中的关键字
 */
export function highlightText(text, keyword) {
    if (!keyword || !text) return escapeHtml(text);
    
    const escaped = escapeHtml(text);
    const regex = new RegExp(`(${escapeHtml(keyword).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return escaped.replace(regex, '<span class="search-highlight">$1</span>');
}

/**
 * 防抖函数
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 节流函数
 */
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * 格式化数字（固定宽度对齐）
 */
export function formatNumber(num, target) {
    if (target > 0) {
        return `${String(num).padStart(3, ' ')} / ${String(target).padStart(3, ' ')}`;
    }
    return `${String(num).padStart(3, ' ')}`;
}

/**
 * 本地存储工具
 */
export const storage = {
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error(`Storage get error: ${key}`, e);
            return defaultValue;
        }
    },
    
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error(`Storage set error: ${key}`, e);
            return false;
        }
    },
    
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error(`Storage remove error: ${key}`, e);
            return false;
        }
    }
};
