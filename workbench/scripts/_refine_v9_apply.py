#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
_refine_v9_apply.py · 应用 v9 复检报告

输入: scripts/_v9_review_report.csv + (可选) scripts/_v9_manual_overrides.json
输出:
  - data/companies.json (改了 trk/sub_track/confidence/method)
  - data/companies.js   (重新挂全局)
  - data/aggregates.json + .js  (按新 trk 计数)
  - data/sub_tracks.json + .js   (按新 trk+sub_track 计数)

参数:
  --actions 逗号分隔, 默认 "CHANGE": 要应用的 action 列表
            可选: CHANGE / OPTIONAL_CHANGE
  --overrides PATH 手动覆盖文件 (可选, 优先级最高)
  --decisions PATH v9 复检 UI 导出的 decisions JSON (含 overrides + adopts)

⚠️ 修改前先备份。
"""

import argparse
import csv
import json
import os
import shutil
import sys
from collections import Counter, defaultdict
from datetime import datetime

WORK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(WORK, 'data')
SCRIPTS = os.path.join(WORK, 'scripts')

REVIEW_CSV = os.path.join(SCRIPTS, '_v9_review_report.csv')


# ============================================================
# 子赛道词典(用 ast 从 _classify_subtrack.py 里只读 SUBTRACK_KEYWORDS 常量,
# 不 import 整个文件,避免触发主流程重算 22765 家公司)
# ============================================================
import ast as _ast

_subtrack_path = os.path.join(SCRIPTS, '_classify_subtrack.py')
with open(_subtrack_path, 'r', encoding='utf-8') as _f:
    _src = _f.read()
_tree = _ast.parse(_src)
SUBTRACK_KEYWORDS = None
for _node in _tree.body:
    if isinstance(_node, _ast.Assign):
        for _target in _node.targets:
            if isinstance(_target, _ast.Name) and _target.id == 'SUBTRACK_KEYWORDS':
                SUBTRACK_KEYWORDS = _ast.literal_eval(_node.value)
                break
    if SUBTRACK_KEYWORDS is not None:
        break

if SUBTRACK_KEYWORDS is None:
    raise RuntimeError('找不到 SUBTRACK_KEYWORDS')

# TRACK_EMOJI (从 _build_workbench_data.py 复刻)
TRACK_EMOJI = {
    '软件/SaaS': '💻', '供应链-电子': '🔌', '供应链-精密': '⚙️',
    '半导体': '🔬', '化工/新材料': '🧪', '新能源/储能': '🔋',
    '检测/认证': '🔍', '通信': '📡', '医疗器械': '🏥',
    '消费升级': '🛍️', '机器人/AI': '🤖', '汽车': '🚗',
    '生物医药': '💊', '其他': '📦',
}


def classify_subtrack_for(c, trk):
    """根据 (trk, biz) 算 sub_track"""
    if not trk or trk not in SUBTRACK_KEYWORDS:
        return ''
    sub_dict = SUBTRACK_KEYWORDS[trk]
    if not sub_dict:
        return ''
    biz = c.get('biz', '') or ''
    text = biz
    scores = {}
    for sub_name, kws in sub_dict.items():
        score = sum(1 for kw in kws if kw in text)
        if score > 0:
            scores[sub_name] = score
    if not scores:
        return ''
    return max(scores.items(), key=lambda x: x[1])[0]


# ============================================================
# 主流程
# ============================================================
print("=" * 60)
print("应用 v9 复检报告 → companies.json + 重新生成 .js")
print("=" * 60)

# 参数解析
parser = argparse.ArgumentParser()
parser.add_argument('--actions', default='CHANGE',
                    help='逗号分隔的 action 列表, 默认 CHANGE. 可选: CHANGE / OPTIONAL_CHANGE')
parser.add_argument('--overrides', default='',
                    help='手动覆盖文件路径 (JSON, 旧格式: [{code,new_trk,...}])')
parser.add_argument('--decisions', default='',
                    help='v9 复检 UI 导出的 decisions JSON (新格式: {overrides:[], adopts:[], ...})')
args = parser.parse_args()
target_actions = set(a.strip() for a in args.actions.split(','))
print(f'  target actions: {target_actions}')

# 1. 读报告
print(f"\n[1/5] 读 {REVIEW_CSV}...")
changes = []
with open(REVIEW_CSV, encoding='utf-8-sig') as f:
    r = csv.DictReader(f)
    for row in r:
        if row['action'] in target_actions:
            changes.append(row)
print(f"  匹配行数: {len(changes)}")

# 1b. 读 manual_overrides (优先级最高, 会覆盖 review CSV)
overrides = []
if args.overrides and os.path.exists(args.overrides):
    with open(args.overrides, 'r', encoding='utf-8') as f:
        overrides = json.load(f)
    print(f"  manual overrides: {len(overrides)} 条")

# 1c. 读 UI 导出的 decisions 文件 (格式: {overrides:[], adopts:[], note, ...})
decisions = []
if args.decisions and os.path.exists(args.decisions):
    with open(args.decisions, 'r', encoding='utf-8') as f:
        dec_data = json.load(f)
    # 合并 overrides + adopts 为统一格式 (优先级: overrides > adopts)
    for ov in dec_data.get('overrides', []):
        decisions.append({
            'code': ov['code'],
            'name': ov.get('name', ''),
            'old_trk': ov.get('old_trk', ''),
            'new_trk': ov['new_trk'],
            'new_sub': '',  # UI 不传 sub, 后面跑分类器
            'new_conf': 'high',
            'reason': ov.get('_review_reason', 'v9-review-override(UI)'),
            'method': 'v9-review-override',
        })
    for ad in dec_data.get('adopts', []):
        decisions.append({
            'code': ad['code'],
            'name': ad.get('name', ''),
            'old_trk': ad.get('old_trk', ''),
            'new_trk': ad['new_trk'],
            'new_sub': '',
            'new_conf': 'high',
            'reason': ad.get('_review_reason', 'v9-review-adopt(UI)'),
            'method': 'v9-review-adopt',
        })
    print(f"  UI decisions: {len(decisions)} 条 (overrides={len(dec_data.get('overrides', []))} adopts={len(dec_data.get('adopts', []))})")
    # 合并到 overrides 列表,走同一条处理路径
    overrides = decisions + overrides

if not changes and not overrides:
    print("\n⚠️ 没有要应用的行,退出")
    sys.exit(0)

# 2. 备份
print(f"\n[2/5] 备份 data/companies.json...")
backup_path = os.path.join(DATA, f'companies.json.bak-{datetime.now().strftime("%Y%m%d-%H%M%S")}')
shutil.copy2(os.path.join(DATA, 'companies.json'), backup_path)
print(f"  → {backup_path}")

# 3. 改 companies.json
print(f"\n[3/5] 应用 {len(changes)} 家 trk/sub_track 修正...")
with open(os.path.join(DATA, 'companies.json'), 'r', encoding='utf-8') as f:
    companies = json.load(f)

by_code = {c['code']: c for c in companies}

REVIEW_DATE = '2026-08-17'

applied = 0
not_found = 0
skipped = 0
override_applied = 0

# 先应用 overrides (优先级最高)
for ov in overrides:
    code = ov['code']
    if code not in by_code:
        not_found += 1
        print(f"  ⚠️ override 未找到: {ov.get('name', code)}")
        continue

    c = by_code[code]
    old_trk = c.get('trk', '')
    old_sub = c.get('sub_track', '')

    # 备份原值
    if '_original_trk' not in c:
        c['_original_trk'] = old_trk
    if '_original_sub' not in c and old_sub:
        c['_original_sub'] = old_sub

    new_trk = ov['new_trk']
    new_sub = ov.get('new_sub', '')
    new_conf = ov.get('new_conf', 'high')

    c['trk'] = new_trk
    c['sub_track'] = new_sub  # 直接用 override 指定
    c['confidence'] = new_conf
    c['method'] = ov.get('method', 'v9-review-override')  # 采纳或手动
    c['_review_date'] = REVIEW_DATE
    c['_review_reason'] = ov.get('reason', '')

    override_applied += 1
    print(f"  override: {ov.get('name', code)[:25]:25s} {old_trk} → {new_trk}/{new_sub}")

# 然后应用 review CSV 的行
for ch in changes:
    # 如果已经被 override 跳过了
    code = ch['code']
    if code in [ov['code'] for ov in overrides]:
        continue

    if code not in by_code:
        not_found += 1
        continue

    c = by_code[code]

    # 安全检查: 如果 v9 review 推荐的 trk 跟现有一样, 跳过
    if c.get('trk') == ch['suggested_trk']:
        skipped += 1
        continue

    old_trk = c.get('trk', '')
    old_sub = c.get('sub_track', '')

    # 备份原值到 _original 字段(便于追溯)
    if '_original_trk' not in c:
        c['_original_trk'] = old_trk
    if '_original_sub' not in c and old_sub:
        c['_original_sub'] = old_sub

    # 应用新分类
    c['trk'] = ch['suggested_trk']
    new_sub = classify_subtrack_for(c, ch['suggested_trk'])
    if new_sub:
        c['sub_track'] = new_sub
    else:
        # 新 trk 下 biz 没命中任何子赛道关键词
        # 如果旧 sub_track 不属于新 trk 的子赛道词典 → 清空(防不一致)
        old_sub = c.get('sub_track', '')
        valid_subs = set(SUBTRACK_KEYWORDS.get(ch['suggested_trk'], {}).keys())
        if old_sub and old_sub not in valid_subs:
            c['sub_track'] = ''  # 清空不一致的 sub_track
    c['confidence'] = ch['suggested_conf']
    c['method'] = 'v9-review'  # 标记本次复检
    c['_review_date'] = REVIEW_DATE

    applied += 1

print(f"  override 应用: {override_applied}")
print(f"  review 应用: {applied}")
print(f"  跳过 (trk 已正确): {skipped}")
print(f"  未找到: {not_found}")

# 写回 companies.json
print(f"\n  → 写 companies.json...")
with open(os.path.join(DATA, 'companies.json'), 'w', encoding='utf-8') as f:
    json.dump(companies, f, ensure_ascii=False, allow_nan=False, separators=(',', ':'))

# 写 companies.js (挂全局)
print(f"  → 写 companies.js...")
with open(os.path.join(DATA, 'companies.js'), 'w', encoding='utf-8') as f:
    f.write('// Auto-generated from companies.json\nwindow.COMPANIES = ')
    json.dump(companies, f, ensure_ascii=False, allow_nan=False, separators=(',', ':'))
    f.write(';\n')

# 4. 重生成 aggregates.json
print(f"\n[4/5] 重生成 aggregates.json...")

TRACK_ORDER = [
    '软件/SaaS', '供应链-电子', '供应链-精密', '半导体',
    '化工/新材料', '新能源/储能', '检测/认证', '通信',
    '医疗器械', '消费升级', '机器人/AI', '汽车',
    '生物医药', '其他',
]

trk_counts = Counter(c.get('trk') for c in companies if c.get('trk'))
track_list = []
for t in TRACK_ORDER:
    track_list.append({
        'name': t,
        'classified_count': trk_counts.get(t, 0),
        'emoji': TRACK_EMOJI.get(t, '📦'),
    })

ind_dl_counts = Counter(c.get('ind') for c in companies if c.get('ind'))
dist_counts = Counter(c.get('dist') for c in companies if c.get('dist'))
city_counts = Counter(c.get('city') for c in companies if c.get('city'))

# 置信度
conf_counts = Counter(c.get('confidence', '') for c in companies)

# method 分布
method_counts = Counter(c.get('method', '') for c in companies)

aggregates = {
    'total': len(companies),
    'classified': sum(1 for c in companies if c.get('trk')),
    'unclassified': sum(1 for c in companies if not c.get('trk')),
    'with_phone': sum(1 for c in companies if c.get('phone')),
    'with_email': sum(1 for c in companies if c.get('email')),
    'confidence': dict(conf_counts),
    'tracks': track_list,
    'industries_dl': [{'name': k, 'count': v} for k, v in ind_dl_counts.most_common(30)],
    'cities': [{'name': k, 'count': v} for k, v in city_counts.most_common(20)],
    'districts': [{'name': k, 'count': v} for k, v in dist_counts.most_common(30)],
    'data_date': REVIEW_DATE,
    'v9_review_applied': True,
    'v9_review_changed': applied,
    'method_breakdown': dict(method_counts),
}

with open(os.path.join(DATA, 'aggregates.json'), 'w', encoding='utf-8') as f:
    json.dump(aggregates, f, ensure_ascii=False, allow_nan=False, separators=(',', ':'))
with open(os.path.join(DATA, 'aggregates.js'), 'w', encoding='utf-8') as f:
    f.write('// Auto-generated from aggregates.json\nwindow.AGGREGATES = ')
    json.dump(aggregates, f, ensure_ascii=False, allow_nan=False, separators=(',', ':'))
    f.write(';\n')
print(f"  → aggregates.json / .js")

# 5. 重生成 sub_tracks.json (按 trk + sub_track 计数)
print(f"\n[5/5] 重生成 sub_tracks.json...")
sub_meta = []
for main in TRACK_ORDER:
    subs = SUBTRACK_KEYWORDS.get(main, {})
    emoji = TRACK_EMOJI.get(main, '📦')

    if not subs:
        sub_meta.append({'name': main, 'emoji': emoji, 'count': trk_counts.get(main, 0), 'subs': []})
        continue

    sub_counts = Counter()
    for c in companies:
        if c.get('trk') == main and c.get('sub_track'):
            sub_counts[c['sub_track']] += 1

    sub_list = []
    for sub_name in subs.keys():
        sub_list.append({'name': sub_name, 'count': sub_counts.get(sub_name, 0)})
    # 加未知 sub_track (biz 里没命中关键词的)
    for sub_name, cnt in sub_counts.items():
        if sub_name not in subs:
            sub_list.append({'name': sub_name, 'count': cnt})

    sub_meta.append({'name': main, 'emoji': emoji, 'count': trk_counts.get(main, 0), 'subs': sub_list})

with open(os.path.join(DATA, 'sub_tracks.json'), 'w', encoding='utf-8') as f:
    json.dump(sub_meta, f, ensure_ascii=False, allow_nan=False, separators=(',', ':'))
with open(os.path.join(DATA, 'sub_tracks.js'), 'w', encoding='utf-8') as f:
    f.write('// Auto-generated from sub_tracks.json\nwindow.SUB_TRACKS = ')
    json.dump(sub_meta, f, ensure_ascii=False, allow_nan=False, separators=(',', ':'))
    f.write(';\n')
print(f"  → sub_tracks.json / .js")

# === 验证 ===
print(f"\n========== 验证 ==========")
with open(os.path.join(DATA, 'companies.json'), 'r', encoding='utf-8') as f:
    verify = json.load(f)
print(f"  companies 总数: {len(verify)}")
new_trk_dist = Counter(c.get('trk') for c in verify if c.get('trk'))
print(f"  trk 分布前 5:")
for t, n in new_trk_dist.most_common(5):
    print(f"    {t}: {n}")

# 验证埃尔法
for c in verify:
    if '埃尔法' in c.get('name', ''):
        print(f"\n  埃尔法:")
        print(f"    trk: {c.get('trk')} (原: {c.get('_original_trk')})")
        print(f"    sub_track: {c.get('sub_track')} (原: {c.get('_original_sub')})")
        print(f"    confidence: {c.get('confidence')}")
        print(f"    method: {c.get('method')}")
        break

print(f"\n✅ 应用完毕")
print(f"  备份: {backup_path}")
print(f"  改了: {applied} 家")
print(f"  下一步: Ctrl+Shift+R 强刷 workbench")