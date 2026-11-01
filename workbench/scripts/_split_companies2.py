#!/usr/bin/env python3
"""
第二轮瘦身：把只在「详情/导出」用到的字段挪进详情附件

背景（2026-11-01）：
  公网 tunnel 实测吞吐仅 ~300KB/s，且每次请求 TTFB 1-3 秒（跨境链路）。
  首屏必须压到 1MB 以内才能在手机上可接受。

  字段体积分析（gzip 占比）：
    addr 25.4%  phone 13.7%  email 10.4%  code 7.7%  legal 7.1%  name 8.3%
  → addr 只在详情弹窗/搜索/导出用，挪走省 25%
  → phone/email 表格要显示，保留

  产出：
    companies.json       列表+筛选+表格用（不含 addr/biz/desc）
    company_details.json addr/biz/desc 等详情字段
"""
import json
import os
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(BASE, 'data')
SRC = os.path.join(DATA, 'companies.json')
IDX = os.path.join(DATA, 'companies.json')
DET = os.path.join(DATA, 'company_details.json')

INDEX_FIELDS = [
    # 标识
    'code', 'name', 'legal',
    # 表格列
    'status', 'scale', 'trk', 'sub', 'sub_track', 'ind', 'ind_zl', 'ind_xl',
    'city', 'dist', 'emp', 'confidence', 'method', 'chain_role',
    'customer_ind', 'supplier_ind',
    # 数值/指标
    'est', 'rc', 'pc', 'sci', 'pat', 'risk', 'src',
    # 联系方式（表格要显示）
    'phone', 'email',
]

DETAIL_FIELDS = ['addr', 'biz', 'desc']


def main():
    if not os.path.exists(SRC):
        sys.exit('找不到 %s' % SRC)

    with open(SRC, encoding='utf-8') as f:
        companies = json.load(f)
    if not isinstance(companies, list):
        sys.exit('companies.json 不是数组')

    # 若上轮已拆分过，companies.json 里已无 biz/desc/addr，
    # 需要从备份合并；这里直接用备份还原，保证字段完整
    backup = '/tmp/companies.backup.json'
    if os.path.exists(backup):
        with open(backup, encoding='utf-8') as f:
            full = json.load(f)
        if isinstance(full, list) and len(full) == len(companies):
            companies = full
            print('已从备份还原完整字段')

    index, details = [], {}
    for c in companies:
        index.append({k: c[k] for k in INDEX_FIELDS if k in c})
        d = {k: c[k] for k in DETAIL_FIELDS if k in c and c[k]}
        if d:
            details[c.get('code')] = d

    with open(IDX, 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, separators=(',', ':'))
    with open(DET, 'w', encoding='utf-8') as f:
        json.dump(details, f, ensure_ascii=False, separators=(',', ':'))

    mb = lambda p: os.path.getsize(p) / 1048576
    print('公司数    : %d' % len(companies))
    print('瘦索引    : %.2f MB  (gzip 后约 %.2f MB)' % (
        mb(IDX), mb(IDX) * 0.19))
    print('详情附件  : %.2f MB  (%d 家)' % (mb(DET), len(details)))


if __name__ == '__main__':
    main()
