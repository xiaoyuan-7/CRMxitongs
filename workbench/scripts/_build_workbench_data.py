#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
_build_workbench_data.py · 对公拓客工作台数据生成(整合版)

输入:
  /mnt/c/Users/Administrator/Desktop/名单/合并结果/企业主表_全量.csv      (22,777 家,UTF-8!)
  /mnt/c/Users/Administrator/Desktop/industry-research/名单/_full_classification_v9_5971家.csv  (v9 已分类,UTF-8 BOM)
  /mnt/c/Users/Administrator/Desktop/名单/合并结果/拓客候选Top500_中等规模.csv  (UTF-8)
  /mnt/c/Users/Administrator/Desktop/名单/合并结果/跨名单比对_三圈重叠_高质量线索.csv  (UTF-8)

输出:
  workbench/data/companies.json       22,765 家(瘦 + biz/desc + track_top/sub/confidence)
  workbench/data/aggregates.json      14 赛道统计
  workbench/data/overlap_28.json      三圈重叠 28 家
  workbench/data/top50_classified.json    已分类 Top 50
  workbench/data/top500_unclassified.json  未分类 Top 500
  workbench/data/_fields.json         字段映射

跑法:
  cd /mnt/c/Users/Administrator/Desktop/industry-research/workbench
  python3 scripts/_build_workbench_data.py

关键编码修复:
  - 主表是 UTF-8 编码(不是 GBK!)
  - v9 是 UTF-8 with BOM(用 utf-8-sig)

之前用 gb18030 读主表 → mojibake,字段值都错了
之前用 utf-8 读 v9 → 字段名前带 BOM → DictReader 取不到
"""

import csv
import json
import os
import re
from collections import Counter, defaultdict


WORK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(WORK, 'data')
os.makedirs(DATA, exist_ok=True)


# ============================================================
# 字段位置(主表)
# ============================================================
COL = {
    'name': 1, 'status': 2, 'code': 3, 'legal': 4, 'est_date': 5,
    'reg_cap': 7, 'paid_cap': 8, 'phone': 10,
    'city': 12, 'district': 13, 'addr': 14,
    'email': 16, 'industry_dl': 25, 'industry_zl': 26,
    'scale': 30, 'biz': 32, 'desc': 33,
    'risk': 40, 'source': 41,
}

# 输出字段映射
FIELD_MAP = {
    'code': '统一代码', 'name': '企业名称', 'status': '登记状态',
    'legal': '法定代表人', 'est': '成立日期',
    'rc': '注册资本(万)', 'pc': '实缴资本(万)',
    'city': '城市', 'dist': '区县', 'addr': '注册地址',
    'phone': '电话', 'email': '邮箱', 'ind': '行业大类',
    'scale': '企业规模', 'risk': '风险标签', 'src': '来源',
    'trk': '主营赛道', 'sub': '副赛道', 'sci': '科创分',
    'pat': '专利总数', 'biz': '经营范围', 'desc': '企业简介',
}

RENAMED = {
    'code': 'code', 'name': 'name', 'status': 'status',
    'legal': 'legal', 'est_date': 'est',
    'reg_cap_wan': 'rc', 'paid_cap_wan': 'pc',
    'city': 'city', 'district': 'dist', 'addr': 'addr',
    'phone': 'phone', 'email': 'email', 'industry_dl': 'ind',
    'scale': 'scale', 'risk': 'risk', 'source': 'src',
    'track_top': 'trk', 'track_sub': 'sub',
    'innovation_score': 'sci', 'patent_total': 'pat',
    'biz': 'biz', 'desc': 'desc',
}

TRACK_EMOJI = {
    '软件/SaaS': '💻', '供应链-电子': '🔌', '供应链-精密': '⚙️',
    '半导体': '🔬', '化工/新材料': '🧪', '新能源/储能': '🔋',
    '检测/认证': '🔍', '通信': '📡', '医疗器械': '🏥',
    '消费升级': '🛍️', '机器人/AI': '🤖', '汽车': '🚗',
    '印刷包装': '🖨️', '生物医药': '💊', '其他': '📦',
}
# 15 赛道 (2026-09-13 +'印刷包装', 8/31 v8 营销一页通已硬塞了 220 家 trk='印刷包装')
TRACK_ORDER = ['软件/SaaS', '供应链-电子', '供应链-精密', '半导体', '化工/新材料',
               '新能源/储能', '检测/认证', '通信', '医疗器械', '消费升级',
               '机器人/AI', '汽车', '印刷包装', '生物医药', '其他']


# ============================================================
# 工具函数
# ============================================================
def clean(s):
    if not s:
        return ''
    s = s.strip()
    if s in ('-', '—', 'null', 'NULL', 'None'):
        return ''
    return s


def parse_wan(s):
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
        if '万' in s or v < 100000:
            return v
        return v / 10000
    except Exception:
        return None


def safe_float(v, default=None):
    try:
        s = str(v).strip()
        if not s or s in ('-', '—'):
            return default
        m = re.search(r'[\d.]+', s)
        return float(m.group()) if m else default
    except Exception:
        return default


def safe_int(v, default=None):
    try:
        s = str(v).strip()
        if not s or s in ('-', '—'):
            return default
        m = re.search(r'\d+', s)
        return int(m.group()) if m else default
    except Exception:
        return default


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
    for p in re.split(r'[;,]', s):
        p = p.strip()
        if '@' in p:
            return p
    return ''


def score_company(c):
    """中等规模拓客打分:注册资本 20% + 参保 20% + 科创 25% + 专利 20% + 关系 15%"""
    score = 0
    rc = c.get('rc') or 0
    if 1000 <= rc <= 50000:
        score += 100 * 0.20
    elif 50000 < rc <= 100000:
        score += 80 * 0.20
    elif rc > 100000:
        score += 50 * 0.20
    else:
        score += 30 * 0.20

    score += 50 * 0.20

    ks = safe_float(c.get('sci')) or 0
    if 70 <= ks <= 95:
        score += 100 * 0.25
    elif ks >= 95:
        score += 80 * 0.25
    elif ks >= 50:
        score += 60 * 0.25
    else:
        score += 20 * 0.25

    pt = safe_int(c.get('pat')) or 0
    if 5 <= pt <= 100:
        score += 100 * 0.20
    elif pt > 100:
        score += 80 * 0.20
    else:
        score += 30 * 0.20

    score += 50 * 0.15
    return score


# ============================================================
# A+B 关键词分类
# ============================================================
TRACK_KEYWORDS = {
    '软件/SaaS': {
        'core': ['软件', '信息系统', '信息技术', '系统集成', '解决方案', 'SaaS', 'ERP', 'CRM',
                '数据库', '云计算', '平台', 'APP', '数字化', '智能化', '互联网', '软件开发',
                '计算机软件', '软件研发', '软件销售', '软件服务'],
        'support': ['小程序', '公众号', 'API', '接口', '中台', '大数据', '数据处理', '网络安全',
                   '信息安全', '运维', '数据服务', '云服务'],
    },
    '供应链-电子': {
        'core': ['电子', '电路板', 'PCB', '连接器', '电容', '电阻', '传感器', '显示器',
                '电源', '充电器', '适配器', '蓝牙', 'Wi-Fi', 'USB', 'HDMI', '电子元器件',
                '电子产品', '电子配件', '电子组件', '光电', '光电子'],
        'support': ['半导体照明', 'LED', '液晶', '触摸屏', '音响', '耳机', '智能音箱',
                   '音频', '视频设备'],
    },
    '供应链-精密': {
        'core': ['精密', '模具', '五金', '机加工', '注塑', '压铸', '零部件', '轴承',
                '齿轮', '紧固件', '金属制品', '机械加工', 'CNC', '冲压', '钣金',
                '精密机械', '精密零件', '塑胶制品', '塑料制品', '橡胶制品'],
        'support': ['自动化设备', '工业自动化', '机械配件', '配件加工', '非标自动化'],
    },
    '半导体': {
        'core': ['半导体', '集成电路', 'IC设计', '芯片设计', '晶圆', '封装', '测试',
                '光刻', 'MOSFET', '芯片', '集成电路设计', '半导体器件', '集成电路制造',
                '半导体设备', '半导体材料'],
        'support': ['专用集成电路', 'ASIC', 'FPGA', '分立器件', 'IGBT', '功率器件'],
    },
    '化工/新材料': {
        'core': ['化工', '化学', '材料', '涂料', '油墨', '胶水', '塑料', '橡胶',
                '纤维', '复合材料', '纳米', '助剂', '化工产品', '化工原料',
                '化学原料', '新材料', '精细化工', '高分子'],
        'support': ['胶粘剂', '树脂', '颜料', '染料', '催化剂', '表面处理', '电镀'],
    },
    '新能源/储能': {
        'core': ['新能源', '储能', '光伏', '太阳能', '风能', '动力电池', '充电桩',
                'BMS', '逆变器', '电池', '锂电', '锂电池', '充电站', '充电',
                '新能源车', '新能源汽车', '太阳能电池', '风电'],
        'support': ['电池组件', '光伏组件', '光伏发电', '风力发电', '清洁能源', '氢能'],
    },
    '检测/认证': {
        'core': ['检测', '认证', '测试', '检验', '计量', '校准', '实验室', 'CMA',
                'CNAS', '检测服务', '认证服务', '质量检测', '环境检测',
                '检测认证', '第三方检测', '检测技术'],
        'support': ['食品检测', '水质检测', '空气质量检测', 'RoHS', 'CE认证'],
    },
    '通信': {
        'core': ['通信', '5G', '6G', '光通信', '射频', '天线', '基站', '交换机',
                '路由器', '通信设备', '通信技术', '通讯设备', '光纤', '光模块',
                '光器件', '通信系统', '网络通信'],
        'support': ['通信服务', '电信', '网络设备', '传输设备', '微波'],
    },
    '医疗器械': {
        'core': ['医疗器械', '医疗设备', '医用', '诊断试剂', '影像设备', '监护仪',
                'IVD', '体外诊断', '医疗器械生产', '医疗仪器', '医疗耗材',
                '医学影像', '生化分析', '血液分析', '康复设备'],
        'support': ['手术器械', '医用耗材', '医用电子', '医用光学', '医院设备'],
    },
    '消费升级': {
        'core': ['服装', '服饰', '食品', '饮料', '化妆品', '日用品', '家居', '玩具',
                '文具', '礼品', '茶', '鞋', '帽', '箱包', '钟表', '眼镜',
                '金银首饰', '珠宝', '皮具'],
        'support': ['母婴用品', '宠物用品', '户外用品', '健身器材', '厨具',
                   '床上用品', '纺织品', '工艺品'],
    },
    '机器人/AI': {
        'core': ['机器人', '人工智能', '机器视觉', '智能', '无人', 'AGV', '无人机',
                '伺服', '减速器', 'AI', '深度学习', '算法', '智能装备',
                '智能制造', '智能设备', '智能机器人', '工业机器人'],
        'support': ['自动化', '无人化', '机器学习', '图像识别', '语音识别', '自动驾驶'],
    },
    '汽车': {
        'core': ['汽车', '整车', '动力总成', '底盘', '车身', '汽车零部件',
                '汽车配件', '汽车制造', '新能源汽车', '商用车', '乘用车',
                '汽车电子', '汽车用品'],
        'support': ['车载', '车联网', '汽车后市场', '轮胎', '发动机'],
    },
    '生物医药': {
        'core': ['生物医药', '药品', '原料药', '制剂', '生物制品', '疫苗', '抗体',
                '基因', '细胞', '蛋白', '医药', '制药', '生物制药', '化学药',
                '生物药', '创新药', '仿制药', '中药', '中成药'],
        'support': ['药品研发', '医药研发', 'CRO', 'CMO', 'CDMO', '医药中间体'],
    },
}

INDUSTRY_DEFAULT = {
    '信息传输、软件和信息技术服务业': ['软件/SaaS'],
    '软件和信息技术服务业': ['软件/SaaS'],
    '批发和零售业': ['供应链-电子', '消费升级'],
    '批发业': ['供应链-电子'],
    '零售业': ['消费升级'],
    '科学研究和技术服务业': ['软件/SaaS', '检测/认证', '机器人/AI'],
    '研究和试验发展': ['软件/SaaS', '机器人/AI'],
    '专业技术服务业': ['检测/认证', '软件/SaaS'],
    '电力、热力、燃气及水生产和供应业': ['新能源/储能'],
    '建筑业': ['其他'],
    '交通运输、仓储和邮政业': ['其他'],
    '水利、环境和公共设施管理业': ['其他'],
    '房地产业': ['其他'],
    '租赁和商务服务业': ['其他'],
    '居民服务、修理和其他服务业': ['消费升级'],
    '文化、体育和娱乐业': ['消费升级'],
    '金融业': ['软件/SaaS'],
    '农、林、牧、渔业': ['其他'],
    '制造业': None,  # 看关键词
}


def get_industry_default(industry_dl):
    if not industry_dl:
        return []
    for k, v in INDUSTRY_DEFAULT.items():
        if k in industry_dl or industry_dl in k:
            return v or []
    return []


def classify_ab(c):
    """A+B 分类:返回 (track_top, track_sub, score, confidence)"""
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


# ============================================================
# 主流程
# ============================================================
print("=" * 60)
print("对公拓客工作台 · 数据生成(整合版)")
print("=" * 60)

# 1. 加载 v9(UTF-8 with BOM)
print("\n[1/6] 加载 v9 分类(utf-8-sig)...")
v9 = {}
v9_by_name = {}
v9_path = '/mnt/c/Users/Administrator/Desktop/industry-research/名单/_full_classification_v9_5971家.csv'
with open(v9_path, 'r', encoding='utf-8-sig', errors='replace') as f:
    r = csv.DictReader(f)
    for row in r:
        code = (row.get('统一社会信用代码') or '').strip()
        name = (row.get('企业名称') or '').strip()
        if not code:
            continue
        v9[code] = {
            'track_top': (row.get('主营赛道') or '').strip(),
            'track_sub': (row.get('副赛道') or '').strip(),
            'innovation_score': (row.get('科创分') or '').strip(),
            'innovation_lv': (row.get('科创等级') or '').strip(),
            'patent_total': (row.get('专利总数') or '').strip(),
        }
        if name:
            v9_by_name[name] = code
print(f"  v9 加载: {len(v9)} 家")

# 2. 加载主表(UTF-8!)
print("\n[2/6] 加载主表(utf-8)+ join v9...")
companies = []
master_path = '/mnt/c/Users/Administrator/Desktop/名单/合并结果/企业主表_全量.csv'
with open(master_path, 'r', encoding='utf-8', errors='replace') as f:
    f.readline(); f.readline(); f.readline()
    r = csv.reader(f)
    next(r)
    for row in r:
        if len(row) < 34:
            continue
        code = clean(row[COL['code']])
        name = clean(row[COL['name']])
        if not code or not name:
            continue

        track_top = ''
        track_sub = ''
        innovation_score = ''
        patent_total = ''
        method = ''
        if code in v9:
            t = v9[code]
            track_top = t['track_top']
            track_sub = t['track_sub']
            innovation_score = t['innovation_score']
            patent_total = t['patent_total']
            method = 'v9'
        elif name in v9_by_name:
            code = v9_by_name[name]
            t = v9[code]
            track_top = t['track_top']
            track_sub = t['track_sub']
            innovation_score = t['innovation_score']
            patent_total = t['patent_total']
            method = 'v9_name'

        rec = {
            'code': code, 'name': name,
            'status': clean(row[COL['status']]),
            'legal': clean(row[COL['legal']]),
            'est_date': clean(row[COL['est_date']]),
            'reg_cap_wan': parse_wan(row[COL['reg_cap']]),
            'paid_cap_wan': parse_wan(row[COL['paid_cap']]),
            'city': clean(row[COL['city']]),
            'district': clean(row[COL['district']]),
            'addr': short(row[COL['addr']], 80),
            'phone': short(row[COL['phone']], 80),
            'email': first_email(row[COL['email']]),
            'industry_dl': clean(row[COL['industry_dl']]),
            'industry_zl': clean(row[COL['industry_zl']]),
            'scale': clean(row[COL['scale']]),
            'biz': short(row[COL['biz']], 200),
            'desc': short(row[COL['desc']], 150),
            'risk': clean(row[COL['risk']]),
            'source': clean(row[COL['source']]),
            'track_top': track_top,
            'track_sub': track_sub,
            'innovation_score': innovation_score,
            'patent_total': patent_total,
            'classify_method': method,
        }
        companies.append(rec)
print(f"  主表加载: {len(companies)} 家")
v9_join = sum(1 for c in companies if c['classify_method'] in ('v9', 'v9_name'))
print(f"  v9 JOIN 成功: {v9_join} 家(预期 ~5,971)")

# 3. 对未分类的跑 A+B
print("\n[3/6] 对未分类跑 A+B 关键词分类...")
ab_new = 0
ab_high = 0
ab_medium = 0
ab_low = 0
ab_empty = 0

for c in companies:
    if c['classify_method']:  # 已有分类
        c['_ab_score'] = 0
        continue

    track, sub, score, conf = classify_ab(c)
    c['track_top'] = track
    c['track_sub'] = sub if sub != track else ''
    c['_ab_score'] = score
    c['confidence'] = conf
    c['classify_method'] = 'ab'
    ab_new += 1
    if conf == 'high':
        ab_high += 1
    elif conf == 'medium':
        ab_medium += 1
    elif track:
        ab_low += 1
    else:
        ab_empty += 1

print(f"  A+B 新分类: {ab_new} 家")
print(f"    high:   {ab_high}")
print(f"    medium: {ab_medium}")
print(f"    low:    {ab_low}(有赛道但置信度低)")
print(f"    empty:  {ab_empty}(空)")

# 4. 写 companies.json(瘦字段 + biz/desc)
print("\n[4/6] 写 companies.json...")
companies_slim = []
for c in companies:
    rec = {}
    for old, new in RENAMED.items():
        v = c.get(old)
        if v == '' or v == '-':
            v = None
        rec[new] = v
    rec['confidence'] = c.get('confidence', '')
    rec['method'] = c.get('classify_method', '')
    companies_slim.append(rec)

with open(os.path.join(DATA, 'companies.json'), 'w', encoding='utf-8') as f:
    json.dump(companies_slim, f, ensure_ascii=False, allow_nan=False, separators=(',', ':'))
size_mb = os.path.getsize(os.path.join(DATA, 'companies.json')) / 1024 / 1024
print(f"  → companies.json: {size_mb:.1f} MB")

# 5. 写 aggregates.json
print("\n[5/6] 写 aggregates.json...")
classified_cnt = Counter([c['track_top'] for c in companies if c['track_top']])
track_list = []
for t in TRACK_ORDER:
    track_list.append({
        'name': t,
        'classified_count': classified_cnt.get(t, 0),
        'emoji': TRACK_EMOJI.get(t, '📦'),
        'method_a': 'v9' if any(c['classify_method'] in ('v9', 'v9_name') and c['track_top'] == t for c in companies) else 'ab',
    })

industry_dl_counts = Counter([c['industry_dl'] for c in companies if c['industry_dl']])
district_counts = Counter([c['district'] for c in companies if c['district']])
city_counts = Counter([c['city'] for c in companies if c['city']])
scale_counts = Counter([c['scale'] for c in companies if c['scale']])
status_counts = Counter([c['status'] for c in companies if c['status']])

# 置信度统计
ab_only = [c for c in companies if c['classify_method'] == 'ab']
conf_counts = Counter([c.get('confidence', 'low') for c in ab_only])

aggregates = {
    'total': len(companies),
    'classified_v9': v9_join,
    'classified_ab': ab_new,
    'classified': sum(1 for c in companies if c['track_top']),
    'unclassified': sum(1 for c in companies if not c['track_top']),
    'with_phone': sum(1 for c in companies if c['phone']),
    'with_email': sum(1 for c in companies if c['email']),
    'with_biz': sum(1 for c in companies if c['biz']),
    'with_desc': sum(1 for c in companies if c['desc']),
    'confidence': dict(conf_counts),
    'tracks': track_list,
    'industries_dl': [{'name': k, 'count': v} for k, v in industry_dl_counts.most_common(30)],
    'cities': [{'name': k, 'count': v} for k, v in city_counts.most_common(20)],
    'districts': [{'name': k, 'count': v} for k, v in district_counts.most_common(30)],
    'scales': [{'name': k, 'count': v} for k, v in scale_counts.most_common()],
    'statuses': [{'name': k, 'count': v} for k, v in status_counts.most_common()],
    'data_date': '2026-08-16',
    'v9_date': '2026-08-03',
    'ab_date': '2026-08-16',
}

with open(os.path.join(DATA, 'aggregates.json'), 'w', encoding='utf-8') as f:
    json.dump(aggregates, f, ensure_ascii=False, allow_nan=False, separators=(',', ':'))
print(f"  → aggregates.json: {os.path.getsize(os.path.join(DATA, 'aggregates.json')) / 1024:.1f} KB")

# 6. Top 50 / Top 500 / Overlap 28
print("\n[6/6] 写 Top 50/500/Overlap...")

for c in companies_slim:
    if c['trk']:
        c['_拓客分'] = score_company(c) * 0.7
    else:
        c['_拓客分'] = score_company(c)

# Top 50 已分类
top50 = sorted([c for c in companies_slim if c['trk']], key=lambda x: x['_拓客分'], reverse=True)[:50]
top50_list = [{
    'rank': i + 1, 'code': c['code'], 'name': c['name'],
    'trk': c['trk'], 'score': round(c['_拓客分'], 1),
    'dist': c['dist'], 'rc': c['rc'], 'sci': c['sci'], 'phone': c['phone'],
    'method': c.get('method', '')
} for i, c in enumerate(top50)]
with open(os.path.join(DATA, 'top50_classified.json'), 'w', encoding='utf-8') as f:
    json.dump(top50_list, f, ensure_ascii=False, allow_nan=False, separators=(',', ':'))

# Top 500 未分类(剩下未分类的)
top500 = sorted([c for c in companies_slim if not c['trk']], key=lambda x: x['_拓客分'], reverse=True)[:500]
top500_list = [{
    'rank': i + 1, 'code': c['code'], 'name': c['name'],
    'ind': c['ind'], 'dist': c['dist'], 'city': c['city'],
    'rc': c['rc'], 'score': round(c['_拓客分'], 1),
    'phone': c['phone']
} for i, c in enumerate(top500)]
with open(os.path.join(DATA, 'top500_unclassified.json'), 'w', encoding='utf-8') as f:
    json.dump(top500_list, f, ensure_ascii=False, allow_nan=False, separators=(',', ':'))

# 三圈重叠(去重)
overlap = []
overlap_seen = set()  # 去重(避免同一家出现多次)
by_name = {c['name']: c for c in companies}
overlap_path = '/mnt/c/Users/Administrator/Desktop/名单/合并结果/跨名单比对_三圈重叠_高质量线索.csv'
with open(overlap_path, 'r', encoding='utf-8', errors='replace') as f:
    f.readline(); f.readline(); f.readline()
    r = csv.reader(f)
    next(r)
    for row in r:
        if not row or len(row) < 3:
            continue
        name = row[0].strip()
        if not name or len(name) < 3 or name in overlap_seen:
            continue
        overlap_seen.add(name)
        m = by_name.get(name)
        overlap.append({
            'rank': len(overlap) + 1, 'name': name,
            'dist': row[1].strip() if len(row) > 1 else '',
            'ind': row[2].strip() if len(row) > 2 else '',
            'rc': safe_float(row[3]) if len(row) > 3 else None,
            'emp': safe_int(row[4]) if len(row) > 4 else None,
            'region': row[5].strip() if len(row) > 5 else '',
            'scale': row[6].strip() if len(row) > 6 else '',
            'sci': safe_float(row[7]) if len(row) > 7 else None,
            'pat': safe_int(row[8]) if len(row) > 8 else None,
            'est': row[9].strip() if len(row) > 9 else '',
            'src': row[10].strip() if len(row) > 10 else '',
            'product': row[11].strip() if len(row) > 11 else '',
            'trk': m['track_top'] if m else '',
            'phone': m['phone'] if m else '',
            'code': m['code'] if m else '',
        })
with open(os.path.join(DATA, 'overlap_28.json'), 'w', encoding='utf-8') as f:
    json.dump(overlap, f, ensure_ascii=False, allow_nan=False, separators=(',', ':'))

# _fields.json
with open(os.path.join(DATA, '_fields.json'), 'w', encoding='utf-8') as f:
    json.dump(FIELD_MAP, f, ensure_ascii=False, indent=2)

# ============================================================
# 转 .js(挂全局)
# ============================================================
print("\n[bonus] 生成 .js 全局变量...")
mapping = {
    'aggregates.json': 'AGGREGATES',
    'companies.json': 'COMPANIES',
    'overlap_28.json': 'OVERLAP_28',
    'top50_classified.json': 'TOP50_CLASSIFIED',
    'top500_unclassified.json': 'TOP500_UNCLASSIFIED',
    '_fields.json': '_FIELDS',
}
for fname, var in mapping.items():
    json_path = os.path.join(DATA, fname)
    js_path = os.path.join(DATA, fname.replace('.json', '.js'))
    with open(json_path, 'r', encoding='utf-8') as f:
        content = f.read()
    with open(js_path, 'w', encoding='utf-8') as f:
        f.write(f'// Auto-generated from {fname}\nwindow.{var} = {content};\n')

# ============================================================
# 总结
# ============================================================
print("\n" + "=" * 60)
print("✅ 数据生成完毕")
print("=" * 60)
print(f"\n总企业: {len(companies)}")
print(f"  v9 已分类: {v9_join}")
print(f"  A+B 新分类: {ab_new}")
print(f"    high: {ab_high}  medium: {ab_medium}  low: {ab_low}  empty: {ab_empty}")
print(f"  总分类: {sum(1 for c in companies if c['track_top'])}")
print(f"  仍空: {sum(1 for c in companies if not c['track_top'])}")

print(f"\n赛道分布:")
for t in TRACK_ORDER:
    n = classified_cnt.get(t, 0)
    print(f"  {TRACK_EMOJI[t]} {t:15s} {n:5d}")

print()
for fname in sorted(os.listdir(DATA)):
    fpath = os.path.join(DATA, fname)
    size = os.path.getsize(fpath)
    if size > 1024 * 1024:
        print(f"  {fname}: {size / 1024 / 1024:.2f} MB")
    else:
        print(f"  {fname}: {size / 1024:.1f} KB")