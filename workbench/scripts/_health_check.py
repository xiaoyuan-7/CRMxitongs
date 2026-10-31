#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
_health_check.py · tech_v2.json 数据体检 (生成后自动跑)

输入: workbench/data/tech_v2.json
输出: 
  stdout: 体检报告 (7 项检查 + 退出码 0/1/2)
  - 0: 全部 OK
  - 1: 有 WARNING (可继续, 但建议处理)
  - 2: 有 ERROR (必须修)

检查项:
  1. 未分类 (trk 为空)              - 应=0
  2. _quality_issue 数据质量异常     - 应≤10 (Excel录入错误)
  3. 高分但 emp=0                   - 应≤200 (主表数据缺口, 但 UI 已警告)
  4. emp=0 但 inherited=True         - 反映主表 emp 字段缺口, 写进体检报告
  5. track 在 15 赛道白名单内        - 必须=0
  6. emp 字段类型/范围              - 必须都是数字
  7. banking_priority 范围 0-100     - 必须=0
"""

import json
import os
import sys
from collections import Counter

DATA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
TECH_V2_PATH = os.path.join(DATA, 'tech_v2.json')

# 15 赛道白名单 (2026-09-13 +'印刷包装' 用于 v8 营销一页通的 B 级赛道)
ALLOWED_TRACKS = {
    '软件/SaaS', '供应链-电子', '供应链-精密', '半导体', '化工/新材料',
    '新能源/储能', '检测/认证', '通信', '医疗器械', '消费升级',
    '机器人/AI', '汽车', '印刷包装', '生物医药', '其他',
}

# 退出码
EXIT_OK = 0
EXIT_WARN = 1
EXIT_ERROR = 2


def main():
    if not os.path.exists(TECH_V2_PATH):
        print(f'❌ 找不到 {TECH_V2_PATH}')
        sys.exit(EXIT_ERROR)

    with open(TECH_V2_PATH, 'r', encoding='utf-8') as f:
        tv2 = json.load(f)

    print('=' * 70)
    print(f'📊 tech_v2 健康检查 ({len(tv2)} 家)')
    print('=' * 70)

    issues = {'error': [], 'warn': []}

    # 1. 未分类
    unclassified = [c for c in tv2 if not c.get('trk')]
    if unclassified:
        issues['error'].append(f'❌ [ERROR] {len(unclassified)} 家未分类 (trk 为空)')
        for c in unclassified[:5]:
            issues['error'].append(f'    - {c["name"]} ({c.get("ind")})')

    # 2. _quality_issue (Excel 录入错误)
    quality = [c for c in tv2 if c.get('_quality_issue')]
    if len(quality) > 10:
        issues['error'].append(f'❌ [ERROR] {len(quality)} 家 _quality_issue 异常 (>10, 异常膨胀)')
    elif quality:
        issues['warn'].append(f'⚠️  [WARN]  {len(quality)} 家 _quality_issue 异常 (Excel录入错误, UI 已警告)')

    # 3. 高分但 emp=0
    hi_no_emp = [c for c in tv2 if (c.get('banking_priority') or 0) >= 80 and not c.get('emp')]
    if len(hi_no_emp) > 200:
        issues['warn'].append(f'⚠️  [WARN]  {len(hi_no_emp)} 家高分但 emp=0 (>200, 主表数据缺口扩大)')
    elif hi_no_emp:
        issues['warn'].append(f'⚠️  [WARN]  {len(hi_no_emp)} 家高分但 emp=0 (主表数据缺口, UI 已警告)')

    # 4. emp=0 但 inherited
    emp_zero_inherited = [c for c in tv2 if c.get('_inherited_from_main') and not c.get('emp')]
    if emp_zero_inherited:
        issues['warn'].append(f'⚠️  [INFO]  {len(emp_zero_inherited)} 家继承主表但 emp=0 (主表自身数据缺口 17.4%)')

    # 5. track 越界
    bad_track = [c for c in tv2 if c.get('trk') and c['trk'] not in ALLOWED_TRACKS]
    if bad_track:
        issues['error'].append(f'❌ [ERROR] {len(bad_track)} 家 track 不在 15 赛道白名单内')
        for c in bad_track[:5]:
            issues['error'].append(f'    - {c["name"]}: trk={c["trk"]!r}')

    # 6. emp 类型
    bad_emp = []
    for c in tv2:
        e = c.get('emp')
        if e is not None and (not isinstance(e, (int, float)) or e < 0 or e > 100000):
            bad_emp.append((c['name'], e))
    if bad_emp:
        issues['error'].append(f'❌ [ERROR] {len(bad_emp)} 家 emp 字段异常 (类型/范围)')
        for name, e in bad_emp[:5]:
            issues['error'].append(f'    - {name}: emp={e!r}')

    # 7. banking_priority 越界
    bad_pri = []
    for c in tv2:
        p = c.get('banking_priority')
        if p is None or not (0 <= p <= 100):
            bad_pri.append((c['name'], p))
    if bad_pri:
        issues['error'].append(f'❌ [ERROR] {len(bad_pri)} 家 banking_priority 越界 (应 0-100)')
        for name, p in bad_pri[:5]:
            issues['error'].append(f'    - {name}: priority={p!r}')

    # 8. 新动能 一致性 (战略 + 价值 + 简单是 = 总)
    nk_total = sum(1 for c in tv2 if c.get('is_newkinetic'))
    nk_strat = sum(1 for c in tv2 if c.get('newkinetic_level') == '战略层')
    nk_value = sum(1 for c in tv2 if c.get('newkinetic_level') == '价值层')
    nk_simple = sum(1 for c in tv2 if c.get('is_newkinetic') and not c.get('newkinetic_level'))
    if nk_total != nk_strat + nk_value + nk_simple:
        issues['error'].append(f'❌ [ERROR] 新动能分层不一致: 总={nk_total}, 战略+价值+简单={nk_strat + nk_value + nk_simple}')

    # 汇总
    print()
    print(f'【分布统计】')
    print(f'  S 级 (半导体/通信/软件/SaaS/医疗器械/生物医药):')
    for t in ['半导体', '通信', '软件/SaaS', '医疗器械', '生物医药']:
        n = sum(1 for c in tv2 if c.get('trk') == t)
        print(f'    {t:10s} {n:>4}')
    print(f'  A 级 (机器人/AI/新能源/检测):')
    for t in ['机器人/AI', '新能源/储能', '检测/认证']:
        n = sum(1 for c in tv2 if c.get('trk') == t)
        print(f'    {t:10s} {n:>4}')
    print(f'  B 级 (供应链/汽车):')
    for t in ['供应链-电子', '供应链-精密', '汽车']:
        n = sum(1 for c in tv2 if c.get('trk') == t)
        print(f'    {t:10s} {n:>4}')
    print(f'  C 级 (其他):')
    for t in ['化工/新材料', '消费升级', '其他']:
        n = sum(1 for c in tv2 if c.get('trk') == t)
        print(f'    {t:10s} {n:>4}')

    print()
    print(f'【重点营销客群】')
    big = sum(1 for c in tv2 if (c.get('emp') or 0) >= 100)
    big_rm = sum(1 for c in tv2 if (c.get('emp') or 0) >= 100 and c.get('rm'))
    big_rm_pri = sum(1 for c in tv2 if (c.get('emp') or 0) >= 100 and c.get('rm') and (c.get('banking_priority') or 0) >= 80)
    print(f'  ≥100 人企业:           {big} 家')
    print(f'  ≥100 人 + 已挂钩 RM:    {big_rm} 家 ← 立刻可联动')
    print(f'  ≥100 人 + RM + ≥80:    {big_rm_pri} 家 ← 金子')

    print()
    print(f'【分类来源】')
    inherited = sum(1 for c in tv2 if c.get('_inherited_from_main'))
    ab_only = sum(1 for c in tv2 if c.get('method') == 'ab')
    ab_ind = sum(1 for c in tv2 if c.get('method') == 'ab+industry')
    main_meths = Counter(c.get('method', '') for c in tv2 if c.get('_inherited_from_main'))
    print(f'  继承主表:  {inherited} ({inherited*100/len(tv2):.1f}%)')
    for m, n in main_meths.most_common(3):
        print(f'    └ {m}: {n}')
    print(f'  A+B 兜底:  {ab_only} ({ab_only*100/len(tv2):.1f}%)')
    print(f'  A+B+行业 fallback: {ab_ind} ({ab_ind*100/len(tv2):.1f}%)')

    print()
    print('=' * 70)
    if issues['error']:
        print('❌ 发现 ERROR:')
        for e in issues['error']:
            print(f'  {e}')
    if issues['warn']:
        print('⚠️  发现 WARN (可继续, 建议处理):')
        for w in issues['warn']:
            print(f'  {w}')
    if not issues['error'] and not issues['warn']:
        print('✅ 全部检查通过, 数据健康')
    print('=' * 70)

    if issues['error']:
        sys.exit(EXIT_ERROR)
    elif issues['warn']:
        sys.exit(EXIT_WARN)
    sys.exit(EXIT_OK)


if __name__ == '__main__':
    main()