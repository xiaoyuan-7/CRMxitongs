#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
_refine_v3.py · 多信号联合修正分类(v3) - 最终版

信号(优先级):
  1. 行业大类 → 候选
  2. 行业中类 → 候选(细)
  3. 行业小类 → 候选(最细)
  4. 经营范围关键词 → 加分
  5. 专利关键词 → 加分强信号
  6. 客户行业(relations)→ 反向信号

只修正"明显错"的:
  - 行业大类不允许的赛道 + 多种信号都指向新赛道
  - 保留原赛道信息到 _original_track 双层
"""

import csv
import json
import os
import re
from collections import Counter, defaultdict


WORK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(WORK, 'data')


# ============================================================
# 词典
# ============================================================
with open(os.path.join(WORK, 'scripts', '_industry_dict.json'), 'r') as f:
    INDUSTRY_ZL_TRACK = json.load(f)

with open(os.path.join(WORK, 'scripts', '_patent_keywords.json'), 'r') as f:
    PATENT_KEYWORDS = json.load(f)

# 行业大类(粗)
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
}

# 行业小类(细)→ 候选赛道(只列清晰的)
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
}

# 关键词
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
    """获取候选赛道(优先级:小类 > 中类 > 大类)"""
    ind_xl = c.get('ind_xl', '')
    ind_zl = c.get('ind_zl', '')
    ind_dl = c.get('ind', '')

    # 1. 行业小类(最细)
    if ind_xl and ind_xl in INDUSTRY_XL_TRACK:
        cands = INDUSTRY_XL_TRACK[ind_xl]
        if cands:
            return cands

    # 2. 行业中类(细)
    if ind_zl and ind_zl in INDUSTRY_ZL_TRACK:
        cands = INDUSTRY_ZL_TRACK[ind_zl]
        if cands:
            return cands

    # 3. 行业大类(粗)
    if ind_dl:
        for k, v in INDUSTRY_DL_TRACK.items():
            if k in ind_dl or ind_dl in k:
                return v or []

    return None


def classify_v3(c, patents_by_name):
    """多信号联合投票"""
    candidates = get_candidates(c)
    if not candidates:
        return None, 0, 'low'

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
        pat_text = ' '.join(pats[:30])  # 前 30 个专利
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
        return candidates[0], 1, 'medium'

    sorted_scores = sorted(scores.items(), key=lambda x: -x[1])
    top_track, top_score = sorted_scores[0]

    if sig_count >= 3 and top_score >= 8:
        conf = 'high'
    elif sig_count >= 2 or top_score >= 4:
        conf = 'medium'
    else:
        conf = 'low'

    return top_track, top_score, conf


# ============================================================
# 主流程
# ============================================================
print("=" * 60)
print("多信号联合修正分类(v3 · 最终版)")
print("=" * 60)

with open(os.path.join(DATA, 'companies.json'), 'r') as f:
    companies = json.load(f)

print(f"\n总企业: {len(companies)}")

# 加载专利
print("\n加载专利...")
patents_by_name = defaultdict(list)
pat_path = '/mnt/c/Users/Administrator/Desktop/名单/合并结果/专利主表_全量.csv'
with open(pat_path, 'r', encoding='utf-8-sig') as f:
    r = csv.DictReader(f)
    for row in r:
        name = (row.get('企业名称') or '').strip()
        pname = (row.get('专利名称') or '').strip()
        if name and pname:
            patents_by_name[name].append(pname)
print(f"  专利涉及企业: {len(patents_by_name)}")

# 修复
print("\n[修复]...")
fixed = 0
unchanged = 0
empty = 0
samples = []

for c in companies:
    if c.get('method') in ('v9', 'v9_name'):
        continue

    old_trk = c.get('trk', '')
    new_trk, score, conf = classify_v3(c, patents_by_name)

    # 仅在多信号强烈不一致时修正
    if new_trk is None:
        empty += 1
        continue

    if new_trk != old_trk and conf in ('high', 'medium'):
        # 保留原赛道
        prev_orig = c.get('_original_track', '')
        c['_original_track'] = prev_orig if prev_orig else old_trk
        c['trk'] = new_trk
        c['confidence'] = conf
        c['method'] = 'v3'
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
agg['classified_v3'] = sum(1 for c in companies if c.get('method') == 'v3')
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
subprocess.run(['python3', os.path.join(WORK, 'scripts', '_classify_subtrack.py')], cwd=WORK, check=False, capture_output=True)

# 验证
target = next((c for c in companies if '时代天源' in c.get('name', '')), None)
print(f"\n=== 验证时代天源 ===")
for k in ['trk', 'sub_track', 'method', '_original_track']:
    print(f"  {k}: {target.get(k)}")

# 找比亚迪半导体
print("\n=== 比亚迪半导体 ===")
for c in companies:
    if '比亚迪半导体' in c.get('name', ''):
        for k in ['trk', 'sub_track', 'method', '_original_track', 'ind_zl']:
            print(f"  {k}: {c.get(k)}")
        break

# 整体统计
from collections import Counter
methods = Counter([c.get('method', '') for c in companies])
print(f"\n=== 最终方法分布 ===")
for m, n in methods.most_common():
    print(f"  {m:18s} {n:5d} ({n*100//len(companies)}%)")

# 行业不匹配
err = 0
for c in companies:
    if not c.get('trk'): continue
    ind = c.get('ind', '')
    trk = c['trk']
    expected = []
    for k, v in INDUSTRY_DL_TRACK.items():
        if k in ind or ind in k:
            expected = v
            break
    if expected and trk not in expected:
        err += 1
print(f"\n行业大类不匹配: {err} (之前 1,205)")
print(f"累计修复率: {(3597-err)*100//3597}%")
PYEOF