#!/usr/bin/env python3
"""
将 _v9_review_report.csv 转成 workbench 可用的 JSON + JS 文件

输入: scripts/_v9_review_report.csv (4156 行)
输出:
  - data/v9_review.json  - 完整 4156 条 (KEEP/CHANGE/...)
  - data/v9_review_remaining.json - 只剩 NEEDS_REVIEW + INDUSTRY_FALLBACK (~525 家)
  - data/v9_review.json.js
  - data/v9_review_remaining.json.js

跑法: python3 scripts/_v9_review_to_json.py
"""
import csv
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CSV_PATH = os.path.join(HERE, '_v9_review_report.csv')
DATA_DIR = os.path.join(ROOT, 'data')


def to_rows():
    """读 CSV → list[dict]"""
    if not os.path.exists(CSV_PATH):
        print(f'❌ CSV 不存在: {CSV_PATH}')
        sys.exit(1)

    rows = []
    # utf-8-sig 去掉 BOM (Windows Excel 写出来带 BOM,DictReader 第一个字段名会变 '\ufeffcode')
    with open(CSV_PATH, 'r', encoding='utf-8-sig') as f:
        for r in csv.DictReader(f):
            # 数值字段
            if r.get('top3_scores'):
                r['_scores'] = [
                    {'trk': s.split(':')[0], 'score': float(s.split(':')[1])}
                    for s in r['top3_scores'].split('|') if ':' in s
                ]
            else:
                r['_scores'] = []
            # 候选赛道 list
            if r.get('candidates'):
                r['_candidates'] = [c.strip() for c in r['candidates'].split('|') if c.strip()]
            else:
                r['_candidates'] = []
            rows.append(r)

    return rows


def write_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))


def write_js(json_path, js_path, var_name):
    """生成 window.<VAR> = <JSON>"""
    with open(json_path, 'r', encoding='utf-8') as f:
        data_str = f.read()
    with open(js_path, 'w', encoding='utf-8') as f:
        f.write(f'window.{var_name} = {data_str};\n')


def main():
    rows = to_rows()

    total = len(rows)
    by_action = {}
    for r in rows:
        a = r['action']
        by_action[a] = by_action.get(a, 0) + 1

    print(f'📊 CSV 总行数: {total}')
    for a, n in sorted(by_action.items(), key=lambda x: -x[1]):
        print(f'   {a}: {n}')

    # 完整列表
    full_path = os.path.join(DATA_DIR, 'v9_review.json')
    write_json(full_path, rows)
    print(f'✅ {full_path} ({total} 家)')

    # remaining: NEEDS_REVIEW + INDUSTRY_FALLBACK (算法拿不准,真要人工看)
    remaining = [r for r in rows if r['action'] in ('NEEDS_REVIEW', 'INDUSTRY_FALLBACK')]
    rem_path = os.path.join(DATA_DIR, 'v9_review_remaining.json')
    write_json(rem_path, remaining)
    print(f'✅ {rem_path} ({len(remaining)} 家,NEEDS_REVIEW + INDUSTRY_FALLBACK)')

    # 生成 .js (full_path 是 .json, 嵌 .js 后缀会变成 .json.js, 要去掉 .json 再加 .js)
    full_js = full_path[:-len('.json')] + '.js'
    rem_js = rem_path[:-len('.json')] + '.js'
    write_js(full_path, full_js, 'V9_REVIEW')
    write_js(rem_path, rem_js, 'V9_REVIEW_REMAINING')
    print(f'✅ {full_js}')
    print(f'✅ {rem_js}')


if __name__ == '__main__':
    main()