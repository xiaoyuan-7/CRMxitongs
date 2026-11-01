#!/usr/bin/env python3
"""
往 aggregates.json 补一个 chain_role_company_count 字段

用途（2026-11-01 性能优化）：
  首页首页卡片「链主网络 · N 家在主表」原本需要遍历全部 22,765 条 companies
  才能算出「有 chain_role 的公司数」，导致首页必须加载 2.1MB 的 companies.json。
  这个数字是静态的，直接预计算进 aggregates，首页就不需要 companies 了。

幂等：重复执行结果一致。
"""
import json
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(BASE, 'data')
COMPANIES = os.path.join(DATA, 'companies.json')
AGGREGATES = os.path.join(DATA, 'aggregates.json')

with open(COMPANIES, encoding='utf-8') as f:
    companies = json.load(f)

count = sum(1 for c in companies if c.get('chain_role'))

with open(AGGREGATES, encoding='utf-8') as f:
    agg = json.load(f)

if isinstance(agg, list):
    agg = agg[0] if agg else {}

agg['chain_role_company_count'] = count

with open(AGGREGATES, 'w', encoding='utf-8') as f:
    json.dump(agg, f, ensure_ascii=False, separators=(',', ':'))

print('chain_role_company_count =', count)
print('aggregates.json 已更新 (%.2f MB)' % (os.path.getsize(AGGREGATES) / 1048576))
