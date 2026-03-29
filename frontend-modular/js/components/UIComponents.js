// ========== UI 组件模块 ==========

import { escapeHtml, formatNumber } from '../utils/helpers.js';
import { dataManager } from '../managers/DataManager.js';

/**
 * 渲染趋势箭头
 */
export function renderTrend(trend) {
    const icon = trend.direction === 'up' ? '🔼' : trend.direction === 'down' ? '🔽' : '➖';
    const text = trend.percent > 0 ? `${trend.percent}%` : '无变化';
    return `<span class="trend ${trend.direction}">${icon} ${text}</span>`;
}

/**
 * 更新统计卡片（带趋势）
 */
export function updateStatCard(id, value, trend, label) {
    const el = document.getElementById(id);
    if (!el) return;
    
    const card = el.parentElement;
    if (!card) return;
    
    // 更新数值
    card.querySelector('.value').textContent = value;
    
    // 移除旧趋势
    const oldTrend = card.querySelector('.trend');
    if (oldTrend) oldTrend.remove();
    
    // 添加新趋势
    const trendEl = document.createElement('div');
    trendEl.className = `trend ${trend.direction}`;
    trendEl.innerHTML = renderTrend(trend);
    card.appendChild(trendEl);
}

/**
 * 更新圆形进度条
 */
export function updateCircleProgress(type, current, target) {
    const circle = document.getElementById(`${type}Circle`);
    const inner = document.getElementById(`${type}Percent`);
    
    if (circle && inner) {
        const percent = target > 0 ? Math.round((current / target) * 100) : 0;
        circle.style.background = `conic-gradient(#667eea ${percent}%, #e5e7eb ${percent}%)`;
        inner.textContent = target > 0 ? `${percent}%` : '-';
    }
}

/**
 * 更新进度条
 */
export function updateProgressBar(type, current, target) {
    const percent = target > 0 ? Math.min(100, (current / target) * 100) : 0;
    const bar = document.getElementById(`${type}Progress`);
    const targetEl = document.getElementById(`${type}Target`);
    
    if (bar) bar.style.width = `${percent}%`;
    if (targetEl) targetEl.textContent = `目标：${target}`;
}

/**
 * 渲染企业表格
 */
export function renderCompaniesTable(list, searchKeyword = '') {
    const tb = document.getElementById('companiesTable');
    if (!tb) return;
    
    if (!list || !list.length) { 
        tb.innerHTML = '<tr><td colspan="11" style="text-align:center;color:#999;">暂无数据</td></tr>'; 
        return; 
    }
    
    // 初始化选中状态
    list.forEach(c => { 
        if (c.selected === undefined) c.selected = false; 
    });
    
    tb.innerHTML = list.map(c => `
        <tr style="${c.xinfutong_status==='applicable'?'background:#f0fdf4;':''}">
            <td style="width:30px;">
                <input type="checkbox" class="export-checkbox" value="${c.id}" ${c.selected?'checked':''} onchange="toggleCompanySelect(${c.id})">
            </td>
            <td style="font-weight:600;">
                ${searchKeyword ? highlightText(c.name, searchKeyword) : escapeHtml(c.name)||'-'}
            </td>
            <td>
                <button class="badge ${getContactFrequencyClass(c.contact_frequency)}" 
                        onclick="updateContactFrequency(${c.id},'${escapeAttr(c.name)}','${c.contact_frequency||'一月前触达'}')">
                    ${getContactFrequencyLabel(c.contact_frequency)}
                </button>
            </td>
            <td>
                <button class="badge ${getXinfutongClass(c.xinfutong_status)}" 
                        onclick="editXinfutong(${c.id},'${escapeAttr(c.name)}')">
                    ${getXinfutongLabel(c.xinfutong_status)}
                </button>
                ${c.xinfutong_status==='applicable' ? `
                    <button class="btn btn-sm btn-secondary" style="margin-left:4px;padding:2px 6px;font-size:10px;" 
                            onclick="viewXinfutongDetails(${c.id},'${escapeAttr(c.name)}')">📋 详情</button>
                ` : ''}
            </td>
            <td>
                <span class="editable" onclick="makeEditable(this,${c.id},'manager_name','${escapeAttr(c.manager_name||'')}')" title="点击编辑">
                    ${searchKeyword ? highlightText(c.manager_name, searchKeyword) : escapeHtml(c.manager_name)||'-'}
                </span>
            </td>
            <td style="font-size:13px;">
                ${searchKeyword ? highlightText(c.contact_names, searchKeyword) : escapeHtml(c.contact_names)||'-'}
                <button class="btn btn-sm btn-secondary" style="margin-left:4px;padding:2px 6px;font-size:11px;" 
                        onclick="manageContacts(${c.id},'${escapeAttr(c.name)}')">管理</button>
            </td>
            <td>
                <input type="number" class="number-input" value="${c.active_count||0}" 
                       onchange="inlineNumber(${c.id},'active_count',this.value)" title="点击修改">
            </td>
            <td>
                <input type="number" class="number-input" value="${c.hq_count||0}" 
                       onchange="inlineNumber(${c.id},'hq_count',this.value)" title="点击修改">
            </td>
            <td>
                <button class="badge ${c.is_account_opened?'badge-success':'badge-warning'}" 
                        onclick="inlineToggle(${c.id},'is_account_opened')">
                    ${c.is_account_opened?'已开户':'未开户'}
                </button>
            </td>
            <td>
                <select class="select-inline" onchange="inlineSelect(${c.id},'landing_cycle',this.value)">
                    <option value="ongoing" ${c.landing_cycle==='ongoing'?'selected':''}>持续跟进</option>
                    <option value="month" ${c.landing_cycle==='month'?'selected':''}>本月</option>
                    <option value="quarter" ${c.landing_cycle==='quarter'?'selected':''}>3 个月</option>
                    <option value="year" ${c.landing_cycle==='year'?'selected':''}>本年</option>
                    <option value="completed" ${c.landing_cycle==='completed'?'selected':''}>✅ 已落地</option>
                </select>
            </td>
            <td style="display:flex;gap:4px;">
                <button class="btn btn-sm btn-secondary" onclick="showCompanyDetail(${c.id})">详情</button>
                <button class="btn btn-sm btn-secondary" style="color:#ef4444;" onclick="deleteCompany(${c.id})">删除</button>
            </td>
        </tr>
    `).join('');
}

// 辅助函数
function highlightText(text, keyword) {
    if (!keyword || !text) return escapeHtml(text);
    const escaped = escapeHtml(text);
    const regex = new RegExp(`(${escapeHtml(keyword).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return escaped.replace(regex, '<span class="search-highlight">$1</span>');
}

function escapeAttr(text) {
    return (text || '').replace(/'/g, "\\'");
}

function getContactFrequencyClass(freq) {
    const map = {
        '本周触达': 'badge-success',
        '两周触达': 'badge-warning',
        '本月触达': 'badge-blue',
        '一月前触达': 'badge-gray'
    };
    return map[freq] || 'badge-gray';
}

function getContactFrequencyLabel(freq) {
    const map = {
        '本周触达': '✅ 本周触达',
        '两周触达': '⏰ 两周触达',
        '本月触达': '📅 本月触达',
        '一月前触达': '🕐 一月前触达'
    };
    return map[freq] || '🕐 一月前触达';
}

function getXinfutongClass(status) {
    const map = {
        'applicable': 'badge-success',
        'not_applicable': 'badge-gray'
    };
    return map[status] || 'badge-blue';
}

function getXinfutongLabel(status) {
    const map = {
        'applicable': '✅ 适用',
        'not_applicable': '❌ 不适用'
    };
    return map[status] || '🔵 未设置';
}

/**
 * 渲染待办提醒下拉框
 */
export function renderTodoDropdown(tasks) {
    const list = document.getElementById('todoDropdownList');
    const summary = document.getElementById('todoDropdownSummary');
    if (!list || !summary) return;
    
    const today = new Date().toISOString().split('T')[0];
    const pendingTasks = tasks.filter(t => t.status === 'pending');
    
    summary.textContent = `${pendingTasks.length} 项未完成`;
    
    if (pendingTasks.length === 0) {
        list.innerHTML = '<div class="todo-dropdown-empty">✅ 暂无待办事项</div>';
        return;
    }
    
    // 按日期排序
    pendingTasks.sort((a, b) => a.plan_date.localeCompare(b.plan_date));
    
    list.innerHTML = pendingTasks.map(t => {
        const isToday = t.plan_date === today;
        const urgencyClass = isToday ? 'today' : '';
        const timeLabel = isToday ? '今天' : t.plan_date;
        
        return `
            <div class="todo-dropdown-item ${urgencyClass}" onclick="goToWeekTask(${t.id})">
                <input type="checkbox" class="todo-dropdown-checkbox" 
                       onclick="event.stopPropagation(); quickCompleteTodo(${t.id}, this)">
                <div class="todo-dropdown-content">
                    <div class="todo-dropdown-company">${escapeHtml(t.company_name) || '未分配企业'}</div>
                    <div class="todo-dropdown-action">${escapeHtml(t.action) || '待办事项'}</div>
                    <div class="todo-dropdown-time">📅 ${timeLabel} | ${getTimeLabel(t.time_period)}</div>
                </div>
            </div>
        `;
    }).join('');
}

function getTimeLabel(period) {
    const map = {
        'am': '上午',
        'pm': '下午',
        'evening': '晚上'
    };
    return map[period] || '';
}
