#!/usr/bin/env python3
"""
拆分 companies.json → 瘦索引 + 详情附件

背景（2026-11-01 性能优化）：
  companies.json 有 22,765 家 × 32 字段 = 32.7MB 原始 / 6.14MB gzip。
  其中 biz(161字符) + desc(104字符) 两个长文本字段占了大头，
  但它们只用于「详情弹窗」和「CSV 导出」，列表页和筛选完全用不到。

  拆分后：
    companies.json  → 瘦索引（30 个轻字段），gzip 约 2.8MB，首屏加载
    company_details.json → biz/desc 等重字段，gzip 约 3.0MB，
                          用户打开详情时才按 code 取

用法：
  python3 scripts/_split_companies.py
"""
import json
import os
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(BASE, 'data')
SRC = os.path.join(DATA, 'companies.json')
IDX = os.path.join(DATA, 'companies.json')       # 原地瘦化
DET = os.path.join(DATA, 'company_details.json')  # 详情附件

# 瘦索引保留字段：表格列 + 筛选 + 详情弹窗里的轻字段
INDEX_FIELDS = [
    'code', 'name', 'status', 'legal', 'est', 'rc', 'pc', 'city', 'dist',
    'addr', 'phone', 'email', 'ind', 'risk', 'src', 'trk', 'sub', 'sci',
    'pat', 'confidence', 'method', 'chain_role', 'sub_track',
    'customer_ind', 'supplier_ind', 'emp', 'ind_zl', 'ind_xl', 'scale',
]

# 拆到详情附件的字段
DETAIL_FIELDS = ['biz', 'desc']


def main():
    if not os.path.exists(SRC):
        sys.exit('找不到 %s' % SRC)

    with open(SRC, encoding='utf-8') as f:
        companies = json.load(f)

    if not isinstance(companies, list):
        sys.exit('companies.json 不是数组，格式异常')

    index = []
    details = {}
    moved = set()

    for c in companies:
        rec = {}
        for k in INDEX_FIELDS:
            if k in c:
                rec[k] = c[k]
        index.append(rec)

        d = {}
        for k in DETAIL_FIELDS:
            if k in c and c[k]:
                d[k] = c[k]
                moved.add(k)
        if d:
            details[c.get('code')] = d

    with open(IDX, 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, separators=(',', ':'))
    with open(DET, 'w', encoding='utf-8') as f:
        json.dump(details, f, ensure_ascii=False, separators=(',', ':'))

    def mb(p):
        return os.path.getsize(p) / 1024 / 1024

    print('公司数        : %d' % len(companies))
    print('拆分字段      : %s' % ', '.join(sorted(moved)))
    print('瘦索引        : %.2f MB  (%s)' % (mb(IDX), os.path.basename(IDX)))
    print('详情附件      : %.2f MB  (%s, %d 家有详情)'
          % (mb(DET), os.path.basename(DET), len(details)))
    print('')
    print('下一步：重新预压缩')
    print('  bash /home/admin/.openclaw/workspace/scripts/precompress.sh')


if __name__ == '__main__':
    main()
