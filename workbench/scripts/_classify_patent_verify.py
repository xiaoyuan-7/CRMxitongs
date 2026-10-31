#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
_classify_patent_verify.py · 专利反查验证

输入:
  companies.json(含 confidence='low' 的需要反查)
  专利主表_全量.csv(79.5 万条)

逻辑:
  - 对 low 置信度企业,join 它的所有专利
  - 用专利名称关键词投票
  - 票数最多的赛道覆盖原分类
  - 高票 → 升为 medium,极低票 → 保持 low

输出:
  companies.json(更新 confidence + track_top)
"""

import csv
import json
import os
import re
from collections import Counter, defaultdict


WORK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(WORK, 'data')


# 赛道关键词(用在专利名上,跟 A+B 同源但权重不同)
PATENT_TRACK_KEYWORDS = {
    '软件/SaaS': ['软件', '算法', '数据处理', '信息系统', '管理系统', '平台', '云计算', 'SaaS',
                '人工智能', '机器学习', '深度学习', '神经网络', '图像识别', '语音识别',
                '智能识别', '智能控制', '智能管理', '数据挖掘', '数据采集', '数据分析'],
    '供应链-电子': ['电路', 'PCB', '连接器', '电容', '电阻', '传感器', '显示器', '电源',
                  '充电器', '适配器', '蓝牙', 'Wi-Fi', 'USB', 'HDMI', '电子元件',
                  '电子组件', 'LED', '液晶', '触摸屏', '音频', '视频设备',
                  '信号处理', '信号转换', '信号传输'],
    '供应链-精密': ['精密', '模具', '五金', '机加工', '注塑', '压铸', '零部件', '轴承',
                  '齿轮', '紧固件', '金属制品', '机械加工', 'CNC', '冲压', '钣金',
                  '机械结构', '机械装置', '机械配件', '工业自动化', '自动化设备',
                  '传动', '液压', '气动'],
    '半导体': ['半导体', '集成电路', 'IC', '芯片', '晶圆', '封装', '光刻', 'MOSFET',
              '分立器件', 'IGBT', '功率器件', 'ASIC', 'FPGA'],
    '化工/新材料': ['化工', '化学', '材料', '涂料', '油墨', '胶水', '胶粘剂', '塑料',
                  '橡胶', '纤维', '复合材料', '纳米', '助剂', '树脂', '颜料', '染料',
                  '催化剂', '表面处理', '电镀', '高分子', '聚合'],
    '新能源/储能': ['电池', '锂电池', '锂电', '动力电池', '储能', '光伏', '太阳能',
                  '充电', '充电桩', 'BMS', '逆变器', '风电', '氢能', '清洁能源',
                  '电池模组', '电池包', '太阳能电池'],
    '检测/认证': ['检测', '测试', '检验', '测量', '计量', '校准', '诊断', '监测',
                '监控', '探测器', '传感器检测'],
    '通信': ['通信', '5G', '6G', '光通信', '射频', '天线', '基站', '交换机', '路由器',
            '光纤', '光模块', '光器件', '微波', '网络传输', '数据传输', '信号传输'],
    '医疗器械': ['医疗器械', '医疗', '医用', '诊断试剂', '影像', '监护', 'IVD',
                '体外诊断', '生化分析', '血液分析', '康复', '手术', '医用耗材',
                '医用设备', '医院'],
    '消费升级': ['服装', '服饰', '玩具', '文具', '礼品', '包装', '家居', '厨具',
                '床上用品', '纺织品', '工艺品', '装饰', '收纳'],
    '机器人/AI': ['机器人', '机器视觉', '无人', 'AGV', '无人机', '伺服', '减速器',
                '智能', '智能装备', '智能制造', '智能设备', '自动驾驶', '图像处理',
                '语音处理', '模式识别'],
    '汽车': ['汽车', '整车', '动力总成', '底盘', '车身', '车架', '车轮', '车桥',
            '汽车零部件', '汽车配件', '车载', '车联网', '发动机', '变速箱'],
    '生物医药': ['医药', '药品', '制药', '原料药', '制剂', '生物制品', '疫苗', '抗体',
                '基因', '细胞', '蛋白', '中药', '中成药', '药物', '药剂', '药理',
                '临床', '制药设备', '生物制药'],
}


def patent_classify(patent_names):
    """对企业的所有专利名做关键词投票"""
    text = ' '.join(patent_names)
    scores = Counter()
    for track, kws in PATENT_TRACK_KEYWORDS.items():
        hits = sum(1 for kw in kws if kw in text)
        if hits > 0:
            scores[track] += hits
    return dict(scores)


# ============================================================
# 主流程
# ============================================================
print("=" * 60)
print("专利反查验证")
print("=" * 60)

# 1. 加载 companies.json
print("\n[1/4] 加载 companies.json...")
with open(os.path.join(DATA, 'companies.json'), 'r', encoding='utf-8') as f:
    companies = json.load(f)

# 找 low 置信度(需要反查的)
low_conf_codes = set()
for c in companies:
    if c.get('confidence') == 'low' or (c.get('trk') and c.get('method') == 'ab' and c.get('confidence') == 'low'):
        low_conf_codes.add(c['code'])

print(f"  low 置信度待反查: {len(low_conf_codes)} 家")

# 2. 加载专利主表(按企业名聚合)
print("\n[2/4] 加载专利主表(按企业名聚合)...")
patents_by_name = defaultdict(list)
patent_path = '/mnt/c/Users/Administrator/Desktop/名单/合并结果/专利主表_全量.csv'
with open(patent_path, 'r', encoding='utf-8-sig', errors='replace') as f:
    r = csv.DictReader(f)
    cnt = 0
    for row in r:
        name = (row.get('企业名称') or '').strip()
        pname = (row.get('专利名称') or '').strip()
        if name and pname:
            patents_by_name[name].append(pname)
            cnt += 1
print(f"  专利总数: {cnt:,}")
print(f"  涉及企业: {len(patents_by_name):,}")

# 3. 按企业名 join(主表 name → 专利)
print("\n[3/4] 反查 low 置信度企业...")
name_to_code = {c['name']: c['code'] for c in companies}
code_to_patents = defaultdict(list)
matched = 0
for name, patents in patents_by_name.items():
    code = name_to_code.get(name)
    if code and code in low_conf_codes:
        code_to_patents[code] = patents
        matched += 1
print(f"  low 中匹配到专利的: {matched}/{len(low_conf_codes)} 家")

# 4. 投票纠正
print("\n[4/4] 投票纠正...")
updated = 0
unchanged = 0
new_classified = 0  # 原本为空,现在有赛道了

for c in companies:
    code = c['code']
    patents = code_to_patents.get(code)
    if not patents:
        unchanged += 1
        continue

    scores = patent_classify(patents)
    if not scores:
        unchanged += 1
        continue

    sorted_scores = sorted(scores.items(), key=lambda x: -x[1])
    top_track, top_votes = sorted_scores[0]

    # 如果专利投票 > 3 票,信心十足 → 升 medium
    # 如果原 confidence 是 low 且无赛道 → 设为 medium
    if not c.get('trk'):
        # 原本空,现在用专利定的
        c['trk'] = top_track
        c['confidence'] = 'medium'
        c['method'] = 'ab+patent'
        new_classified += 1
    elif top_votes >= 5 and top_track != c['trk']:
        # 专利投票 > 5 票且不同,纠正(因为专利是强证据)
        c['_original_track'] = c['trk']
        c['trk'] = top_track
        c['confidence'] = 'medium'
        c['method'] = 'ab+patent'
        updated += 1
    elif top_votes >= 3:
        # 专利确认(>=3 票),升 medium
        c['confidence'] = 'medium'
        c['method'] = 'ab+patent'
        updated += 1
    else:
        # 票数太少,保持 low
        unchanged += 1

print(f"\n反查结果:")
print(f"  新分类(原本空 → 专利定的): {new_classified}")
print(f"  纠正/确认(升 medium): {updated}")
print(f"  未变(无专利或票数少): {unchanged}")

# 5. 统计最终
print(f"\n最终分类:")
v9_n = sum(1 for c in companies if c.get('method') == 'v9' or c.get('method') == 'v9_name')
ab_n = sum(1 for c in companies if c.get('method') == 'ab')
abp_n = sum(1 for c in companies if c.get('method') == 'ab+patent')
empty_n = sum(1 for c in companies if not c.get('trk'))
high_n = sum(1 for c in companies if c.get('confidence') == 'high')
medium_n = sum(1 for c in companies if c.get('confidence') == 'medium')
low_n = sum(1 for c in companies if c.get('confidence') == 'low' and c.get('trk'))

print(f"  v9 已分类: {v9_n}")
print(f"  A+B only:  {ab_n}")
print(f"  A+B+专利:  {abp_n}")
print(f"  总分类:    {v9_n + ab_n + abp_n}")
print(f"  仍空:      {empty_n}")
print()
print(f"  high 置信度: {high_n}")
print(f"  medium:      {medium_n}")
print(f"  low:         {low_n}")

# 6. 写回
print(f"\n写回 companies.json...")
with open(os.path.join(DATA, 'companies.json'), 'w', encoding='utf-8') as f:
    json.dump(companies, f, ensure_ascii=False, allow_nan=False, separators=(',', ':'))

with open(os.path.join(DATA, 'companies.js'), 'w', encoding='utf-8') as f:
    f.write('// Auto-generated from companies.json\nwindow.COMPANIES = ')
    f.write(json.dumps(companies, ensure_ascii=False, allow_nan=False, separators=(',', ':')))
    f.write(';\n')

# 更新 aggregates
print(f"\n更新 aggregates.json...")
agg_path = os.path.join(DATA, 'aggregates.json')
with open(agg_path, 'r') as f:
    agg = json.load(f)

# 重新统计
classified_cnt = Counter([c['trk'] for c in companies if c.get('trk')])
conf_counts = Counter([c.get('confidence', '') for c in companies])
method_counts = Counter([c.get('method', '') for c in companies])

agg['classified_v9'] = method_counts.get('v9', 0) + method_counts.get('v9_name', 0)
agg['classified_ab'] = method_counts.get('ab', 0)
agg['classified_ab_patent'] = method_counts.get('ab+patent', 0)
agg['classified'] = sum(1 for c in companies if c.get('trk'))
agg['unclassified'] = sum(1 for c in companies if not c.get('trk'))
agg['confidence'] = dict(conf_counts)
agg['ab_patent_date'] = '2026-08-16'

# 更新赛道统计
for track in agg['tracks']:
    track['classified_count'] = classified_cnt.get(track['name'], 0)

with open(agg_path, 'w', encoding='utf-8') as f:
    json.dump(agg, f, ensure_ascii=False, allow_nan=False, separators=(',', ':'))

with open(os.path.join(DATA, 'aggregates.js'), 'w', encoding='utf-8') as f:
    f.write('// Auto-generated from aggregates.json\nwindow.AGGREGATES = ')
    f.write(json.dumps(agg, ensure_ascii=False, allow_nan=False, separators=(',', ':')))
    f.write(';\n')

print(f"\n✅ 完成")
print(f"\n赛道分布(最新):")
for t in agg['tracks']:
    print(f"  {t['emoji']} {t['name']:15s} {t['classified_count']:5d}")
PYEOF