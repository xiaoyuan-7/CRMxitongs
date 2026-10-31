#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
_refine_v9_review.py · v9 分类复检报告生成器

输入: data/companies.json
输出: scripts/_v9_review_report.csv + scripts/_v9_review_summary.json

⚠️ 本脚本只生成报告,不改数据。
   看完报告决定改哪些,再跑 _refine_v9_apply.py 应用。

逻辑:
  对每家 method=='v9'/'v9_name' 的公司:
    A. 行业一致性检查: trk 是否在 INDUSTRY_TRACK[ind] 候选里
    B. v3 算法重判: 多信号联合投票(行业小类/中类/大类 + biz + 专利)
    C. v2 算法重判: 行业大类 + biz 关键词打分
    D. 综合建议:
       - 一致+高置信 → 不动
       - 不一致+v3/v2 有不同意见 → 建议修正
       - 不一致+v3/v2 同意原分类 → 标记"争议"
"""

import csv
import json
import os
import re
import sys
from collections import Counter, defaultdict

WORK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(WORK, 'data')
SCRIPTS = os.path.join(WORK, 'scripts')


# ============================================================
# 词典(从 _refine_v3.py 复制,加通信赛道修 INDUSTRY_DL_TRACK 缺失)
# ============================================================
with open(os.path.join(SCRIPTS, '_industry_dict.json'), 'r') as f:
    INDUSTRY_ZL_TRACK = json.load(f)

with open(os.path.join(SCRIPTS, '_patent_keywords.json'), 'r') as f:
    PATENT_KEYWORDS = json.load(f)

# === 关键修: 加 '通信' 赛道到 INDUSTRY_DL_TRACK (v3 漏了) ===
INDUSTRY_DL_TRACK = {
    '信息传输、软件和信息技术服务业': ['软件/SaaS'],
    '软件和信息技术服务业': ['软件/SaaS'],
    '批发和零售业': ['供应链-电子', '消费升级'],
    '批发业': ['供应链-电子'],
    '零售业': ['消费升级'],
    '科学研究和技术服务业': ['软件/SaaS', '检测/认证', '机器人/AI'],
    '研究和试验发展': ['软件/SaaS', '检测/认证', '机器人/AI'],
    '专业技术服务业': ['检测/认证', '软件/SaaS'],
    '电力、热力、燃气及水生产和供应业': ['新能源/储能'],
    '建筑业': ['其他'],
    '房地产业': ['其他'],
    '交通运输、仓储和邮政业': ['其他'],
    '金融业': ['软件/SaaS'],
    '租赁和商务服务业': ['其他'],
    '居民服务、修理和其他服务业': ['消费升级'],
    '住宿和餐饮业': ['消费升级'],
    '文化、体育和娱乐业': ['消费升级'],
    '卫生和社会工作': ['医疗器械'],
    '教育': ['软件/SaaS', '消费升级'],
    '制造业': None,
    # === 新增 ===
    # 计算机/通信大类原本缺 '通信', 现在补上
    '计算机、通信和其他电子设备制造业': ['供应链-电子', '半导体', '通信'],
    '通信设备制造业': ['通信', '供应链-电子'],
    # 仪器仪表制造业里有些公司实际做通信(光模块), 补上让算法有机会判
    '仪器仪表制造业': ['供应链-电子', '检测/认证', '通信'],
}

INDUSTRY_XL_TRACK = {
    '基础软件开发': ['软件/SaaS'],
    '应用软件开发': ['软件/SaaS'],
    '支持软件开发和运营': ['软件/SaaS'],
    '互联网安全服务': ['软件/SaaS'],
    '云计算服务': ['软件/SaaS'],
    '集成电路设计': ['半导体'],
    '半导体分立器件制造': ['半导体'],
    '半导体照明器件制造': ['半导体'],
    '半导体器件专用设备制造': ['半导体'],
    '锂离子电池制造': ['新能源/储能'],
    '发光二极管(LED)制造': ['供应链-电子'],
    '光伏设备及元器件制造': ['新能源/储能', '供应链-电子'],
    '工业自动控制系统装置制造': ['供应链-电子', '机器人/AI'],
    '通信系统设备制造': ['通信'],
    '信息系统集成服务': ['软件/SaaS'],
    '信息技术咨询服务': ['软件/SaaS'],
    '数据处理服务': ['软件/SaaS'],
    '数据处理和存储支持服务': ['软件/SaaS'],
    '智能无人飞行器制造': ['机器人/AI'],
    '工业机器人制造': ['机器人/AI', '供应链-精密'],
    '通信终端设备制造': ['通信'],
    '广播电视设备制造': ['通信'],
    '计算机整机制造': ['供应链-电子'],
    '计算机外围设备制造': ['供应链-电子'],
    '塑料零件及其他塑料制品制造': ['化工/新材料'],
    '无机化学原料制造': ['化工/新材料'],
    '有机化学原料制造': ['化工/新材料'],
    '化学试剂和助剂制造': ['化工/新材料'],
    '合成材料制造': ['化工/新材料'],
    '电池制造': ['新能源/储能', '供应链-电子'],
    '家用电力器具制造': ['供应链-电子'],
    '家用视听设备制造': ['供应链-电子', '消费升级'],
    '照明器具制造': ['供应链-电子'],
    '电子和电工机械专用设备制造': ['供应链-电子', '新能源/储能'],
    '医疗诊断、监护及治疗设备制造': ['医疗器械'],
    '康复辅具制造': ['医疗器械'],
    '卫生材料及医药用品制造': ['医疗器械'],
    '汽车零部件及配件制造': ['汽车'],
    '改装汽车制造': ['汽车'],
    '汽车车身、挂车制造': ['汽车'],
    '汽车整车制造': ['汽车'],
    '化学药品原料药制造': ['生物医药'],
    '化学药品制剂制造': ['生物医药'],
    '中药饮片加工': ['生物医药'],
    '中成药生产': ['生物医药'],
    '生物药品制造': ['生物医药'],
    '纺织服装、服饰业': ['消费升级'],
    '食品制造业': ['消费升级'],
    '酒、饮料和精制茶制造业': ['消费升级'],
    '纺织业': ['消费升级'],
    '家具制造业': ['消费升级', '供应链-精密'],
    '玩具制造': ['消费升级'],
    '工艺美术品制造': ['消费升级'],
    '体育用品制造': ['消费升级'],
    '互联网其他信息服务': ['软件/SaaS'],
    '其他互联网服务': ['软件/SaaS'],
    '其他科技推广服务业': ['软件/SaaS', '检测/认证'],
    '质检技术服务': ['检测/认证'],
    '计量服务': ['检测/认证'],
    '工程技术与设计服务': ['检测/认证'],
    # === 新增: 光模块/光通信 行业小类映射 ===
    '光通信设备制造': ['通信'],
    '通信交换设备制造': ['通信'],
    '光缆制造': ['通信'],
}

TRACK_KEYWORDS = {
    '软件/SaaS': ['软件', '信息系统', '信息技术', '系统集成', 'SaaS', 'ERP', 'CRM', 'MES', 'APP', '小程序', '游戏', '网络安全', '数据服务', '大数据', '云计算', 'AI', '算法', '机器学习', '云平台'],
    '供应链-电子': ['PCB', '连接器', '电源', '充电器', '传感器', '显示器', '触摸屏', 'LED', '蓝牙', 'Wi-Fi', '智能硬件', '电子元器件', '电容', '电阻', '光电', '电子'],
    '供应链-精密': ['模具', '机加工', 'CNC', '注塑', '五金', '紧固件', '自动化设备', '精密', '铸件', '钣金', '金属制品', '轴承'],
    '半导体': ['半导体', '集成电路', 'IC设计', '芯片', '晶圆', '封装', 'MOSFET', 'IGBT', '功率器件', '光刻'],
    '化工/新材料': ['化工', '化学', '材料', '涂料', '油墨', '胶粘剂', '塑料', '橡胶', '复合材料', '纳米', '精细化工'],
    '新能源/储能': ['新能源', '储能', '光伏', '太阳能', '风电', '动力电池', '充电桩', 'BMS', '锂电池', '电池', '氢能'],
    '检测/认证': ['检测', '认证', '测试', '检验', '测量', '校准', '实验室', 'CMA', 'CNAS', '计量'],
    '通信': ['5G', '6G', '光通信', '光纤', '通信设备', '基站', '天线', '路由器', '交换机'],
    '医疗器械': ['医疗器械', '医疗设备', '医用', '影像', '监护', '手术', 'IVD', '体外诊断', '诊断试剂', '医用耗材'],
    '消费升级': ['服装', '服饰', '食品', '饮料', '化妆品', '家居', '玩具', '文具', '珠宝', '首饰'],
    '机器人/AI': ['机器人', '机器视觉', '无人机', '智能装备', '工业机器人', '服务机器人', '伺服', '减速器', 'AGV'],
    '生物医药': ['创新药', '仿制药', '疫苗', '抗体', '原料药', '中药', '生物制品', '医药'],
    '汽车': ['汽车', '整车', '汽车零部件', '底盘', '车身', '动力总成', '新能源汽车'],
    '其他': [],
}


# ============================================================
# 工具(从 _refine_v3.py 复刻)
# ============================================================
def split_main_biz(biz):
    if not biz: return ''
    m = re.search(r'一般经营项目[：:](.+?)(?:\(|。|$)', biz, re.DOTALL)
    if m:
        return m.group(1).strip()
    parts = re.split(r'[;；]', biz)
    return parts[0].strip() if parts else biz


def get_candidates(c):
    """获取候选赛道(优先级:小类 > 中类 > 大类)"""
    ind_xl = c.get('ind_xl', '')
    ind_zl = c.get('ind_zl', '')
    ind_dl = c.get('ind', '')

    if ind_xl and ind_xl in INDUSTRY_XL_TRACK:
        cands = INDUSTRY_XL_TRACK[ind_xl]
        if cands:
            return cands

    if ind_zl and ind_zl in INDUSTRY_ZL_TRACK:
        cands = INDUSTRY_ZL_TRACK[ind_zl]
        if cands:
            return cands

    if ind_dl:
        for k, v in INDUSTRY_DL_TRACK.items():
            if k in ind_dl or ind_dl in k:
                return v or []

    return None


def classify_v3(c, patents_by_name):
    """多信号联合投票"""
    candidates = get_candidates(c)
    if not candidates:
        return None, 0, 'low', None

    biz = c.get('biz', '')
    main_biz = split_main_biz(biz) or biz
    full_biz = biz or ''

    scores = defaultdict(float)
    sig_count = 0

    # 信号 1: 主营业务关键词(强)
    for track in candidates:
        if track not in TRACK_KEYWORDS: continue
        for kw in TRACK_KEYWORDS[track]:
            if kw in main_biz:
                scores[track] += 2
                sig_count += 1

    # 信号 2: 完整经营范围关键词(弱)
    for track in candidates:
        if track not in TRACK_KEYWORDS: continue
        for kw in TRACK_KEYWORDS[track]:
            if kw in full_biz and kw not in main_biz:
                scores[track] += 0.5

    # 信号 3: 专利关键词(强)
    pats = patents_by_name.get(c['name'], [])
    if pats:
        pat_text = ' '.join(pats[:30])
        for track in candidates:
            if track not in PATENT_KEYWORDS: continue
            kw_set = set(PATENT_KEYWORDS[track])
            hit = sum(1 for kw in kw_set if kw in pat_text)
            if hit >= 3:
                scores[track] += 5
                sig_count += 1
            elif hit >= 1:
                scores[track] += 1

    if not scores:
        return candidates[0], 1, 'medium', None

    sorted_scores = sorted(scores.items(), key=lambda x: -x[1])
    top_track, top_score = sorted_scores[0]

    if sig_count >= 3 and top_score >= 8:
        conf = 'high'
    elif sig_count >= 2 or top_score >= 4:
        conf = 'medium'
    else:
        conf = 'low'

    return top_track, top_score, conf, sorted_scores


# ============================================================
# 主流程
# ============================================================
print("=" * 60)
print("v9 分类复检报告生成器(只读不改)")
print("=" * 60)

with open(os.path.join(DATA, 'companies.json'), 'r') as f:
    companies = json.load(f)

print(f"\n总企业: {len(companies)}")

# 加载专利
print("\n加载专利...")
patents_by_name = defaultdict(list)
pat_path = '/mnt/c/Users/Administrator/Desktop/名单/合并结果/专利主表_全量.csv'
if os.path.exists(pat_path):
    with open(pat_path, 'r', encoding='utf-8-sig') as f:
        r = csv.DictReader(f)
        for row in r:
            name = (row.get('企业名称') or '').strip()
            pname = (row.get('专利名称') or '').strip()
            if name and pname:
                patents_by_name[name].append(pname)
    print(f"  专利涉及企业: {len(patents_by_name)}")
else:
    print(f"  ⚠️ 专利文件不存在: {pat_path}")

# 只看 v9 公司
v9 = [c for c in companies if c.get('method') in ('v9', 'v9_name')]
print(f"\nv9 分类公司: {len(v9)}")

# 统计
stats = {
    'total': len(v9),
    'ind_mismatch': 0,         # 行业大类不一致
    'v3_differs': 0,           # v3 给出不同 trk
    'v3_agrees': 0,            # v3 同意原 trk
    'v3_uncertain': 0,         # v3 没候选或置信度低
    'suggested_change': 0,     # 综合建议修正
    'no_change_needed': 0,     # 综合建议不动
}

results = []

for c in v9:
    old_trk = c.get('trk', '')
    old_sub = c.get('sub_track', '')
    old_conf = c.get('confidence', '')
    ind_dl = c.get('ind', '')
    ind_zl = c.get('ind_zl', '')
    ind_xl = c.get('ind_xl', '')
    biz_head = (c.get('biz', '') or '')[:40]

    # A. 行业一致性检查
    candidates = get_candidates(c)
    ind_mismatch = bool(candidates and old_trk not in candidates)
    if ind_mismatch:
        stats['ind_mismatch'] += 1

    # B. v3 重判
    new_trk_v3, score_v3, conf_v3, sorted_scores = classify_v3(c, patents_by_name)
    v3_differs = new_trk_v3 is not None and new_trk_v3 != old_trk
    if new_trk_v3 is None:
        stats['v3_uncertain'] += 1
    elif v3_differs:
        stats['v3_differs'] += 1
    else:
        stats['v3_agrees'] += 1

    # D. 综合建议
    suggested_trk = old_trk
    suggested_conf = old_conf
    action = 'KEEP'

    if ind_mismatch and v3_differs and conf_v3 in ('high', 'medium'):
        # 行业不一致 + v3 给出不同意见 + 置信度够 → 改
        suggested_trk = new_trk_v3
        suggested_conf = conf_v3
        action = 'CHANGE'
        stats['suggested_change'] += 1
    elif ind_mismatch and not v3_differs:
        # 行业不一致但 v3 也同意原分类 → 可能是 ind_xl 写错, 标记争议
        action = 'DISPUTE'
    elif not ind_mismatch and v3_differs and conf_v3 in ('high', 'medium'):
        # 行业一致但 v3 想改 → 谨慎, 应用 v3 推荐 (用户可选择)
        suggested_trk = new_trk_v3
        suggested_conf = conf_v3
        action = 'OPTIONAL_CHANGE'
    elif ind_mismatch and v3_differs and conf_v3 == 'low':
        # 行业不一致 + v3 低置信 → 判断 candidates 来源
        # XL_TRACK / ZL_TRACK 命中(联业子分类) → industry_fallback 可信
        # 只 DL_TRACK 命中(批发业/零售业等) → 流通业, 需人工
        ind_xl_matched = bool(c.get('ind_xl') and c.get('ind_xl') in INDUSTRY_XL_TRACK)
        ind_zl_matched = bool(c.get('ind_zl') and c.get('ind_zl') in INDUSTRY_ZL_TRACK)
        if ind_xl_matched or ind_zl_matched:
            # 行业X小类/中类命中 → 精细分类 → industry_fallback 到 candidates[0]
            if candidates:
                suggested_trk = candidates[0]
                suggested_conf = 'low'
                action = 'INDUSTRY_FALLBACK'
            else:
                action = 'KEEP'
        else:
            # 只大类命中(批发业/零售业等) → 需人工
            action = 'NEEDS_REVIEW'
    else:
        action = 'KEEP'
        stats['no_change_needed'] += 1

    # top-3 候选(用于人工 review)
    top3 = ''
    if sorted_scores:
        top3 = '|'.join(f'{t}:{s:.1f}' for t, s in sorted_scores[:3])

    results.append({
        'code': c.get('code', ''),
        'name': c.get('name', ''),
        'ind_dl': ind_dl,
        'ind_zl': ind_zl,
        'ind_xl': ind_xl,
        'biz_head': biz_head,
        'old_trk': old_trk,
        'old_sub': old_sub,
        'old_conf': old_conf,
        'candidates': '|'.join(candidates) if candidates else '',
        'ind_mismatch': 'Y' if ind_mismatch else 'N',
        'new_trk_v3': new_trk_v3 or '',
        'conf_v3': conf_v3 or '',
        'top3_scores': top3,
        'suggested_trk': suggested_trk,
        'suggested_conf': suggested_conf,
        'action': action,
    })

# 按 action 排序(待改的在前)
action_order = {'CHANGE': 0, 'OPTIONAL_CHANGE': 1, 'DISPUTE': 2, 'KEEP': 3}
results.sort(key=lambda r: (action_order.get(r['action'], 9), r['name']))

# === 输出 CSV ===
csv_path = os.path.join(SCRIPTS, '_v9_review_report.csv')
fieldnames = list(results[0].keys()) if results else []
with open(csv_path, 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.DictWriter(f, fieldnames=fieldnames)
    w.writeheader()
    for r in results:
        w.writerow(r)
print(f"\n[报告] 写入 {csv_path}")
print(f"  共 {len(results)} 行")

# === 输出 JSON 摘要 ===
summary = {
    'total_v9': stats['total'],
    'stats': stats,
    'sample_changes': [r for r in results if r['action'] == 'CHANGE'][:10],
    'sample_disputes': [r for r in results if r['action'] == 'DISPUTE'][:10],
}
summary_path = os.path.join(SCRIPTS, '_v9_review_summary.json')
with open(summary_path, 'w', encoding='utf-8') as f:
    json.dump(summary, f, ensure_ascii=False, indent=2)
print(f"[摘要] 写入 {summary_path}")

# === 打印关键统计 ===
print(f"\n========== 复检结果 ==========")
print(f"v9 分类公司总数:           {stats['total']}")
print(f"  行业大类不一致 (A):       {stats['ind_mismatch']} ({stats['ind_mismatch']/stats['total']*100:.1f}%)")
print(f"  v3 给出不同 trk (B):      {stats['v3_differs']} ({stats['v3_differs']/stats['total']*100:.1f}%)")
print(f"  v3 同意原 trk:            {stats['v3_agrees']} ({stats['v3_agrees']/stats['total']*100:.1f}%)")
print(f"  v3 无法判定:              {stats['v3_uncertain']}")
print()
print(f"  → 建议修正 (CHANGE):        {stats['suggested_change']} ({stats['suggested_change']/stats['total']*100:.1f}%)")
print(f"  → 行业争议 (DISPUTE):       ? (需人工 review)")
print(f"  → 不动 (KEEP):              {stats['no_change_needed']}")

print(f"\n========== CHANGE 案例前 10 ==========")
for r in [r for r in results if r['action'] == 'CHANGE'][:10]:
    print(f"  {r['name'][:25]:25s} | {r['old_trk']:8s}→{r['suggested_trk']:8s} | ind={r['ind_dl'][:15]} | {r['biz_head']}")

print(f"\n========== DISPUTE 案例前 5 ==========")
for r in [r for r in results if r['action'] == 'DISPUTE'][:5]:
    print(f"  {r['name'][:25]:25s} | 原 trk={r['old_trk']:8s} (v3 也同意) | ind={r['ind_dl'][:15]} | {r['biz_head']}")

print(f"\n⚠️ 本脚本只生成报告,未修改任何数据。")
print(f"   查看 {csv_path}")
print(f"   决定改哪些后,跑 _refine_v9_apply.py 应用")