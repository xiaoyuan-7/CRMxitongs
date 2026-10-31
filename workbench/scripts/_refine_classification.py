#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
_refine_classification.py · 基于行业大类 + 主营关键词的修正分类

输入:companies.json(已有 A+B 分类)
输出:companies.json(修正后的赛道)

逻辑:
  1. 行业大类先圈定候选赛道(从 100 个国标行业大类)
  2. 主营业务关键词(分号前)在候选赛道里打分
  3. v9 分类优先(已知正确)
  4. 修复 + 保留置信度信息
"""

import json
import os
import re
from collections import Counter, defaultdict


WORK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(WORK, 'data')


# ============================================================
# 行业大类 → 候选赛道(覆盖 100 个国标大类)
# ============================================================
INDUSTRY_TRACK = {
    # 制造业
    '专用设备制造业': ['供应链-精密', '新能源/储能', '机器人/AI', '医疗器械'],
    '通用设备制造业': ['供应链-精密', '机器人/AI'],
    '电气机械和器材制造业': ['供应链-电子', '新能源/储能'],
    '计算机、通信和其他电子设备制造业': ['供应链-电子', '半导体'],
    '仪器仪表制造业': ['供应链-电子', '检测/认证'],
    '化学原料和化学制品制造业': ['化工/新材料'],
    '医药制造业': ['生物医药', '医疗器械'],
    '橡胶和塑料制品业': ['化工/新材料', '供应链-精密'],
    '非金属矿物制品业': ['化工/新材料'],
    '金属制品业': ['供应链-精密'],
    '汽车制造业': ['汽车'],
    '铁路、船舶、航空航天和其他运输设备制造业': ['汽车', '供应链-精密'],
    '纺织服装、服饰业': ['消费升级'],
    '皮革、毛皮、羽毛及其制品和制鞋业': ['消费升级'],
    '木材加工和木、竹、藤、棕、草制品业': ['供应链-精密'],
    '家具制造业': ['消费升级', '供应链-精密'],
    '造纸和纸制品业': ['供应链-精密'],
    '印刷和记录媒介复制业': ['供应链-精密', '消费升级'],
    '文教、工美、体育和娱乐用品制造业': ['消费升级'],
    '石油、煤炭及其他燃料加工业': ['化工/新材料'],
    '黑色金属冶炼和压延加工业': ['化工/新材料'],
    '有色金属冶炼和压延加工业': ['化工/新材料'],
    '金属制品、机械和设备修理业': ['供应链-精密'],
    '废弃资源综合利用业': ['化工/新材料'],
    '金属制品业': ['供应链-精密'],
    '其他制造业': ['供应链-精密'],

    # 信息/软件
    '软件和信息技术服务业': ['软件/SaaS'],
    '互联网和相关服务': ['软件/SaaS'],
    '信息传输、软件和信息技术服务业': ['软件/SaaS'],

    # 批发零售
    '批发和零售业': ['供应链-电子', '消费升级'],
    '批发业': ['供应链-电子'],
    '零售业': ['消费升级'],

    # 服务
    '科学研究和技术服务业': ['软件/SaaS', '检测/认证', '机器人/AI'],
    '研究和试验发展': ['软件/SaaS', '机器人/AI'],
    '专业技术服务业': ['检测/认证', '软件/SaaS'],
    '科技推广和应用服务业': ['软件/SaaS', '检测/认证'],

    # 能源
    '电力、热力、燃气及水生产和供应业': ['新能源/储能'],
    '水的生产和供应业': ['其他'],
    '燃气生产和供应业': ['新能源/储能'],

    # 建筑
    '建筑安装业': ['其他'],
    '建筑业': ['其他'],
    '房屋建筑业': ['其他'],
    '土木工程建筑业': ['其他'],

    # 房地产
    '房地产业': ['其他'],
    '房地产中介服务业': ['其他'],

    # 交通
    '交通运输、仓储和邮政业': ['其他'],
    '铁路运输业': ['其他'],
    '道路运输业': ['其他'],
    '水上运输业': ['其他'],
    '航空运输业': ['其他'],
    '邮政业': ['其他'],

    # 金融
    '金融业': ['软件/SaaS'],
    '货币金融服务业': ['软件/SaaS'],
    '保险业': ['软件/SaaS'],
    '其他金融业': ['软件/SaaS'],

    # 文体 + 居民
    '租赁和商务服务业': ['其他'],
    '居民服务、修理和其他服务业': ['消费升级'],
    '住宿和餐饮业': ['消费升级'],
    '餐饮业': ['消费升级'],
    '文化、体育和娱乐业': ['消费升级'],
    '新闻和出版业': ['消费升级'],
    '广播、电视、电影和影视录音制作业': ['消费升级'],
    '体育': ['消费升级'],
    '娱乐业': ['消费升级'],
    '卫生和社会工作': ['医疗器械'],
    '社会工作': ['其他'],
    '卫生': ['医疗器械'],
    '教育': ['软件/SaaS', '消费升级'],
    '水利、环境和公共设施管理业': ['其他'],
    '生态保护和环境治理业': ['其他'],
    '公共设施管理业': ['其他'],
    '土地管理业': ['其他'],
    '农、林、牧、渔业': ['其他'],
    '农业': ['其他'],
    '林业': ['其他'],
    '畜牧业': ['其他'],
    '渔业': ['其他'],
    '电力、燃气及水生产和供应业': ['新能源/储能'],
    '采矿业': ['其他'],
    '煤炭开采和洗选业': ['其他'],
    '石油和天然气开采业': ['新能源/储能'],
    '黑色金属矿采选业': ['其他'],
    '有色金属矿采选业': ['其他'],
    '非金属矿采选业': ['其他'],
    '开采专业及辅助性活动': ['其他'],
    '其他采矿业': ['其他'],
}


# 关键词词典(简化版,主营关键词)
TRACK_KEYWORDS = {
    '软件/SaaS': ['软件', '信息系统', '信息技术', '系统集成', 'SaaS', 'ERP', 'CRM', 'MES', 'APP', '小程序', '游戏', '网络安全', '数据服务', '大数据', '云计算', 'AI', '算法', '机器学习', 'PaaS', '云平台'],
    '供应链-电子': ['PCB', '连接器', '电源', '充电器', '传感器', '显示器', '触摸屏', 'LED', '蓝牙', 'Wi-Fi', '智能硬件', '电子元器件', '电容', '电阻', '光电', '电子'],
    '供应链-精密': ['模具', '机加工', 'CNC', '注塑', '五金', '紧固件', '自动化设备', '自动化', '精密', '铸件', '钣金', '金属制品'],
    '半导体': ['半导体', '集成电路', 'IC设计', '芯片', '晶圆', '封装', 'MOSFET', 'IGBT', '功率器件', '光刻', '半导体设备', '半导体材料'],
    '化工/新材料': ['化工', '化学', '材料', '涂料', '油墨', '胶粘剂', '塑料', '橡胶', '复合材料', '纳米', '精细化工', '高分子', '新材料'],
    '新能源/储能': ['新能源', '储能', '光伏', '太阳能', '风电', '动力电池', '充电桩', 'BMS', '锂电池', '电池', '氢能', '充电站', '清洁能源'],
    '检测/认证': ['检测', '认证', '测试', '检验', '测量', '校准', '实验室', 'CMA', 'CNAS', '计量', 'ISO认证'],
    '通信': ['5G', '6G', '光通信', '光纤', '通信设备', '基站', '天线', '路由器', '交换机', '通信终端', '通信'],
    '医疗器械': ['医疗器械', '医疗设备', '医用', '影像', '监护', '手术', 'IVD', '体外诊断', '诊断试剂', '医用耗材', '康复'],
    '消费升级': ['服装', '服饰', '食品', '饮料', '化妆品', '家居', '玩具', '文具', '珠宝', '首饰', '母婴', '宠物'],
    '机器人/AI': ['机器人', '机器视觉', '无人机', '智能装备', '工业机器人', '服务机器人', '伺服', '减速器', 'AGV', 'AI'],
    '生物医药': ['创新药', '仿制药', '疫苗', '抗体', '原料药', '中药', '生物制品', '生物医药', '医药'],
    '汽车': ['汽车', '整车', '汽车零部件', '底盘', '车身', '动力总成', '新能源汽车', '汽车电子'],
    '其他': [],
}


def split_main_biz(biz):
    """取主营业务(分号前)"""
    if not biz: return ''
    m = re.search(r'一般经营项目[：:](.+?)(?:\(|。|$)', biz, re.DOTALL)
    if m:
        return m.group(1).strip()
    parts = re.split(r'[;；]', biz)
    return parts[0].strip() if parts else biz


def get_industry_candidates(industry_dl):
    """行业大类 → 候选赛道"""
    if not industry_dl: return None
    for k, v in INDUSTRY_TRACK.items():
        if k in industry_dl or industry_dl in k:
            return v
    return None


def classify_with_industry(c):
    """行业大类 + 主营关键词联合判断"""
    industry_dl = c.get('ind', '')
    candidates = get_industry_candidates(industry_dl)
    if not candidates:
        return None  # 行业不明,保留原分类

    biz = c.get('biz', '')
    main_biz = split_main_biz(biz)
    text = main_biz or biz

    # 在候选赛道里打分
    scores = {}
    for track in candidates:
        if track not in TRACK_KEYWORDS:
            continue
        for kw in TRACK_KEYWORDS[track]:
            if kw in text:
                scores[track] = scores.get(track, 0) + 1

    if scores:
        return max(scores.items(), key=lambda x: x[1])[0]
    return candidates[0]  # 没关键词命中,行业大类默认


# ============================================================
# 主流程
# ============================================================
print("=" * 60)
print("基于行业大类 + 主营关键词的修正分类")
print("=" * 60)

with open(os.path.join(DATA, 'companies.json'), 'r') as f:
    companies = json.load(f)

print(f"\n总企业: {len(companies)}")

# 分类统计
v9_only = sum(1 for c in companies if c.get('method') in ('v9', 'v9_name'))
ab_only = sum(1 for c in companies if c.get('method') == 'ab')
abp = sum(1 for c in companies if c.get('method') == 'ab+patent')
print(f"  v9: {v9_only} | A+B: {ab_only} | A+B+专利: {abp}")

# 修复
fixed = 0
unchanged = 0
empty = 0
samples = []

for c in companies:
    if c.get('method') in ('v9', 'v9_name'):
        # v9 分类已知正确,跳过
        continue
    if c.get('method') == 'ab+patent':
        # 专利反查的也跳过(已经纠正)
        continue

    old_trk = c.get('trk', '')
    new_trk = classify_with_industry(c)
    if new_trk is None:
        empty += 1
        continue
    if new_trk != old_trk:
        # 修正
        c['_original_track'] = old_trk
        c['trk'] = new_trk
        c['confidence'] = 'medium'  # 修正后置信度降
        c['method'] = 'ab+industry'
        fixed += 1
        if len(samples) < 10:
            samples.append((c['name'][:25], old_trk, new_trk, c.get('ind', '')))
    else:
        unchanged += 1

print(f"\n修复结果:")
print(f"  修复: {fixed}")
print(f"  不变: {unchanged}")
print(f"  类别不明: {empty}")

print(f"\n修正案例前 10:")
for name, old, new, ind in samples:
    print(f"  {name:25s} | {old:12s} → {new:12s} | {ind}")

# 写回
print(f"\n写回 companies.json...")
s = json.dumps(companies, ensure_ascii=False, allow_nan=False, separators=(',', ':'))
with open(os.path.join(DATA, 'companies.json'), 'w', encoding='utf-8') as f:
    f.write(s)
with open(os.path.join(DATA, 'companies.js'), 'w', encoding='utf-8') as f:
    f.write('// Auto-generated from companies.json\nwindow.COMPANIES = ')
    f.write(s)
    f.write(';\n')

# 重新聚合 aggregates
with open(os.path.join(DATA, 'aggregates.json'), 'r') as f:
    agg = json.load(f)

agg['classified_v9'] = sum(1 for c in companies if c.get('method') in ('v9', 'v9_name'))
agg['classified_ab'] = sum(1 for c in companies if c.get('method') == 'ab')
agg['classified_ab_patent'] = sum(1 for c in companies if c.get('method') == 'ab+patent')
agg['classified_ab_industry'] = sum(1 for c in companies if c.get('method') == 'ab+industry')
agg['classified'] = sum(1 for c in companies if c.get('trk'))
agg['unclassified'] = sum(1 for c in companies if not c.get('trk'))

# 赛道统计
classified_cnt = Counter([c['trk'] for c in companies if c.get('trk')])
for track in agg['tracks']:
    track['classified_count'] = classified_cnt.get(track['name'], 0)

agg_str = json.dumps(agg, ensure_ascii=False, allow_nan=False, separators=(',', ':'))
with open(os.path.join(DATA, 'aggregates.json'), 'w', encoding='utf-8') as f:
    f.write(agg_str)
with open(os.path.join(DATA, 'aggregates.js'), 'w', encoding='utf-8') as f:
    f.write('// Auto-generated from aggregates.json\nwindow.AGGREGATES = ')
    f.write(agg_str)
    f.write(';\n')

# 验证
target = next((c for c in companies if '时代天源' in c.get('name', '')), None)
print(f"\n=== 验证时代天源 ===")
print(f"name: {target['name']}")
print(f"trk: {target['trk']} (原: {target.get('_original_track', '')})")
print(f"sub: {target.get('sub_track', '')}")
print(f"method: {target['method']}")
print(f"confidence: {target['confidence']}")

print(f"\n✅ 完成!修正了 {fixed} 家明显错误")
PYEOF