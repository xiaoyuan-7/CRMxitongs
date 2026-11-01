#!/usr/bin/env python3
"""分析 companies 瘦索引各字段的体积贡献，找出还能砍的肥字段"""
import json
import io
import gzip
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(BASE, 'data')

with open(os.path.join(DATA, 'companies.json'), encoding='utf-8') as f:
    idx = json.load(f)

def gzlen(o):
    buf = io.BytesIO()
    with gzip.GzipFile(fileobj=buf, mode='wb', compresslevel=6) as g:
        g.write(json.dumps(o, ensure_ascii=False, separators=(',', ':')).encode())
    return len(buf.getvalue())

total = gzlen(idx)
print('当前瘦索引 gzip: %.2f MB (%d 条)' % (total / 1048576, len(idx)))
print('')
print('%-18s %10s %8s' % ('字段', '原始占比', 'gzip占比'))
print('-' * 40)

# 每个字段单独加回去测增量
base = gzlen(idx)
for field in sorted(idx[0].keys()):
    stripped = [{k: v for k, v in c.items() if k != field} for c in idx]
    without = gzlen(stripped)
    delta = base - without
    raw_share = sum(len(json.dumps(c.get(field), ensure_ascii=False)) for c in idx) / 1048576
    print('%-18s %8.2f MB %7.1f%%' % (field, raw_share, delta / base * 100))
