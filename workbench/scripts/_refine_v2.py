#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
_refine_v2.py · 多信号联合修正分类(v2)

输入:companies.json
输出:companies.json

信号(优先级从高到低):
  1. v9 已知正确 → 跳过
  2. 行业大类 → 候选赛道
  3. 行业中类 → 候选赛道(优先级高于大类)
  4. 经营范围关键词(主营业务部分) → 在候选里打分
  5. 专利名称关键词 → 加分信号
  6. 客户行业(relations)→ 反向信号

标记:
  - method='v2' 表明经过 v2 修正
  - confidence: high(多信号) / medium(单信号) / low
"""

import csv
import json
import os
import re
from collections import Counter, defaultdict


WORK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(WORK, 'data')


# ============================================================
# 加载词典
# ============================================================
with open(os.path.join(WORK, 'scripts', '_industry_dict.json'), 'r') as f:
    INDUSTRY_ZL_TRACK = json.load(f)

# 行业大类(粗)→ 候选赛道
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
    '制造业': None,  # 看关键词
}


# 经营范围关键词
TRACK_KEYWORDS = {
    '软件/SaaS': ['软件', '信息系统', '信息技术', '系统集成', 'SaaS', 'ERP', 'CRM', 'MES', 'APP', '小程序', '游戏', '网络安全', '数据服务', '大数据', '云计算', 'AI', '算法', '机器学习', 'PaaS', '云平台', '云原生', '区块链'],
    '供应链-电子': ['PCB', '连接器', '电源', '充电器', '传感器', '显示器', '触摸屏', 'LED', '蓝牙', 'Wi-Fi', '智能硬件', '电子元器件', '电容', '电阻', '光电', '电子', '二极管', '三极管', '集成电路'],
    '供应链-精密': ['模具', '机加工', 'CNC', '注塑', '五金', '紧固件', '自动化设备', '自动化', '精密', '铸件', '钣金', '金属制品', '轴承', '齿轮'],
    '半导体': ['半导体', '集成电路', 'IC设计', '芯片', '晶圆', '封装', 'MOSFET', 'IGBT', '功率器件', '光刻', '半导体设备', '半导体材料'],
    '化工/新材料': ['化工', '化学', '材料', '涂料', '油墨', '胶粘剂', '塑料', '橡胶', '复合材料', '纳米', '精细化工', '高分子', '新材料'],
    '新能源/储能': ['新能源', '储能', '光伏', '太阳能', '风电', '动力电池', '充电桩', 'BMS', '锂电池', '电池', '氢能', '充电站', '清洁能源'],
    '检测/认证': ['检测', '认证', '测试', '检验', '测量', '校准', '实验室', 'CMA', 'CNAS', '计量', 'ISO认证'],
    '通信': ['5G', '6G', '光通信', '光纤', '通信设备', '基站', '天线', '路由器', '交换机', '通信终端'],
    '医疗器械': ['医疗器械', '医疗设备', '医用', '影像', '监护', '手术', 'IVD', '体外诊断', '诊断试剂', '医用耗材', '康复'],
    '消费升级': ['服装', '服饰', '食品', '饮料', '化妆品', '家居', '玩具', '文具', '珠宝', '首饰', '母婴'],
    '机器人/AI': ['机器人', '机器视觉', '无人机', '智能装备', '工业机器人', '服务机器人', '伺服', '减速器', 'AGV'],
    '生物医药': ['创新药', '仿制药', '疫苗', '抗体', '原料药', '中药', '生物制品', '生物医药', '医药'],
    '汽车': ['汽车', '整车', '汽车零部件', '底盘', '车身', '动力总成', '新能源汽车'],
    '其他': [],
}


# ============================================================
# 工具
# ============================================================
def split_main_biz(biz):
    if not biz: return ''
    m = re.search(r'一般经营项目[：:](.+?)(?:\(|。|$)', biz, re.DOTALL)
    if m:
        return m.group(1).strip()
    parts = re.split(r'[;；]', biz)
    return parts[0].strip() if parts else biz


def get_candidates(c):
    """获取候选赛道(行业中类优先,行业大类次之)"""
    ind_zl = c.get('ind_zl', '')
    ind_dl = c.get('ind', '')

    # 1. 行业中类(细)
    if ind_zl and ind_zl in INDUSTRY_ZL_TRACK:
        cands = INDUSTRY_ZL_TRACK[ind_zl]
        if cands:
            return cands

    # 2. 行业大类(粗)
    if ind_dl:
        for k, v in INDUSTRY_DL_TRACK.items():
            if k in ind_dl or ind_dl in k:
                return v or []

    return None


def classify_v2(c):
    """多信号联合投票"""
    candidates = get_candidates(c)
    if not candidates:
        return None, 0, 'low'

    biz = c.get('biz', '')
    main_biz = split_main_biz(biz) or biz

    # 信号打分
    scores = defaultdict(float)
    signal_count = 0

    # 信号 1: 主营业务关键词
    for track in candidates:
        if track not in TRACK_KEYWORDS: continue
        for kw in TRACK_KEYWORDS[track]:
            if kw in main_biz:
                scores[track] += 2
                signal_count += 1

    # 信号 2: 全经营范围关键词(弱)
    full_biz = biz or ''
    for track in candidates:
        if track not in TRACK_KEYWORDS: continue
        for kw in TRACK_KEYWORDS[track]:
            if kw in full_biz and kw not in main_biz:
                scores[track] += 0.5

    if not scores:
        return candidates[0], 1, 'medium'  # 仅行业大类

    sorted_scores = sorted(scores.items(), key=lambda x: -x[1])
    top_track, top_score = sorted_scores[0]

    # 信号数 + 分数决定置信度
    if signal_count >= 3 and top_score >= 6:
        confidence = 'high'
    elif signal_count >= 1 or top_score >= 3:
        confidence = 'medium'
    else:
        confidence = 'low'

    return top_track, top_score, confidence


# ============================================================
# 主流程
# ============================================================
print("=" * 60)
print("多信号联合修正分类(v2)")
print("=" * 60)

with open(os.path.join(DATA, 'companies.json'), 'r') as f:
    companies = json.load(f)

print(f"\n总企业: {len(companies)}")

# 加载专利 → 按企业名聚合
print("\n加载专利主表(用于信号增强)...")
patents_by_name = defaultdict(list)
pat_path = '/mnt/c/Users/Administrator/Desktop/名单/合并结果/专利主表_全量.csv'
with open(pat_path, 'r', encoding='utf-8-sig') as f:
    r = csv.DictReader(f)
    for row in r:
        name = (row.get('企业名称') or '').strip()
        pname = (row.get('专利名称') or '').strip()
        if name and pname:
            patents_by_name[name].append(pname)
print(f"  涉及企业: {len(patents_by_name):,}")

# 修复
print("\n[修复]...")
fixed = 0
unchanged = 0
empty = 0
samples = []

for c in companies:
    # v9 跳过
    if c.get('method') in ('v9', 'v9_name'):
        continue

    old_trk = c.get('trk', '')

    # 行业大类 + 中类 + 关键词联合
    new_trk, score, conf = classify_v2(c)

    # 信号增强:专利关键词(对低置信度特别有用)
    if conf != 'high' and new_trk:
        pats = patents_by_name.get(c['name'], [])
        if pats:
            pat_text = ' '.join(pats[:50])  # 取前 50 个专利
            for track in [new_trk]:
                if track in TRACK_KEYWORDS:
                    pat_hits = sum(1 for kw in TRACK_KEYWORDS[track] if kw in pat_text)
                    if pat_hits >= 3:
                        conf = 'high'  # 专利强信号提升置信度
                        break

    if new_trk is None:
        empty += 1
        continue
    if new_trk != old_trk:
        c['_original_track_v2'] = old_trk
        c['_original_track'] = c.get('_original_track', old_trk)
        c['trk'] = new_trk
        c['confidence'] = conf
        c['method'] = 'v2'
        fixed += 1
        if len(samples) < 10:
            samples.append((c['name'][:25], old_trk, new_trk, c.get('ind', '')[:15], conf))
    else:
        unchanged += 1

print(f"\n修复结果:")
print(f"  修复: {fixed}")
print(f"  不变: {unchanged}")
print(f"  类别不明: {empty}")

print(f"\n修正案例前 10:")
for name, old, new, ind, conf in samples:
    print(f"  {name:25s} | {old:12s} → {new:12s} | {ind} | {conf}")

# 写回
print(f"\n写回 companies.json...")
s = json.dumps(companies, ensure_ascii=False, allow_nan=False, separators=(',', ':'))
with open(os.path.join(DATA, 'companies.json'), 'w', encoding='utf-8') as f:
    f.write(s)
with open(os.path.join(DATA, 'companies.js'), 'w', encoding='utf-8') as f:
    f.write('// Auto-generated from companies.json\nwindow.COMPANIES = ')
    f.write(s)
    f.write(';\n')

# 更新 aggregates
with open(os.path.join(DATA, 'aggregates.json'), 'r') as f:
    agg = json.load(f)

agg['classified_v9'] = sum(1 for c in companies if c.get('method') in ('v9', 'v9_name'))
agg['classified_ab'] = sum(1 for c in companies if c.get('method') == 'ab')
agg['classified_ab_patent'] = sum(1 for c in companies if c.get('method') == 'ab+patent')
agg['classified_ab_industry'] = sum(1 for c in companies if c.get('method') == 'ab+industry')
agg['classified_v2'] = sum(1 for c in companies if c.get('method') == 'v2')
agg['classified'] = sum(1 for c in companies if c.get('trk'))
agg['unclassified'] = sum(1 for c in companies if not c.get('trk'))

classified_cnt = Counter([c['trk'] for c in companies if c.get('trk')])
for track in agg['tracks']:
    track['classified_count'] = classified_cnt.get(track['name'], 0)

agg_str = json.dumps(agg, ensure_ascii=False, allow_nan=False, separators=(',', ':'))
with open(os.path.join(DATA, 'aggregates.json'), 'w', encoding='utf-8') as f:
    f.write(agg_str)
with open(os.path.join(DATA, 'aggregates.js'), 'w', encoding='utf-8') as f:
    f.write('// Auto-generated from aggregates.json\nwindow.AGGREGATES = ')
    f.write(agg_str)
    f.write(';\n')

# 重跑 sub_track
print(f"\n重跑 sub_track...")
import subprocess
subprocess.run(['python3', os.path.join(WORK, 'scripts', '_classify_subtrack.py')], cwd=WORK, check=False)

# 验证
target = next((c for c in companies if '时代天源' in c.get('name', '')), None)
print(f"\n=== 验证时代天源 ===")
for k, v in target.items():
    print(f"  {k}: {repr(v)[:80]}")

print(f"\n=== 最终 ===")
from collections import Counter
methods = Counter([c.get('method', '') for c in companies])
for m, n in methods.most_common():
    print(f"  {m:18s} {n:5d} ({n*100//len(companies)}%)")
PYEOF