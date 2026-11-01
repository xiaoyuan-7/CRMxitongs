#!/usr/bin/env python3
"""
给 data-loader.js 里的 DATA_VERSIONS 打上数据文件的内容哈希。

为什么需要（2026-11-01）：
  数据文件 URL 是固定的（data/companies.json），而 static-server 对
  .json 发 `cache-control: public, max-age=300`。数据更新后，
  浏览器在 5 分钟缓存期内仍可能用旧内容 —— 表现为「改了没生效」。

  做法：把文件内容 md5 前 8 位写进 DATA_VERSIONS，fetch 时作为 ?v= 参数。
  内容变了 URL 就变了，浏览器必然重新下载，杜绝陈旧缓存。

用法：
  python3 scripts/_stamp_versions.py
"""
import hashlib
import os
import re

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(BASE, 'data')
LOADER = os.path.join(BASE, 'data-loader.js')

# 需要纳入版本管理的文件（与 data-loader.js 的 DATASETS 保持一致）
FILES = [
    '_fields', 'aggregates', 'sub_tracks', 'chain_links', 'overlap_28',
    'companies', 'company_details',
    'top50_classified', 'top500_unclassified', 'v9_review',
    'tech_v2', 'relations',
]


def md5_short(path):
    h = hashlib.md5()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()[:8]


def main():
    versions = {}
    for name in FILES:
        p = os.path.join(DATA, name + '.json')
        if not os.path.exists(p):
            print('  跳过（不存在）: %s.json' % name)
            continue
        versions[name] = md5_short(p)

    if not versions:
        print('没有可打戳的文件')
        return

    with open(LOADER, encoding='utf-8') as f:
        src = f.read()

    block = '  var DATA_VERSIONS = {\n'
    for k in FILES:
        if k in versions:
            block += '    "%s": "%s",\n' % (k, versions[k])
    block += '  };\n'

    new_src, n = re.subn(
        r'  var DATA_VERSIONS = \{.*?\n  \};\n',
        block, src, count=1, flags=re.S)
    if n == 0:
        # 首次生成：插在 IIFE 开头
        new_src = re.sub(
            r"(\(function \(\) \{\n  'use strict';\n)",
            r"\1\n" + block, src, count=1)

    if new_src != src:
        with open(LOADER, 'w', encoding='utf-8') as f:
            f.write(new_src)
        print('已更新 data-loader.js 的 DATA_VERSIONS（%d 个文件）' % len(versions))
    else:
        print('DATA_VERSIONS 已是最新（%d 个文件）' % len(versions))

    for k, v in versions.items():
        print('  %-24s %s' % (k + '.json', v))


if __name__ == '__main__':
    main()
