#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
_import_tech_v2.py · 导入「科创企业总表_分类v2.xls」到工作台

输入:
  /mnt/c/Users/Administrator/Desktop/名单/科创企业总表_分类v2.xls  (28 sheets)
  主表用「初筛总表」(4097 家, 40 字段)

输出:
  workbench/data/tech_v2.json     4097 家(瘦字段 + 公私联动 + 政策性标签 + 优质分)
  workbench/data/tech_v2.js       window.TECH_V2 = [...]

字段映射 (xls 字段 → workbench schema):
  企业名称             → name
  统一社会信用代码      → code
  法定代表人           → legal
  电话 + 更多电话       → phone (合并, 取第一个)
  邮箱 + 更多邮箱       → email (合并, 取第一个)
  企业地址             → addr
  注册资本             → rc (parse_wan)
  成立日期             → est
  登记状态             → status
  所属行业             → ind
  经营范围             → biz
  注册地-区            → dist

新增字段 (公私联动):
  rm           法人零售客户经理名称
  rm_branch    法人零售网点机构名称
  customer_id  客户号
  is_value     是否价值户

新增字段 (政策性标签):
  is_hightech     是否高新企业
  is_newkinetic   是否新动能客群
  is_specialized  是否国家级"专精特新"小巨人
  is_pevc         是否PEVC已投

新增字段 (对公现状):
  has_account  是否有账户
  has_credit   是否有授信

分类:
  复用 _build_workbench_data.py 的 A+B 关键词分类
  14 赛道:软件/SaaS / 供应链-电子 / 供应链-精密 / 半导体 / 化工/新材料 /
         新能源/储能 / 检测/认证 / 通信 / 医疗器械 / 消费升级 / 机器人/AI /
         汽车 / 生物医药 / 其他

优质分 (banking_priority 0-100):
  track_priority  赛道优先级 (S=30 / A=22 / B=15 / C=8)
  linkage         公私联动挂钩 (有RM=25 / 有网点但无RM=15 / 仅客户号=8)
  policy_tag      政策性标签 (专精特新=20 / 高新=15 / PEVC=12 / 新动能=10 / 累加封顶20)
  account_gap     对公现状 (未开户=15 / 未授信+8)
  confidence      分类置信度 (high=10 / medium=6 / low=3)
"""

import ast
import csv
import json
import os
import re
import sys
from collections import Counter, defaultdict


def _load_constants_from_module(path):
    """从 _build_workbench_data.py 只读常量, 不执行主流程 (踩过的坑!)
    复用 build_workbench_data 的 TRACK_ORDER / TRACK_EMOJI / 关键词词典 / 工具函数
    """
    with open(path, 'r', encoding='utf-8') as f:
        source = f.read()

    # 1) TRACK_ORDER + TRACK_EMOJI + INDUSTRY_DEFAULT: ast.literal_eval 安全读
    namespace = {}

    # 抓 TRACK_ORDER
    m = re.search(r'TRACK_ORDER\s*=\s*(\[.*?\])', source, re.DOTALL)
    if m:
        namespace['TRACK_ORDER'] = ast.literal_eval(m.group(1))

    # 抓 TRACK_EMOJI
    m = re.search(r'TRACK_EMOJI\s*=\s*(\{.*?\})', source, re.DOTALL)
    if m:
        namespace['TRACK_EMOJI'] = ast.literal_eval(m.group(1))

    # 抓 INDUSTRY_DEFAULT
    m = re.search(r'INDUSTRY_DEFAULT\s*=\s*(\{.*?\n\})', source, re.DOTALL)
    if m:
        namespace['INDUSTRY_DEFAULT'] = ast.literal_eval(m.group(1))

    # 抓 TRACK_KEYWORDS (嵌套 dict)
    m = re.search(r'TRACK_KEYWORDS\s*=\s*(\{.*?\n\})\n\n', source, re.DOTALL)
    if m:
        namespace['TRACK_KEYWORDS'] = ast.literal_eval(m.group(1))

    return namespace


_constants = _load_constants_from_module(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), '_build_workbench_data.py')
)
TRACK_ORDER = _constants['TRACK_ORDER']
TRACK_EMOJI = _constants['TRACK_EMOJI']
TRACK_KEYWORDS = _constants['TRACK_KEYWORDS']
INDUSTRY_DEFAULT = _constants['INDUSTRY_DEFAULT']


# 工具函数 (从 build_workbench_data 复制过来, 避免触发主流程)
def clean(s):
    if s is None:
        return ''
    s = str(s).strip()
    if s in ('-', '—', 'null', 'NULL', 'None'):
        return ''
    return s


def short(s, n):
    s = clean(s)
    if not s:
        return ''
    if len(s) > n:
        return s[:n] + '…'
    return s


def first_email(s):
    if not s:
        return ''
    for p in re.split(r'[;,]', str(s)):
        p = p.strip()
        if '@' in p:
            return p
    return ''


def get_industry_default(industry_dl):
    if not industry_dl:
        return []
    for k, v in INDUSTRY_DEFAULT.items():
        if k in industry_dl or industry_dl in k:
            return v or []
    return []


def classify_ab(c):
    """A+B 分类: 返回 (track_top, track_sub, score, confidence)"""
    biz = c.get('biz', '') or ''
    desc = c.get('desc', '') or ''
    name = c.get('name', '') or ''
    industry_dl = c.get('ind', '') or ''
    text = biz + ' ' + desc + ' ' + name

    scores = defaultdict(float)

    # A. 行业大类默认分
    default_tracks = get_industry_default(industry_dl)
    for t in default_tracks:
        scores[t] += 30

    # B. 关键词打分
    for track, kws in TRACK_KEYWORDS.items():
        core_hits = sum(1 for kw in kws['core'] if kw in text)
        if core_hits > 0:
            scores[track] += core_hits * 8
        support_hits = sum(1 for kw in kws['support'] if kw in text)
        if support_hits > 0:
            scores[track] += support_hits * 3

    if not scores:
        return ('', '', 0, 'low')

    sorted_tracks = sorted(scores.items(), key=lambda x: -x[1])
    main_track, main_score = sorted_tracks[0]

    sub_track = ''
    if len(sorted_tracks) > 1:
        second = sorted_tracks[1]
        if second[1] >= main_score * 0.6 and second[1] >= 20:
            sub_track = second[0]

    confidence = 'low'
    if main_score >= 50:
        confidence = 'high'
    elif main_score >= 30:
        confidence = 'medium'

    return (main_track, sub_track, round(main_score, 1), confidence)

WORK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(WORK, 'data')
os.makedirs(DATA, exist_ok=True)


# ============================================================
# 赛道优先级 (银行对公偏好)
# ============================================================
TRACK_PRIORITY = {
    # S 级 - 高资本 / 高毛利 / 长周期
    '半导体': 'S',
    '通信': 'S',
    '软件/SaaS': 'S',
    '医疗器械': 'S',
    '生物医药': 'S',
    # A 级 - 政策支持 / 增长
    '机器人/AI': 'A',
    '新能源/储能': 'A',
    '检测/认证': 'A',
    # B 级 - 量大利薄
    '供应链-电子': 'B',
    '供应链-精密': 'B',
    '汽车': 'B',
    # C 级 - 竞争充分 / 弱优
    '化工/新材料': 'C',
    '消费升级': 'C',
    '其他': 'C',
}
TRACK_PRIORITY_SCORE = {'S': 30, 'A': 22, 'B': 15, 'C': 8}

# ============================================================
# 工具
# ============================================================
def parse_wan_v2(s):
    """专治 xls 注册资本 (类似 '981.5万元人民币' / '966.972452万元人民币')"""
    s = clean(s)
    if not s:
        return None
    m = re.search(r'([\d.]+)', s)
    if not m:
        return None
    try:
        v = float(m.group(1))
        if '亿' in s:
            return v * 10000
        return v  # 假设已是"万"
    except Exception:
        return None


def first_phone(s):
    """取第一个电话 (去掉分机)"""
    if not s:
        return ''
    s = clean(s)
    if not s:
        return ''
    for p in re.split(r'[;,；]', s):
        p = p.strip()
        if p and p not in ('-', '—'):
            return p
    return ''


def all_phones(s):
    """合并 phone + 更多电话"""
    parts = []
    for src in [s]:
        if src and src != '-':
            for p in re.split(r'[;,；]', str(src)):
                p = p.strip()
                if p and p not in ('-', '—'):
                    parts.append(p)
    return '; '.join(parts[:3])  # 最多存 3 个


def yes(s):
    """严格匹配: '是' → True. 异常值如 '42' 走 _quality_issue 标记"""
    return str(s).strip() == '是'


def quality_issue_flag(s):
    """检测数据质量异常: 应该是 '是/否/未知' 但出现了其他值"""
    v = str(s).strip()
    if not v or v in ('-', '—'):
        return False
    if v in ('是', '否', '未知'):
        return False
    return True  # 异常值 (如 '42')


def parse_newkinetic(s):
    """新动能列可能为 '是/否/未知' 或 '新动能（战略层）' / '新动能（价值层）'. 返回 (is_newkinetic, level)"""
    v = str(s).strip()
    if v == '是':
        return (True, '')
    if '新动能' in v:
        if '战略层' in v:
            return (True, '战略层')
        if '价值层' in v:
            return (True, '价值层')
        return (True, '')
    return (False, '')


def compute_quality_score(c):
    """
    banking_priority: 0-100, 综合打分用于排序

    维度:
      - 赛道优先级      (0-30)
      - 公私联动挂钩    (0-25)
      - 政策性标签      (0-20, 累加封顶)
      - 对公增量空间    (0-15)
      - 分类置信度      (0-10)
    """
    score = 0

    # 1. 赛道优先级
    trk = c.get('trk') or ''
    pri = TRACK_PRIORITY.get(trk, 'C')
    score += TRACK_PRIORITY_SCORE[pri]

    # 2. 公私联动挂钩
    if c.get('rm'):
        score += 25
    elif c.get('rm_branch'):
        score += 15
    elif c.get('customer_id'):
        score += 8

    # 3. 政策性标签 (累加封顶 20)
    policy = 0
    if c.get('is_specialized'):
        policy += 20
    if c.get('is_hightech'):
        policy += 15
    if c.get('is_pevc'):
        policy += 12
    if c.get('is_newkinetic'):
        policy += 10
    score += min(policy, 20)

    # 数据质量异常 (如专精特新列出现 '42') - 额外 +5 但加人工 review 标
    if c.get('_quality_issue'):
        score += 5

    # 4. 对公增量空间
    if not c.get('has_account'):
        score += 15
    if not c.get('has_credit') and c.get('has_account'):
        score += 8

    # 5. 分类置信度
    conf = c.get('confidence') or 'low'
    score += {'high': 10, 'medium': 6, 'low': 3}.get(conf, 3)

    # 6. 企业规模 (员工数) - 人多 = 触达面广
    emp = c.get('emp') or 0
    if emp >= 500:
        score += 20
    elif emp >= 200:
        score += 15
    elif emp >= 100:
        score += 10
    elif emp >= 50:
        score += 5
    elif emp >= 10:
        score += 2
    # emp < 10: +0 (过小不值得重点)

    # 7. 分类继承自主表 (v9/ab+patent 算法更准) +3
    if c.get('_inherited_from_main'):
        score += 3

    return min(score, 100)


# ============================================================
# 主流程
# ============================================================
print('=' * 60)
print('导入「科创企业总表_分类v2」→ 工作台公私联动池')
print('=' * 60)


# Step 0: 加载主表 companies.json (用于 join emp / 继承 trk)
print('\n[0/4] 加载主表 companies.json (用于 join emp + 继承 trk)...')
COMPANIES_PATH = os.path.join(DATA, 'companies.json')
MASTER = {}
if os.path.exists(COMPANIES_PATH):
    with open(COMPANIES_PATH, 'r', encoding='utf-8') as f:
        for c in json.load(f):
            if c.get('code'):
                MASTER[c['code']] = c
    print(f'  主表加载: {len(MASTER)} 家')


def load_xls(path, sheet_name='初筛总表'):
    import xlrd
    wb = xlrd.open_workbook(path, formatting_info=False)
    sh = wb.sheet_by_name(sheet_name)

    headers = [sh.cell_value(0, c) for c in range(sh.ncols)]

    def find_col(needle):
        for i, h in enumerate(headers):
            if needle in str(h):
                return i
        return -1

    cols = {
        'name': find_col('企业名称'),
        'status': find_col('登记状态'),
        'legal': find_col('法定代表人'),
        'rc': find_col('注册资本'),
        'est': find_col('成立日期'),
        'phone': find_col('电话'),
        'phone_more': find_col('更多电话'),
        'email': find_col('邮箱'),
        'email_more': find_col('更多邮箱'),
        'code': find_col('统一社会信用代码'),
        'ind': find_col('所属行业'),
        'addr': find_col('企业地址'),
        'biz': find_col('经营范围'),
        'dist': find_col('注册地-区'),
        'is_hightech': find_col('高新'),
        'is_newkinetic': find_col('新动能'),
        'is_specialized': find_col('专精特新'),
        'is_pevc': find_col('PEVC'),
        'has_account': find_col('是否有账户'),
        'has_credit': find_col('是否有授信'),
        'rm': find_col('法人零售客户经理'),
        'rm_branch': find_col('法人零售网点机构'),
        'customer_id': find_col('客户号'),
        'is_value': find_col('是否价值户'),
    }

    rows = []
    for r in range(1, sh.nrows):
        row = sh.row(r)
        rec = {}
        for k, c in cols.items():
            if c >= 0:
                rec[k] = clean(row[c].value)
        if not rec.get('code') or not rec.get('name'):
            continue
        rows.append(rec)
    return rows


XLS_PATH = '/mnt/c/Users/Administrator/Desktop/名单/科创企业总表_分类v2.xls'

# Step 1: 加载 xls
print('\n[1/4] 加载 xls (sheet=初筛总表)...')
raw = load_xls(XLS_PATH)
print(f'  原始: {len(raw)} 家')

# Step 2: 字段标准化 + 分类
print('\n[2/4] 字段标准化 + 14 赛道分类 (优先继承主表 v9/ab+patent, 补 A+B)...')

companies = []
for row in raw:
    code = row['code']
    name = row['name']
    ind = row['ind']
    biz = row['biz']

    # 工作台 schema 字段
    rec = {
        'code': code,
        'name': name,
        'status': row['status'],
        'legal': row['legal'],
        'est': row['est'],
        'rc': parse_wan_v2(row['rc']),
        'pc': None,
        'city': '深圳市',
        'dist': row['dist'] if row['dist'] and row['dist'] not in ('未知',) else '宝安区',
        'addr': short(row['addr'], 80),
        'phone': all_phones(row.get('phone') or ''),
        'email': first_email((row.get('email') or '') + ';' + (row.get('email_more') or '')),
        'ind': ind,
        'ind_zl': None,
        'ind_xl': None,
        'scale': None,
        'emp': None,
        'risk': None,
        'src': '科创名单v2',
        'biz': short(biz, 200),
        'desc': None,
    }

    # 公私联动 + 政策性标签 + 对公现状 (tech_v2 独有字段)
    rec.update({
        # 公私联动
        'rm': clean(row.get('rm')),
        'rm_branch': clean(row.get('rm_branch')),
        'customer_id': clean(row.get('customer_id')),
        'is_value': yes(row.get('is_value')),
        # 政策性标签
        'is_hightech': yes(row.get('is_hightech')),
        'is_specialized': yes(row.get('is_specialized')),
        'is_pevc': yes(row.get('is_pevc')),
        # 新动能: 可能为 '是' 或 '新动能（战略层）' / '新动能（价值层）'
        'is_newkinetic': parse_newkinetic(row.get('is_newkinetic'))[0],
        'newkinetic_level': parse_newkinetic(row.get('is_newkinetic'))[1],
        # 对公现状
        'has_account': yes(row.get('has_account')),
        'has_credit': yes(row.get('has_credit')),
        # 数据质量标记: 真正异常值 (如 '42') 才标 (新动能的'战略层/价值层'已结构化处理)
        '_quality_issue': (
            quality_issue_flag(row.get('is_hightech'))
            or quality_issue_flag(row.get('is_specialized'))
            or quality_issue_flag(row.get('is_pevc'))
        ),
        '_quality_detail': (
            ('专精特新=' + str(row.get('is_specialized')) if quality_issue_flag(row.get('is_specialized')) else '')
            + (' PEVC=' + str(row.get('is_pevc')) if quality_issue_flag(row.get('is_pevc')) else '')
            + (' 高新=' + str(row.get('is_hightech')) if quality_issue_flag(row.get('is_hightech')) else '')
        ).strip(),
    })

    # A+B 关键词分类 (复用 build_workbench_data 的逻辑)
    ab_input = {
        'biz': rec['biz'],
        'desc': '',
        'name': rec['name'],
        'ind': rec['ind'],
    }
    ab_trk, ab_sub, ab_score, ab_conf = classify_ab(ab_input)

    # 优先继承主表分类 (v9 + ab+industry + ab+patent, 这些比纯 A+B 准)
    master = MASTER.get(code)
    if master and master.get('trk'):
        # 主表已有分类, 优先使用
        rec['trk'] = master['trk']
        rec['sub'] = master.get('sub')
        rec['confidence'] = master.get('confidence', 'medium')
        # method 继承并标注
        m_method = master.get('method', 'main')
        rec['method'] = f'main({m_method})'
        rec['_inherited_from_main'] = True
        # 但记录 A+B 备选, 后续可复检
        rec['_ab_trk'] = ab_trk
        rec['_ab_score'] = ab_score
        # emp / sci / pat / chain_role / sub_track / customer_ind / supplier_ind 从主表拿
        rec['emp'] = master.get('emp') or 0
        rec['sci'] = master.get('sci')
        rec['pat'] = master.get('pat')
        rec['chain_role'] = master.get('chain_role') or []
        rec['sub_track'] = master.get('sub_track')
        rec['customer_ind'] = master.get('customer_ind') or []
        rec['supplier_ind'] = master.get('supplier_ind') or []
        rec['risk'] = master.get('risk')
        rec['scale'] = master.get('scale')
        rec['ind_zl'] = master.get('ind_zl')
        rec['ind_xl'] = master.get('ind_xl')
    else:
        # 主表没这家, 用 A+B
        rec['trk'] = ab_trk
        rec['sub'] = ab_sub if ab_sub and ab_sub != ab_trk else None
        rec['confidence'] = ab_conf
        rec['method'] = 'ab'
        rec['_inherited_from_main'] = False
        rec['_ab_trk'] = ab_trk
        rec['_ab_score'] = ab_score
        rec['emp'] = 0
        rec['sci'] = None
        rec['pat'] = None
        rec['chain_role'] = []
        rec['sub_track'] = None
        rec['customer_ind'] = []
        rec['supplier_ind'] = []
        rec['risk'] = None
        rec['scale'] = None
        rec['ind_zl'] = None
        rec['ind_xl'] = None

    companies.append(rec)

print(f'  → {len(companies)} 家')

# Step 3: 优质分
print('\n[3/4] 优质分 (banking_priority)...')

for c in companies:
    c['banking_priority'] = compute_quality_score(c)

# 后处理: INDUSTRY_FALLBACK (A+B 没分到的, 按行业大类强制赋值)
INDUSTRY_FALLBACK_TRACK = {
    '计算机、通信和其他电子设备制造业': '供应链-电子',
    '电气机械和器材制造业': '供应链-精密',
    '专用设备制造业': '供应链-精密',
    '金属制品业': '供应链-精密',
    '通用设备制造业': '供应链-精密',
    '造纸和纸制品业': '消费升级',
    '机动车、电子产品和日用产品修理业': '其他',
    '科技推广和应用服务业': '检测/认证',  # 大部分是检测/认证/技术服务
    '制造业': '供应链-精密',  # 通用制造业默认精密
}
fallback_count = 0
for c in companies:
    if not c.get('trk') and c.get('ind') in INDUSTRY_FALLBACK_TRACK:
        c['trk'] = INDUSTRY_FALLBACK_TRACK[c['ind']]
        c['confidence'] = 'low'
        c['method'] = 'ab+industry'
        c['banking_priority'] = compute_quality_score(c)
        fallback_count += 1
print(f'  INDUSTRY_FALLBACK 补全: {fallback_count} 家 (低置信度, 待人工 review)')

# Step 4: 输出
print('\n[4/4] 写 tech_v2.json + .js...')

OUT = os.path.join(DATA, 'tech_v2.json')
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(companies, f, ensure_ascii=False, allow_nan=False, separators=(',', ':'))
print(f'  → tech_v2.json: {os.path.getsize(OUT) / 1024:.1f} KB')

# JS 全局变量
with open(OUT, 'r', encoding='utf-8') as f:
    content = f.read()
with open(OUT.replace('.json', '.js'), 'w', encoding='utf-8') as f:
    f.write(f'// Auto-generated from tech_v2.json ({len(companies)} 家)\nwindow.TECH_V2 = {content};\n')

# ============================================================
# 统计
# ============================================================
print('\n' + '=' * 60)
print('✅ 导入完成 (data + js)')
print('=' * 60)

# ============================================================
# 自动健康检查 (生成后立即跑, 防止数据问题留到下次)
# ============================================================
import subprocess
health_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), '_health_check.py')
print('\n[5/5] 自动运行 _health_check.py ...')
try:
    result = subprocess.run([sys.executable, health_script], capture_output=True, text=True, timeout=60)
    print(result.stdout)
    if result.stderr:
        print('STDERR:', result.stderr)
    rc = result.returncode
    if rc == 0:
        print('✅ 数据健康 (exit 0)')
    elif rc == 1:
        print('⚠️  数据有 WARN (exit 1), 可继续但建议处理')
    else:
        print('❌ 数据有 ERROR (exit 2), 必须修')
    # 把 health check 的退出码传给外层
    sys.exit(rc)
except subprocess.TimeoutExpired:
    print('❌ health_check 超时')
    sys.exit(2)
except Exception as e:
    print(f'❌ health_check 调用失败: {e}')
    sys.exit(2)

trk_cnt = Counter([c['trk'] for c in companies if c['trk']])
linked = sum(1 for c in companies if c['rm'])
ht = sum(1 for c in companies if c['is_hightech'])
spec = sum(1 for c in companies if c['is_specialized'])
no_acc = sum(1 for c in companies if not c['has_account'])

print(f'\n总量: {len(companies)} 家')
print(f'  已挂钩法人RM: {linked} 家 ({linked * 100 / len(companies):.1f}%)')
print(f'  高新企业:     {ht} 家 ({ht * 100 / len(companies):.1f}%)')
print(f'  国家级专精特新: {spec} 家')
print(f'  未在我行开户: {no_acc} 家 ({no_acc * 100 / len(companies):.1f}%) ← 增量空间')

print(f'\n14 赛道分布:')
for t in TRACK_ORDER:
    n = trk_cnt.get(t, 0)
    pri = TRACK_PRIORITY.get(t, 'C')
    print(f'  {TRACK_EMOJI[t]} {t:12s} ({pri})  {n:5d}')

# 优质分 Top 5
top5 = sorted(companies, key=lambda c: c['banking_priority'], reverse=True)[:5]
print(f'\n优质分 Top 5:')
for i, c in enumerate(top5, 1):
    tags = []
    if c['is_specialized']: tags.append('🎖️专精特新')
    if c['is_hightech']: tags.append('🦄高新')
    if c['is_pevc']: tags.append('💰PEVC')
    if c['rm']: tags.append(f'🤝{c["rm"]}')
    print(f'  {i}. [{c["banking_priority"]:3d}] {c["name"]} ({c["trk"] or "未分类"}) {",".join(tags)[:60]}')