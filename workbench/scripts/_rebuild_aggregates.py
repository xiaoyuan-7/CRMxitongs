#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
_rebuild_aggregates.py · 从 companies.json 重新生成 aggregates.json

(被 _import_tech_v2.py 误触发 _build_workbench_data 后用此恢复)
"""
import json
import os
from collections import Counter

DATA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')

with open(os.path.join(DATA, 'companies.json'), 'r', encoding='utf-8') as f:
    companies = json.load(f)

print(f'companies: {len(companies)}')

classified_v9 = sum(1 for c in companies if c.get('method') in ('v9', 'v9_name'))
classified_ab = sum(1 for c in companies if c.get('method') == 'ab')
classified = sum(1 for c in companies if c.get('trk'))
unclassified = sum(1 for c in companies if not c.get('trk'))

print(f'  v9: {classified_v9}')
print(f'  ab: {classified_ab}')
print(f'  classified: {classified}')
print(f'  unclassified: {unclassified}')

# confidence 分布
conf_counts = Counter()
for c in companies:
    if c.get('method') == 'ab':
        conf_counts[c.get('confidence', 'low')] += 1

# 赛道
track_counts = Counter()
for c in companies:
    if c.get('trk'):
        track_counts[c['trk']] += 1

# 行业大类
ind_counts = Counter()
for c in companies:
    if c.get('ind'):
        ind_counts[c['ind']] += 1

# 城市 / 区县
city_counts = Counter()
dist_counts = Counter()
for c in companies:
    if c.get('city'):
        city_counts[c['city']] += 1
    if c.get('dist'):
        dist_counts[c['dist']] += 1

# 规模
scale_counts = Counter()
for c in companies:
    if c.get('scale'):
        scale_counts[c['scale']] += 1

# 状态
status_counts = Counter()
for c in companies:
    if c.get('status'):
        status_counts[c['status']] += 1

# 合并 tech_v2 的统计
TECH_V2 = os.path.join(DATA, 'tech_v2.json')
if os.path.exists(TECH_V2):
    with open(TECH_V2, 'r', encoding='utf-8') as f:
        tech_v2 = json.load(f)
    tech_v2_stats = {
        'total': len(tech_v2),
        'linked_rm': sum(1 for c in tech_v2 if c.get('rm')),
        'high_tech': sum(1 for c in tech_v2 if c.get('is_hightech')),
        'specialized': sum(1 for c in tech_v2 if c.get('is_specialized')),
        'no_account': sum(1 for c in tech_v2 if not c.get('has_account')),
        'priority_top': sum(1 for c in tech_v2 if c.get('banking_priority', 0) >= 80),
        'big_with_rm': sum(1 for c in tech_v2 if c.get('emp', 0) >= 100 and c.get('rm')),
        'big_total': sum(1 for c in tech_v2 if c.get('emp', 0) >= 100),
        'huge_total': sum(1 for c in tech_v2 if c.get('emp', 0) >= 500),
        'inherited': sum(1 for c in tech_v2 if c.get('_inherited_from_main')),
        'quality_issue': sum(1 for c in tech_v2 if c.get('_quality_issue')),
    }
else:
    tech_v2_stats = None

aggregates = {
    'total': len(companies),
    'classified_v9': classified_v9,
    'classified_ab': classified_ab,
    'classified': classified,
    'unclassified': unclassified,
    'with_phone': sum(1 for c in companies if c.get('phone')),
    'with_email': sum(1 for c in companies if c.get('email')),
    'with_biz': sum(1 for c in companies if c.get('biz')),
    'with_desc': sum(1 for c in companies if c.get('desc')),
    'confidence': dict(conf_counts),
    'tracks': [
        {'name': t, 'classified_count': track_counts.get(t, 0), 'emoji': '📦'}
        for t in [
            '软件/SaaS', '供应链-电子', '供应链-精密', '半导体', '化工/新材料',
            '新能源/储能', '检测/认证', '通信', '医疗器械', '消费升级',
            '机器人/AI', '汽车', '生物医药', '其他'
        ]
    ],
    'industries_dl': [{'name': k, 'count': v} for k, v in ind_counts.most_common(30)],
    'cities': [{'name': k, 'count': v} for k, v in city_counts.most_common(20)],
    'districts': [{'name': k, 'count': v} for k, v in dist_counts.most_common(30)],
    'scales': [{'name': k, 'count': v} for k, v in scale_counts.most_common()],
    'statuses': [{'name': k, 'count': v} for k, v in status_counts.most_common()],
    'data_date': '2026-08-16',
    'tech_v2': tech_v2_stats,
}

with open(os.path.join(DATA, 'aggregates.json'), 'w', encoding='utf-8') as f:
    json.dump(aggregates, f, ensure_ascii=False, allow_nan=False, separators=(',', ':'))

# 重新生成 .js
with open(os.path.join(DATA, 'aggregates.js'), 'w', encoding='utf-8') as f:
    with open(os.path.join(DATA, 'aggregates.json'), 'r', encoding='utf-8') as fin:
        content = fin.read()
    f.write(f'// Auto-generated from aggregates.json\nwindow.AGGREGATES = {content};\n')

print(f'\n✅ aggregates.json 恢复')
print(f'   tracks: {sum(t["classified_count"] for t in aggregates["tracks"])}')
print(f'   confidence: {aggregates["confidence"]}')
if tech_v2_stats:
    print(f'   tech_v2: {tech_v2_stats}')