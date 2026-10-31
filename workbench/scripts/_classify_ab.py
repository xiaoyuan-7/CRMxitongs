#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
_classify_ab.py · A+B 关键词分类

输入:companies.json(含 biz/desc 字段)
输出:companies.json(更新 trk/sub/confidence)

A: 行业大类 → 候选赛道
B: 经营范围关键词打分 + 企业名关键词加分

置信度:
  high:   score >= 50  (行业+主营强匹配)
  medium: score 30-49  (单一信号)
  low:    score < 30   (模糊,留空)
"""

import json
import os
import re
from collections import Counter, defaultdict


WORK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(WORK, 'data')


# ============================================================
# 赛道关键词词典
# ============================================================
TRACK_KEYWORDS = {
    '软件/SaaS': {
        'core': ['软件', '信息系统', '信息技术', '系统集成', '解决方案', 'SaaS', 'ERP', 'CRM',
                '数据库', '云计算', '平台', 'APP', '数字化', '智能化', '互联网', '软件开发',
                '信息系统集成', '计算机软件', '软件研发', '软件销售', '软件服务'],
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
                '半导体设备', '半导体材料', '晶圆制造'],
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
        'support': ['电池组件', '光伏组件', '光伏发电', '风力发电', '清洁能源',
                   '氢能', '氢燃料'],
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
        'support': ['手术器械', '医用耗材', '医用电子', '医用光学', '医院设备',
                   '二类医疗器械', '三类医疗器械'],
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


# 行业大类 → 默认候选赛道
INDUSTRY_DEFAULT = {
    '信息传输、软件和信息技术服务业': ['软件/SaaS'],
    '软件和信息技术服务业': ['软件/SaaS'],
    '批发和零售业': ['供应链-电子', '消费升级'],
    '批发业': ['供应链-电子'],
    '零售业': ['消费升级'],
    '科学研究和技术服务业': ['软件/SaaS', '检测/认证', '机器人/AI'],
    '研究和试验发展': ['软件/SaaS', '机器人/AI'],
    '专业技术服务业': ['检测/认证', '软件/SaaS'],
    '制造业': None,  # 看关键词
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
}


def get_industry_default(industry_dl):
    """行业大类 → 候选赛道列表"""
    if not industry_dl:
        return []
    for k, v in INDUSTRY_DEFAULT.items():
        if k in industry_dl or industry_dl in k:
            return v or []
    return []


def score_company(c):
    """打分:返回 {track: score}"""
    scores = defaultdict(float)
    biz = c.get('biz', '') or ''
    desc = c.get('desc', '') or ''
    name = c.get('name', '') or ''
    industry_dl = c.get('ind', '') or ''
    text = (biz + ' ' + desc + ' ' + name).lower()

    # A. 行业大类默认分
    default_tracks = get_industry_default(industry_dl)
    for t in default_tracks:
        scores[t] += 30

    # B. 关键词打分
    for track, kws in TRACK_KEYWORDS.items():
        core_hits = sum(1 for kw in kws['core'] if kw in text)
        if core_hits > 0:
            scores[track] += core_hits * 8  # 每个核心词 8 分
        support_hits = sum(1 for kw in kws['support'] if kw in text)
        if support_hits > 0:
            scores[track] += support_hits * 3  # 辅助词 3 分

    return dict(scores)


def get_confidence(score):
    if score >= 50:
        return 'high'
    elif score >= 30:
        return 'medium'
    else:
        return 'low'


def get_top_n(scores, n=2):
    """返回 top N 赛道(分数差不超过 30%)"""
    if not scores:
        return []
    sorted_tracks = sorted(scores.items(), key=lambda x: -x[1])
    top = [sorted_tracks[0]]
    if len(sorted_tracks) > 1:
        second = sorted_tracks[1]
        if second[1] >= top[0][1] * 0.6 and second[1] >= 20:
            top.append(second)
    return top


# ============================================================
# 主流程
# ============================================================
print("=" * 60)
print("A+B 关键词分类")
print("=" * 60)

with open(os.path.join(DATA, 'companies.json'), 'r', encoding='utf-8') as f:
    companies = json.load(f)

print(f"\n总企业: {len(companies)}")
print(f"已分类(v9): {sum(1 for c in companies if c['trk'])}")
print(f"未分类: {sum(1 for c in companies if not c['trk'])}")

# 对未分类的跑 A+B
print("\n跑分类...")
classified_new = 0
high_conf = 0
medium_conf = 0
low_conf = 0

for c in companies:
    if c['trk']:
        # 已分类(v9),跳过
        continue
    scores = score_company(c)
    if not scores:
        c['trk'] = ''
        c['sub'] = ''
        c['confidence'] = 'low'
        c['classify_method'] = 'ab'
        low_conf += 1
        continue

    top = get_top_n(scores)
    if not top:
        c['trk'] = ''
        c['sub'] = ''
        c['confidence'] = 'low'
        c['classify_method'] = 'ab'
        low_conf += 1
        continue

    main_track, main_score = top[0]
    sub_track = top[1][0] if len(top) > 1 else ''

    c['trk'] = main_track
    c['sub'] = sub_track if sub_track != main_track else ''
    c['_ab_score'] = round(main_score, 1)
    c['confidence'] = get_confidence(main_score)
    c['classify_method'] = 'ab'

    classified_new += 1
    if c['confidence'] == 'high':
        high_conf += 1
    elif c['confidence'] == 'medium':
        medium_conf += 1
    else:
        low_conf += 1

print(f"\n新分类: {classified_new} 家")
print(f"  high:   {high_conf}")
print(f"  medium: {medium_conf}")
print(f"  low:    {low_conf}")

# 总体统计
print(f"\n总分类情况:")
print(f"  v9 已分类: {sum(1 for c in companies if c.get('classify_method') != 'ab')}")
print(f"  ab 已分类: {classified_new}")
print(f"  仍空:     {sum(1 for c in companies if not c['trk'])}")

# 按赛道统计(总)
track_total = Counter([c['trk'] for c in companies if c['trk']])
print(f"\n总赛道分布:")
for t, n in track_total.most_common():
    print(f"  {t:15s} {n:5d}")

# 写回
print(f"\n写回 companies.json...")
with open(os.path.join(DATA, 'companies.json'), 'w', encoding='utf-8') as f:
    json.dump(companies, f, ensure_ascii=False, allow_nan=False, separators=(',', ':'))

# 同步 .js
with open(os.path.join(DATA, 'companies.js'), 'w', encoding='utf-8') as f:
    f.write('// Auto-generated from companies.json\nwindow.COMPANIES = ')
    f.write(json.dumps(companies, ensure_ascii=False, allow_nan=False, separators=(',', ':')))
    f.write(';\n')

print(f"\n✅ 完成")
PYEOF