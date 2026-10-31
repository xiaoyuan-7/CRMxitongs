// ==========================================================
// 对公拓客工作台 · 主逻辑
// ==========================================================

(function () {
  'use strict';

  // ============================================================
  // 全局状态
  // ============================================================
  const state = {
    currentRoute: '/',
    filter: {
      track: '',
      sub: '',
      ind: '',
      custInd: '',
      supInd: '',
      dist: '',
      city: '',
      emp: '',
      scale: '',
      status: '',
      confidence: '',
      chain: '',
      q: '',
    },
    page: 1,
    perPage: 50,
    visits: [],
    visitsNotes: {},  // code -> {note, status, updated_at}
    visitsAdded: {},   // code -> iso timestamp (加清单时间)
    visitsFilter: { q: '', track: '', confidence: '' }, // 清单页筛选
    visitsSelection: new Set(), // 清单页选中的企业 code
    companiesSelection: new Set(), // 公司库选中的企业 code
    v9ReviewFilter: { action: 'REVIEW', status: 'pending', q: '' }, // v9 复检页筛选
    v9ReviewPage: 1,
    v9ReviewPerPage: 30,
    v9ReviewDecisions: {}, // {code: {decision: 'adopt'|'skip'|'override', trk?, ts}}
  };

  // ============================================================
  // 数据访问
  // ============================================================
  const FieldMap = window._FIELDS || {};
  const Aggregates = window.AGGREGATES || {};
  const Companies = window.COMPANIES || [];
  const Overlap28 = window.OVERLAP_28 || [];
  const Top50 = window.TOP50_CLASSIFIED || [];
  const Top500 = window.TOP500_UNCLASSIFIED || [];
  const ChainLinks = window.CHAIN_LINKS || [];
const Relations = window.RELATIONS || {};
const SubTracks = window.SUB_TRACKS || [];
const V9Review = window.V9_REVIEW || []; // 4156 行 v9 review report
  const TechV2 = window.TECH_V2 || []; // 4097 家科创企业_分类v2 (公私联动池)

  // 建立 code → company 索引
  // TECH_V2 优先覆盖: 因为有 rm/emp/政策标签/banking_priority 等扩展字段
  // 对于 2697 家在主表 + tech_v2 同时存在的, TECH_V2 版本更丰富
  // ⚠️ Bug 修复 (2026-08-31): tech_v2 的 trk 是老 ab 分类,会覆盖主表的人工修正 (如鸿兴印刷 '消费升级' 覆盖 '印刷包装')
  // 修法: 主表 trk 优先保留,其他字段 tech_v2 覆盖 (rm/emp/sci/pat/has_account/has_credit/政策标签 等)
  const byCode = {};
  for (const c of Companies) byCode[c.code] = c;
  for (const c of TechV2) {
    if (c.code && byCode[c.code]) {
      // 保留主表 trk, 其他 tech_v2 优先
      byCode[c.code] = { ...byCode[c.code], ...c, trk: byCode[c.code].trk };
    } else if (c.code) {
      byCode[c.code] = c;
    }
  }

  // ============================================================
  // 14 赛道知识库 (一页通 / 营销建议生成用)
  // ============================================================
  const TRACK_INSIGHTS = {
    '半导体': {
      emoji: '🔬', priority: 'S',
      features: 'IP 密集、资本密集、长周期 (3-5 年)、政策强支持、上下游高度集中',
      business: '设计/制造/封测/设备/材料 全产业链分工，每个环节 30+ 家上市公司',
      value_chain: '上游:硅片/光刻机/EDA/光刻胶 → 中游:设计/晶圆代工/封测 → 下游:消费电子/汽车/服务器/通信',
      settlement: '票 30-90 天 + 信用;海外美元结算占比高 (出口 30%+);设备预付款 30%;海外信保融资',
      policy_window: '3-4 月 (年报 + 一季报 + IC 政策窗口) · 6 月 (年中订单) · 9-10 月 (三季报 + 双 11 备货) · 11 月 (进口设备免税截止)',
      cases: ['中芯国际 大基金二期 22.5 亿美元 (2023)', '寒武纪 科创板 IPO + 50 亿定增 (2024)', '长鑫存储 银团贷款 150 亿 (2023)', '韦尔股份 35 亿港元可转债 (2024)', '华虹半导体 IPO 融资 212 亿港元 (2024)'],
      anchor: '🏆 龙头:中芯国际 (688981,981 亿) · 海光信息 (688041,2500 亿) · 标杆:韦尔股份 (603501,1500 亿) · 寒武纪 (688256,580 亿)',
      products: ['科创贷（半导体专项）', '集成电路研发贷款', '投贷联动', '供应链金融（晶圆代工）', '股权激励配套', '外汇衍生品'],
      policy: '国家大基金 · 集成电路税收优惠 · 研发费用加计扣除 · 进口设备免税',
      risk: '技术迭代快 (摩尔定律) · 周期性 · 客户集中度高 · 出口管制 (实体清单)',
      talking_points: [
        '问研发投入占比 / 专利数量（反映技术壁垒）',
        '问客户结构（设计公司 / IDM / 晶圆厂的供应商？）',
        '问上市计划（Pre-IPO 阶段可推投行）',
        '问进口替代场景（中美脱钩背景下的国产化机会）',
      ],
      pitch: '您是半导体上下游的 [设计/制造/封测/设备/材料] 环节，我们有配套的科创贷 + 供应链金融 + 股权激励综合方案，参考客户：xxx',
    },
    '通信': {
      emoji: '📡', priority: 'S',
      features: '5G/6G 周期 · 设备 + 终端 + 运营商三段 · 出口占比高 · 标准化产品',
      business: '通信设备 (基站/光模块) + 终端 (手机/IoT 模组) + 光器件 (光模块/光芯片)',
      value_chain: '上游:芯片/光器件/PCB/结构件 → 中游:设备厂/模组厂 → 下游:运营商集采/数据中心/海外电信',
      settlement: '票 60-180 天;运营商集采月结;海外信用证;美元套保',
      policy_window: '3-4 月 (年报 + 运营商集采招标) · 6-7 月 (年中订单 + 5G 升级) · 9-10 月 (三季报 + 双 11 备货) · 12 月 (年度集采结算)',
      cases: ['华为 5G 银团贷款 200 亿 (2023)', '中兴通讯 科创贷 30 亿 (2024)', '中际旭创 800G 光模块 银团 50 亿 (2024)', '烽火通信 5G 专项授信 80 亿 (2023)', '信科移动 IPO 募资 60 亿 (2023)'],
      anchor: '🏆 龙头:华为 (非上市) · 中兴通讯 (000063,1700 亿) · 标杆:中际旭创 (300308,1500 亿) · 烽火通信 (600498,400 亿)',
      products: ['5G 产业链供应链金融', '外汇套保（出口型企业）', '科创贷', '投联贷', '信保融资'],
      policy: '5G 牌照 · 6G 预研 · 工信部专项 · 出口退税',
      risk: '运营商集采压价 · 海外贸易摩擦 · 技术替代（光通信→光模块）',
      talking_points: ['问海外业务占比（推外汇套保 + 信保融资）', '问是否进入运营商集采名单', '问 6G 预研投入（科创分加分项）'],
      pitch: '您的通信产品在 5G/6G 升级周期里，我们有针对性地提供 供应链金融 + 外汇套保 + 出口信保 综合方案',
    },
    '软件/SaaS': {
      emoji: '💻', priority: 'S',
      features: '轻资产 · 高毛利 · ARR 估值模型 · 客户粘性强 · 研发驱动',
      business: 'SaaS 订阅 + 行业定制开发 + 项目外包;细分:企业服务/金融科技/工业软件/垂直 SaaS',
      value_chain: '上游:云资源 (IaaS)/算力/开源组件 → 中游:SaaS 厂商/集成商 → 下游:行业头部客户 (金融/制造/政府)',
      settlement: '月/季/年预收;续费自动扣款;增值服务即时;海外美元收款 (Stripe/PayPal)',
      policy_window: '3-4 月 (SaaS 续费高峰 + Q1 财报) · 6 月 (年中续费) · 9 月 (Q3 续费 + 客户预算) · 11-12 月 (年度大单签约)',
      cases: ['金山办公 科创板 IPO 46 亿 (2019)', '用友网络 银团贷款 30 亿 (2023)', '广联达 数字造价云转型融资 50 亿 (2024)', 'Salesforce 中国子公司 美元授信 5 亿 (2023)', '明源云 港股 IPO 82 亿港元 (2020)'],
      anchor: '🏆 龙头:金山办公 (688111,1500 亿) · 用友网络 (600588,500 亿) · 标杆:广联达 (002410,300 亿) · 金蝶国际 (0268.HK,500 亿)',
      products: ['科创贷', '股权激励贷款', 'PEVC 撮合', '知识产权质押', '供应链金融（应收云服务费）', '美元 SaaS 收款'],
      policy: '软件企业税收优惠 · 增值税即征即退 · 高新企业 · 研发加计扣除',
      risk: '客户续费率 · 大客户集中度 · 国产替代节奏 · 现金流（项目制 vs SaaS）',
      talking_points: ['问续费率（健康 SaaS > 90%）', '问是否服务行业头部客户', '问是否有融资计划（推 PEVC 撮合）', '问核心代码是否申请了软著 / 专利'],
      pitch: '我们针对 SaaS/软件企业有专门的 科创贷 + 股权激励 + 知识产权质押 综合方案，可参考同行业客户：xxx',
    },
    '医疗器械': {
      emoji: '🏥', priority: 'S',
      features: '强监管（NMPA 注册证）· 长周期 · 集采压价 · 国产替代加速',
      business: '诊断试剂 (IVD) + 影像设备 (CT/MRI/超声) + 高值耗材 (介入/骨科) + 家用医疗',
      value_chain: '上游:电子元件/光学/试剂原料/磁体 → 中游:器械厂 → 下游:医院/经销商/体检机构',
      settlement: '招标 90-180 天;集采压价 30-50%;医院回款 6-12 月;海外信用证 (FDA/CE 认证后)',
      policy_window: '3-4 月 (CMEF 春季展 + 年报) · 6-7 月 (集采开标 + 医保目录调整) · 9-10 月 (三季报 + 国庆备货) · 11 月 (医保谈判)',
      cases: ['迈瑞医疗 银团贷款 80 亿 (2023)', '联影医疗 科创板 IPO 110 亿 (2022)', '微医集团 互联网医院融资 10 亿美元 (2021)', '威高集团 银团授信 50 亿 (2023)', '鱼跃医疗 并购贷款 30 亿 (2024)'],
      anchor: '🏆 龙头:迈瑞医疗 (300760,3500 亿) · 联影医疗 (688271,1000 亿) · 标杆:鱼跃医疗 (002223,400 亿) · 微医集团 (非上市)',
      products: ['科创贷（医疗器械专项）', '投联贷', '集采应收账款融资', '医院供应链', 'PEVC 撮合'],
      policy: '创新医疗器械绿色通道 · 注册证持有人税收优惠 · 医保目录',
      risk: '集采降价 · 注册周期长 · 临床数据 · 召回风险',
      talking_points: ['问主要产品 NMPA 注册证状态', '问集采中标情况（应收账款规模）', '问是否进入医保目录', '问海外 FDA / CE 认证情况'],
      pitch: '医疗器械有专门的 集采应收账款融资 + 科创贷 + 投贷联动 方案，您目前主要在做 [诊断试剂/影像设备/耗材] 是吗？',
    },
    '生物医药': {
      emoji: '💊', priority: 'S',
      features: '研发周期长（10+ 年）· 临床试验 · 监管严格 · 估值波动大',
      business: '创新药 + CRO (临床外包) + 原料药 + 生物类似药;细分:肿瘤/免疫/GLP-1/罕见病',
      value_chain: '上游:试剂/原料药/GLP-1 耗材 → 中游:药企/CRO → 下游:医院/药店/海外药企授权',
      settlement: '研发分阶段里程碑款;海外授权首付款 + 销售分成;医院回款长;MAH 委托加工',
      policy_window: '3-4 月 (Q1 临床数据 + AACR 年会) · 6 月 (ASCO 数据发布) · 9 月 (ESMO + 季报) · 10-11 月 (医保谈判 + 药品集采)',
      cases: ['恒瑞医药 海外授权 14 亿美元 (2024)', '百济神州 美股 IPO 募资 23 亿美元 (2016)', '信达生物 礼来合作 20 亿美元 (2023)', '药明康德 银团贷款 60 亿 (2024)', '君实生物 港股 IPO 30 亿港元 (2018)'],
      anchor: '🏆 龙头:恒瑞医药 (600276,3000 亿) · 药明康德 (603259,1800 亿) · 标杆:百济神州 (688235,1500 亿) · 信达生物 (1801.HK,500 亿)',
      products: ['科创贷', 'PEVC 撮合', '临床试验保险', '知识产权质押', '投行服务'],
      policy: '创新药绿色通道 · 优先评审 · 医保谈判',
      risk: '临床失败 · 集采压价 · 同质化竞争',
      talking_points: ['问核心管线（哪个适应症）', '问临床阶段（I/II/III 期）', '问是否计划 IPO'],
      pitch: '生物医药企业有专门的临床试验保险 + 投贷联动方案',
    },
    '机器人/AI': {
      emoji: '🤖', priority: 'A',
      features: '前沿技术 · 政策支持 · 资本密集 · 应用场景多元',
      business: '工业机器人 (六轴/SCARA) + 服务机器人 + 大模型应用 (NLP/CV) + 自动驾驶',
      value_chain: '上游:伺服电机/减速器/传感器/算力 (GPU/H100) → 中游:本体厂/算法厂 → 下游:工厂/政府/终端消费者',
      settlement: '项目制预收 30%;订阅服务月付;硬件一次性 + 维护年费;模型 API 按调用量计费',
      policy_window: '3-4 月 (年报 + CES 春季展) · 6 月 (618 备货) · 9-10 月 (三季报 + 双 11 备货) · 11 月 (世界互联网大会)',
      cases: ['优必选 港股 IPO 13 亿港元 (2023)', '大疆无人机 银团授信 30 亿 (2023)', '寒武纪 科创板 IPO 50 亿 (2020)', '科大讯飞 银团贷款 50 亿 (2023)', '商汤科技 港股 IPO 60 亿港元 (2021)'],
      anchor: '🏆 龙头:大疆 (非上市,估 1500 亿) · 商汤 (0020.HK,600 亿) · 标杆:科大讯飞 (002230,900 亿) · 优必选 (9880.HK,300 亿)',
      products: ['科创贷', 'PEVC 撮合', '供应链金融', '知识产权质押'],
      policy: '人工智能 · 工业母机 · 专精特新',
      risk: '技术落地 · 数据合规 · 大模型同质化',
      talking_points: ['问核心算法 / 模型', '问下游应用场景', '问算力采购规模'],
      pitch: 'AI/机器人企业的 算力租赁融资 + 科创贷 方案',
    },
    '新能源/储能': {
      emoji: '🔋', priority: 'A',
      features: '政策强驱动 · 上下游绑定 · 现金流依赖补贴',
      business: '动力电池 + 储能电池 (户用/工商业/电网) + 逆变器 + 系统集成 (EPC)',
      value_chain: '上游:锂/钴/镍/硅料/正负极材料/电解液 → 中游:电池厂/逆变器厂 → 下游:电网/工商业/户用/海外',
      settlement: '票 30-90 天;补贴款 3-6 月滞后;海外信用证;绿色信贷贴息;EPC 项目分阶段',
      policy_window: '3-4 月 (年报 + SNEC 光储展) · 6 月 (年中补贴清算) · 9 月 (三季报 + 储能招标高峰) · 11-12 月 (年度装机抢装)',
      cases: ['宁德时代 银团贷款 200 亿 (2023)', '比亚迪 储能项目融资 100 亿 (2024)', '隆基绿能 绿色债券 50 亿 (2023)', '阳光电源 出口信贷 30 亿 (2023)', '亿纬锂能 银团授信 50 亿 (2024)'],
      anchor: '🏆 龙头:宁德时代 (300750,1.2 万亿) · 比亚迪 (002594,7500 亿) · 标杆:隆基绿能 (601012,1500 亿) · 阳光电源 (300274,1500 亿)',
      products: ['光伏贷', '储能项目融资', '供应链金融', '绿色信贷', '碳中和债'],
      policy: '双碳目标 · 新能源补贴 · 储能补贴 · 绿色金融',
      risk: '补贴退坡 · 产能过剩 · 上游硅料价格波动',
      talking_points: ['问主要产品（电池/逆变器/系统集成）', '问下游客户（电网/工商业/户用）', '问项目周期'],
      pitch: '新能源/储能企业的绿色信贷 + 项目融资方案',
    },
    '检测/认证': {
      emoji: '🔍', priority: 'A',
      features: '轻资产 · 服务驱动 · 牌照壁垒 · 现金流好',
      business: '第三方检测 (环境/食品/医疗) + CMA 认证 + 校准/计量 + 国际认证 (UL/CE)',
      value_chain: '上游:仪器设备/试剂 → 中游:检测机构 → 下游:制造业/食品/医疗/电子/出口企业',
      settlement: '服务费预收 50%;报告交付尾款 50%;大客户月结;海外认证美元结算',
      policy_window: '3-4 月 (年报 + 3.15 消费者权益) · 6 月 (年中认证高峰) · 9 月 (ISO 体系审核) · 12 月 (年度审核 + 出口认证)',
      cases: ['华测检测 银团贷款 30 亿 (2023)', '谱尼测试 IPO 募资 15 亿 (2020)', 'SGS 中国 外资授信 5 亿美元 (2023)', '中国电研 科创板 IPO 20 亿 (2021)', '广电计量 银团授信 15 亿 (2024)'],
      anchor: '🏆 龙头:华测检测 (300012,300 亿) · 谱尼测试 (300887,150 亿) · 标杆:广电计量 (002967,100 亿) · 中国电研 (688128,200 亿)',
      products: ['科创贷', 'CMA/CNAS 资质企业专项', '结算套餐', '设备融资租赁'],
      policy: 'CMA · CNAS · 第三方检测资质',
      risk: '牌照续期 · 客户行业景气度',
      talking_points: ['问主要服务行业', '问资质等级（CMA/CNAS/ISO 17025）', '问设备投入规模'],
      pitch: '检测认证企业的资质企业专项 + 设备融资租赁方案',
    },
    '供应链-电子': {
      emoji: '🔌', priority: 'B',
      features: '量大面广 · 客户分散 · 标准化 · 利润率薄',
      business: '代理分销 (原厂授权) + 方案集成 (模块设计) + 电商平台 (立创商城/得捷)',
      value_chain: '上游:原厂芯片/模组 (海思/紫光/海外 TI/ADI) → 中游:代理/方案商 → 下游:终端制造商',
      settlement: '票 30-90 天;海外信用证;代理返点季结;海外 NRA 账户;电商平台 T+1',
      policy_window: '3-4 月 (年报 + CES) · 5-6 月 (年中备货) · 9 月 (开学季备货) · 11-12 月 (双 11/12 大促)',
      cases: ['深圳华强 北交所 IPO + 银团 30 亿 (2023)', '力源信息 配股融资 10 亿 (2023)', '中电港 科创板 IPO 15 亿 (2023)', '雅创电子 创业板 IPO 12 亿 (2022)', '商络电子 创业板 IPO 10 亿 (2021)'],
      anchor: '🏆 龙头:深圳华强 (000062,200 亿) · 中电港 (001287,300 亿) · 标杆:力源信息 (300184,80 亿) · 商络电子 (301356,80 亿)',
      products: ['结算套餐', '应收账款融资', '跨境金融', '供应链金融（核心企业）'],
      policy: '电子信息产业政策 · 出口退税',
      risk: '价格战 · 客户账期 · 汇率波动',
      talking_points: ['问下游客户（手机/家电/汽车电子？）', '问海外业务占比', '问账期管理'],
      pitch: '电子供应链企业的 跨境金融 + 应收账款融资 方案',
    },
    '供应链-精密': {
      emoji: '⚙️', priority: 'B',
      features: '制造业基础 · 工艺积累 · 客户认证壁垒',
      business: '精密模具 + CNC 机加工 + 精密零部件 (手机/汽车/医疗器械)',
      value_chain: '上游:特种钢/硬质合金刀具/精密机床 → 中游:模具厂/加工厂 → 下游:消费电子/汽车/医疗',
      settlement: '票 60-120 天;主机厂月结 90 天;模具开发款分期;设备融资租赁;NPI 阶段预收',
      policy_window: '3-4 月 (年报 + 苹果新机备货) · 6 月 (年中订单) · 9 月 (苹果发布会前备货) · 11 月 (双 11 + 圣诞备货)',
      cases: ['立讯精密 银团贷款 150 亿 (2023)', '长盈精密 银团授信 50 亿 (2024)', '领益智造 并购贷款 80 亿 (2023)', '东山精密 银团贷款 60 亿 (2023)', '欧菲光 银团授信 40 亿 (2024)'],
      anchor: '🏆 龙头:立讯精密 (002475,2700 亿) · 领益智造 (002600,500 亿) · 标杆:长盈精密 (300115,200 亿) · 东山精密 (002384,400 亿)',
      products: ['设备融资租赁', '供应链金融', '技术改造贷款'],
      policy: '专精特新 · 制造业单项冠军',
      risk: '客户集中 · 工艺迭代',
      talking_points: ['问核心工艺', '问设备投入', '问客户认证情况'],
      pitch: '精密制造的 设备融资租赁 + 技术改造贷款 方案',
    },
    '化工/新材料': {
      emoji: '🧪', priority: 'C',
      features: '周期性强 · 环保合规重 · 资本密集',
      business: '基础化工 + 精细化工 + 特种材料 + 电子化学品 (光刻胶/湿电子化学品)',
      value_chain: '上游:原油/煤/磷矿/盐 → 中游:化工厂/材料厂 → 下游:纺织/电子/汽车/建筑/光伏',
      settlement: '票 30-60 天;大宗长协价 + 现货浮动;期货套保;美元 L/C;环保税附加',
      policy_window: '3-4 月 (Q1 财报 + 春耕下游) · 6 月 (年中检修 + 油价波动) · 9 月 (金九银十下游备货) · 12 月 (冬季能源化工)',
      cases: ['万华化学 银团贷款 200 亿 (2023)', '恒力石化 银团授信 300 亿 (2024)', '荣盛石化 浙石化项目融资 500 亿 (2023)', '东方盛虹 银团贷款 150 亿 (2024)', '新和成 维生素价格保险 50 亿 (2023)'],
      anchor: '🏆 龙头:万华化学 (600309,2500 亿) · 恒力石化 (600346,1500 亿) · 标杆:荣盛石化 (002493,1300 亿) · 东方盛虹 (000301,700 亿)',
      products: ['项目贷款', '供应链金融', '绿色信贷'],
      policy: '环保政策 · 新材料专项',
      risk: '环保事故 · 价格周期',
      talking_points: ['问环保资质', '问产品下游'],
      pitch: '化工新材料的 项目贷款 + 供应链金融',
    },
    '消费升级': {
      emoji: '🛍️', priority: 'C',
      features: '品牌驱动 · 渠道分散 · 利润率薄',
      business: '品牌 (新消费) + 渠道运营 + 电商代运营 + 内容电商 (抖音/小红书)',
      value_chain: '上游:工厂代工 (OEM/ODM) → 中游:品牌商/运营方 → 下游:C 端消费者 (线上 + 线下)',
      settlement: '平台 T+7 结算;经销商预付 30%;电商支付即时;直播带货分账 (平台抽佣后)',
      policy_window: '3 月 (春装上市 + 38 节) · 6 月 (618 大促) · 9 月 (秋冬装 + 中秋) · 11-12 月 (双 11/12 + 年货节)',
      cases: ['泡泡玛特 港股 IPO 57 亿港元 (2020)', '完美日记 美股 IPO 7 亿美元 (2020)', '元气森林 银团贷款 30 亿 (2023)', '喜茶 D 轮融资 5 亿美元 (2021)', '蕉下控股 港股 IPO 30 亿港元 (2022)'],
      anchor: '🏆 龙头:泡泡玛特 (9992.HK,1000 亿) · 完美日记 (已退市) · 标杆:元气森林 (非上市,估 600 亿) · 蕉下 (已上市,50 亿)',
      products: ['结算套餐', 'POS 收单', '电商金融', '供应链金融'],
      policy: '消费金融政策',
      risk: '渠道变化 · 消费者偏好',
      talking_points: ['问主要渠道', '问线上销售占比'],
      pitch: '消费品企业的 结算套餐 + POS 收单 + 电商金融',
    },
    '汽车': {
      emoji: '🚗', priority: 'B',
      features: '产业链长 · 电动化转型 · 主机厂认证壁垒',
      business: '整车厂 (新能源/传统) + Tier1 零部件 (电池/电机/电控) + 经销商 (4S/直营)',
      value_chain: '上游:钢铁/铝/电池/电子芯片 → 中游:整车厂/零部件厂 → 下游:C 端/出行运营/B 端物流',
      settlement: '主机厂 90-180 天;新能源补贴延后 3-6 月;经销商合格证质押;二手车金融;电池租赁',
      policy_window: '3 月 (年报 + 上海车展) · 5 月 (车展备货) · 9 月 (金九银十销售) · 12 月 (年终冲量 + 补贴退坡前抢装)',
      cases: ['比亚迪 银团贷款 500 亿 (2024)', '蔚来汽车 美股 IPO 70 亿美元 (2018)', '小鹏汽车 美股 IPO 15 亿美元 (2020)', '理想汽车 美股 IPO 11 亿美元 (2021)', '宁德时代 电池租赁融资 100 亿 (2024)'],
      anchor: '🏆 龙头:比亚迪 (002594,7500 亿) · 长城汽车 (601633,2500 亿) · 标杆:理想 (LI.US,2000 亿) · 小鹏 (9868.HK,800 亿)',
      products: ['供应链金融', '汽车金融', '新能源车贷', '出口金融'],
      policy: '新能源汽车补贴 · 双积分',
      risk: '主机厂压价 · 电动化转型风险',
      talking_points: ['问主要客户（主机厂 / Tier1）', '问新能源占比'],
      pitch: '汽车产业链的 供应链金融 + 新能源车贷',
    },
    '印刷包装': {
      emoji: '🖨️', priority: 'B',
      features: '资本密集 (印刷机/印后设备) · 人工密集 · 订单驱动 · 原料价格敏感 · 客户分散 (品牌商/出版社/政府)',
      business: '包装装潢印刷 (彩盒/纸盒/说明书) + 出版物印刷 (书/杂志) + 标签印刷 + 商业印刷 + 数字印刷 + 包装设计',
      value_chain: '上游:纸张/油墨/版材/薄膜/胶水 → 中游:印厂 (设计/制版/印刷/装订) → 下游:品牌商/出版社/政府/电子/医药/出口',
      settlement: '票 60-120 天;品牌商月结 90 天;出版社预付 30%;出口信用证;纸张供应商现款',
      policy_window: '3-4 月 (广印展 + 年报) · 6-7 月 (年中备货) · 9 月 (秋季教材出版 + 双 11 包装订单) · 11-12 月 (双 12 + 年货礼盒)',
      cases: ['鸿兴印刷 港股 IPO 4.5 亿港元 (1994,持续融资) · 2017 银团 15 亿港元', '雅昌集团 多轮 PEVC 融资累计 20 亿 (2018-2023)', '劲嘉股份 银团贷款 30 亿 (2023)', '东港股份 票据池融资 10 亿 (2024)', '裕同科技 银团贷款 50 亿 (2023) · 海外建厂融资 20 亿'],
      anchor: '🏆 龙头:鸿兴印刷 (港股 0427,30 亿港元) · 雅昌集团 (非上市,印刷界黄埔) · 标杆:劲嘉股份 (002191,150 亿) · 东港股份 (002117,80 亿) · 裕同科技 (002831,250 亿)',
      products: ['结算套餐', '税易贷', '设备融资租赁 (海德堡/小森印刷机)', '供应链金融 (纸/油墨)', '出口信用证', '票据池'],
      policy: '文化创意产业税收优惠 · 印刷业 VOCs 治理 · 出版物增值税先征后退 · 进口印刷设备免税',
      risk: '纸张价格波动 · 电子出版替代 · 环保监管严 (VOCs) · 订单不稳定 · 印刷工人工费上涨',
      talking_points: [
        '问主要客户行业 (电子/医药/食品/服装?) — 决定订单稳定性',
        '问主要印刷机品牌 (海德堡/小森/高宝?) — 决定设备融资空间',
        '问纸张采购模式 (长协/现货?) — 决定套保需求',
        '问海外业务 (出口占比?) — 决定外汇结算需求',
        '问数字化转型进度 (CTP/数码印刷?) — 决定科创贷资格',
      ],
      pitch: '印刷企业的 设备融资租赁 (印刷机) + 供应链金融 (纸张/油墨) + 出口信用证 综合方案',
    },
    '其他': {
      emoji: '📦', priority: 'C',
      features: '通用赛道 · 需要进一步分类',
      business: '待补充 (双击编辑,或跑 _refine_v9_apply.py 后重新分类)',
      value_chain: '待补充',
      settlement: '待补充',
      policy_window: '待补充 (双击编辑,或跑 _refine_v9_apply.py 后重新分类)',
      cases: [],
      anchor: '待补充',
      products: ['结算套餐', '科创贷（如果高新）'],
      policy: '',
      risk: '',
      talking_points: ['问核心业务 / 商业模式'],
      pitch: '请补充行业信息后再匹配具体方案',
    },
  };

  // 拜访模板 (5 个常用场景)
  const VISIT_TEMPLATES = [
    { key: 'plan', label: '📅 首次拜访', icon: '📅', template:
`【首次拜访计划】
日期:    {{date}}
客户:    {{name}}
法人:    {{legal}}
电话:    {{phone}}
地址:    {{addr}}
预约方式: 扫楼 / 引荐 / 电话 / 其他
切入话题: 
预估需求: 
跟进事项: 
` },
    { key: 'visit', label: '✅ 已拜访', icon: '✅', template:
`【拜访记录 {{date}}】
接触人:   职位: 
来访方式: 扫楼 / 引荐 / 电话 / 其他
谈了什么: 
对方意向: 高 / 中 / 低
已开户?  是 / 否
授信意向: 是 / 否
下一步: 
下次跟进: 
` },
    { key: 'follow', label: '📞 跟进', icon: '📞', template:
`【跟进 {{date}}】
方式: 电话 / 微信 / 邮件 / 上门
话题: 
反馈: 
对方态度: 积极 / 中立 / 谨慎
下一步: 
` },
    { key: 'deal', label: '💰 已开户', icon: '💰', template:
`【已开户 {{date}}】
账户类型: 基本户 / 一般户
结算套餐: 
授信:    金额: 万
代发:    人数: 
私行介绍: 已 / 否
后续目标: 
` },
    { key: 'pause', label: '⏸️ 暂缓/放弃', icon: '⏸️', template:
`【暂缓/放弃 {{date}}】
原因: 价格 / 需求不匹配 / 已选他家 / 暂无融资需求
下次启动条件: 
` },
  ];

  // 占位符填充
  function fillPlaceholders(text, code) {
    const c = byCode[code];
    if (!c) return text;
    const today = new Date().toISOString().substring(0, 10);
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      switch (key) {
        case 'date': return today;
        case 'code': return c.code || '';
        case 'name': return c.name || '';
        case 'legal': return c.legal || '';
        case 'phone': return (c.phone || '').split(/[;,]/)[0].trim();
        case 'email': return (c.email || '').split(/[;,]/)[0].trim();
        case 'addr': return c.addr || '';
        case 'dist': return c.dist || '';
        case 'emp': return c.emp != null ? String(c.emp) : '';
        case 'rc': return c.rc != null ? String(c.rc) + ' 万' : '';
        case 'trk': return c.trk || '';
        case 'rm': return c.rm || '';
        case 'rm_branch': return c.rm_branch || '';
        default: return '{{' + key + '}}';
      }
    });
  }

  // 拜访清单
  try {
    const saved = localStorage.getItem('workbench-visits');
    if (saved) state.visits = JSON.parse(saved);
  } catch (e) { state.visits = []; }

  // 拜访备注 (code -> {note, status, updated_at})
  try {
    const saved = localStorage.getItem('workbench-visits-notes');
    if (saved) state.visitsNotes = JSON.parse(saved);
  } catch (e) { state.visitsNotes = {}; }

  // 加清单时间戳 (code -> iso string)
  try {
    const saved = localStorage.getItem('workbench-visits-added');
    if (saved) state.visitsAdded = JSON.parse(saved);
  } catch (e) { state.visitsAdded = {}; }

  // v9 review 复检决策(本地存储,跨刷新保留)
  try {
    const saved = localStorage.getItem('workbench-v9-review');
    if (saved) state.v9ReviewDecisions = JSON.parse(saved);
  } catch (e) { state.v9ReviewDecisions = {}; }

  // ============================================================
  // 工具
  // ============================================================
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => n == null ? '-' : Number(n).toLocaleString('zh-CN');
  const fmtWan = (n) => n == null ? '-' : (n >= 10000 ? (n/10000).toFixed(2) + '亿' : n.toLocaleString() + '万');
  const debounce = (fn, ms) => {
    let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  };

  // 字段 display 名
  function fd(key) { return FieldMap[key] || key; }

  // ============================================================
  // 拜访清单(本地存储)
  // ============================================================
  function toggleVisit(code) {
    const i = state.visits.indexOf(code);
    if (i >= 0) {
      state.visits.splice(i, 1);
      delete state.visitsAdded[code];
    } else {
      state.visits.push(code);
      state.visitsAdded[code] = new Date().toISOString();
      localStorage.setItem('workbench-visits-added', JSON.stringify(state.visitsAdded));
    }
    localStorage.setItem('workbench-visits', JSON.stringify(state.visits));
    updateVisitBadge();
  }

  // 备注/状态 helper
  function getVisitNote(code) {
    return state.visitsNotes[code] || { note: '', status: 'pending', updated_at: '' };
  }
  function setVisitNote(code, patch) {
    state.visitsNotes[code] = {
      ...getVisitNote(code),
      ...patch,
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem('workbench-visits-notes', JSON.stringify(state.visitsNotes));
  }
  function isVisited(code) { return state.visits.includes(code); }
  function updateVisitBadge() {
    const el = $('#visitCount');
    if (el) el.textContent = `⭐ 拜访清单 ${state.visits.length}`;
  }

  // 顶部 badge click → 跳 #/visits (Bug 2 修复: 原本只是个 span,点了没反应)
  function bindVisitBadge() {
    const el = $('#visitCount');
    if (!el || el._visitBound) return;
    el._visitBound = true;
    el.style.cursor = 'pointer';
    el.setAttribute('role', 'button');
    el.setAttribute('title', '点击查看 / 导出拜访清单');
    el.addEventListener('click', () => { location.hash = '#/visits'; });
  }

  // ============================================================
  // 路由
  // ============================================================
  function getQueryParam(name) {
    const hash = location.hash.slice(1);
    const q = hash.split('?')[1] || '';
    return new URLSearchParams(q).get(name) || '';
  }
  function router() {
    const hash = location.hash.slice(1) || '/';
    const [path] = hash.split('?');
    state.currentRoute = path;
    $$('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.route === path);
    });

    if (path === '/' || path === '') renderHome();
    else if (path === '/companies') renderCompanies();
    else if (path === '/overlap') renderOverlap();
    else if (path === '/links') renderLinks();
    else if (path === '/research') renderResearch();
    else if (path === '/visits') renderVisits();
    else if (path === '/v9-review') renderV9Review();
    else if (path === '/tech-v2') renderTechV2();
    else if (path === '/one-pager') renderOnePagerFromHash();
    else renderHome();
  }
  window.addEventListener('hashchange', router);

  // ============================================================
  // 渲染:工作台
  // ============================================================
  function renderHome() {
    const a = Aggregates;
    const cf = a.confidence || {};
    const highN = cf.high || 0;
    const medN = cf.medium || 0;
    const lowN = cf.low || 0;
    $('#app').innerHTML = `
      <h1 class="page-title">🏠 今日行动</h1>
      <p class="page-sub">从 ${fmt(a.total)} 家里挑出值得拜访的 · 按优先级排好</p>

      <div class="hero-stats">
        <div class="hero-stat">
          <div class="hero-stat-num">${fmt(a.total)}</div>
          <div class="hero-stat-label">主桌面企业</div>
        </div>
        <div class="hero-stat">
          <div class="hero-stat-num" style="color:var(--good)">${fmt(a.classified)}</div>
          <div class="hero-stat-label">已分赛道</div>
        </div>
        <div class="hero-stat">
          <div class="hero-stat-num" style="color:var(--good)">${fmt(highN + medN)}</div>
          <div class="hero-stat-label">高/中置信度</div>
        </div>
        <div class="hero-stat">
          <div class="hero-stat-num" style="color:var(--warn)">${fmt(lowN)}</div>
          <div class="hero-stat-label">低置信度(待人工)</div>
        </div>
      </div>

      <div class="cards">
        <a class="card" href="#/tech-v2" style="background:linear-gradient(135deg, rgba(255,180,80,0.10), rgba(80,160,255,0.10));border-color:rgba(255,180,80,0.5)">
          <div class="card-emoji">🤝</div>
          <div class="card-title">公私联动池 · ${fmt((a.tech_v2 || {}).total || 0)} 家</div>
          <div class="card-sub" style="line-height:1.6">
            法人都是零售客户 · <strong style="color:var(--warn)">${fmt((a.tech_v2 || {}).linked_rm || 0)}</strong> 挂钩 RM<br>
            🏢 <strong style="color:var(--good)">${fmt((a.tech_v2 || {}).big_with_rm || 0)}</strong> 家 ≥100 人 + 已挂钩 RM · ⭐ <strong style="color:var(--good)">${fmt((a.tech_v2 || {}).priority_top || 0)}</strong> 家高分<br>
            <span style="font-size:11px;color:var(--text-3)">继承主表 ${fmt((a.tech_v2 || {}).inherited || 0)} · ${fmt((a.tech_v2 || {}).big_total || 0)} 大企业 (含 ${fmt((a.tech_v2 || {}).huge_total || 0)} ≥500 人)</span>
          </div>
        </a>
        <a class="card" href="#/overlap">
          <div class="card-emoji">⭐</div>
          <div class="card-title">三圈重叠 · 高质量线索</div>
          <div class="card-sub">国家级专精特新 ∩ 5000 专精特新 ∩ 深圳高企 · 三重认定</div>
          <div class="card-stat">${Overlap28.length}<span class="card-stat-sub">家可直接拜访</span></div>
        </a>
        <a class="card" href="#/companies?conf=high">
          <div class="card-emoji">🎯</div>
          <div class="card-title">高置信度 · Top 优先拜访</div>
          <div class="card-sub">v9 + A+B 强信号 · 可信首选 · <strong>${fmt(highN)}</strong>家</div>
          <div class="card-stat" style="color:var(--good)">${fmt(highN)}<span class="card-stat-sub">家高质量</span></div>
        </a>
        <a class="card" href="#/companies?conf=medium">
          <div class="card-emoji">🎲</div>
          <div class="card-title">中置信度 · 批量拓客</div>
          <div class="card-sub">A+B 中信号 + 专利确认 · 产量批 · <strong>${fmt(medN)}</strong>家</div>
          <div class="card-stat" style="color:var(--accent)">${fmt(medN)}<span class="card-stat-sub">家中等信度</span></div>
        </a>
        <a class="card" href="#/companies?conf=low">
          <div class="card-emoji">⚠️</div>
          <div class="card-title">低置信度 · 人工 review</div>
          <div class="card-sub">A+B 弱信号 · 需人工确认赛道 · <strong>${fmt(lowN)}</strong>家</div>
          <div class="card-stat" style="color:var(--warn)">${fmt(lowN)}<span class="card-stat-sub">家待 review</span></div>
        </a>
      </div>

      <div class="cards" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));margin-top:-12px">
        <a class="card" href="#/companies?filter=classified">
          <div class="card-emoji">🏆</div>
          <div class="card-title">已分类 Top 50 · 画像卡</div>
          <div class="card-sub">${fmt(a.classified)} 家中打分最高 50 家</div>
        </a>
        <a class="card" href="#/companies?conf=none">
          <div class="card-emoji">💎</div>
          <div class="card-title">未分类 · Top 500</div>
          <div class="card-sub">${fmt(a.unclassified)} 家未分类金矿</div>
        </a>
        <a class="card" href="#/links">
          <div class="card-emoji">🕸️</div>
          <div class="card-title">链主网络 · ${ChainLinks.length} 家</div>
          <div class="card-sub">Top 100 + G2B 60 + 产业链 40 + 上下游 · <strong>${fmt(Companies.filter(c => (c.chain_role || []).length > 0).length)}</strong> 家在主表</div>
          <div class="card-stat">${ChainLinks.length}<span class="card-stat-sub">家链主</span></div>
        </a>
      </div>

      <!-- v9 复检进度 banner(只在有未处理时显示) -->
      ${(() => {
        const remaining = V9Review.filter(r => r.action === 'NEEDS_REVIEW' || r.action === 'INDUSTRY_FALLBACK');
        const pending = remaining.filter(r => !state.v9ReviewDecisions[r.code]).length;
        const decided = remaining.length - pending;
        if (pending === 0 && decided === 0) return '';
        return `
          <a href="#/v9-review" class="v9-banner ${pending === 0 ? 'v9-banner-done' : ''}" style="display:flex;align-items:center;gap:16px;padding:14px 18px;background:${pending === 0 ? 'rgba(80,200,120,0.08)' : 'rgba(255,170,50,0.08)'};border:1px solid ${pending === 0 ? 'var(--good)' : 'var(--warn)'};border-radius:8px;margin-bottom:16px;text-decoration:none;color:inherit">
            <div style="font-size:28px">${pending === 0 ? '🎉' : '🔍'}</div>
            <div style="flex:1">
              <div style="font-size:14px;font-weight:600;color:${pending === 0 ? 'var(--good)' : 'var(--warn)'}">
                v9 复检进度:${decided}/${remaining.length} · ${pending === 0 ? '全部完成' : `还剩 ${pending} 家待处理`}
              </div>
              <div style="font-size:11px;color:var(--text-3);margin-top:2px">
                ${pending === 0 ? '全部 525 家已决 · 可重新导出应用到 companies.json' : '点击进入复检页 · 一键采纳/跳过/自定义'}
              </div>
            </div>
            <div style="font-size:18px;color:var(--text-3)">→</div>
          </a>
        `;
      })()}

      <h2 style="font-size:18px;margin:24px 0 12px">📊 14 个赛道 · 60+ 子轨道分布</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:12px">
        ${SubTracks.map(m => {
          if (!m.subs || m.subs.length === 0) {
            return `
              <div style="background:var(--bg-2);border:1px solid var(--border);border-radius:8px;padding:12px">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                  <span style="font-size:20px">${m.emoji}</span>
                  <strong style="font-size:14px">${esc(m.name)}</strong>
                  <span style="color:var(--text-3);font-size:11px;margin-left:auto">${fmt(m.count)}</span>
                </div>
                <div style="color:var(--text-3);font-size:11px">(未细分)</div>
              </div>
            `;
          }
          return `
            <div style="background:var(--bg-2);border:1px solid var(--border);border-radius:8px;padding:12px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                <span style="font-size:20px">${m.emoji}</span>
                <a href="#/companies?track=${encodeURIComponent(m.name)}" style="font-size:14px;font-weight:600;text-decoration:none;color:var(--text)">${esc(m.name)}</a>
                <span style="color:var(--text-3);font-size:11px;margin-left:auto">${fmt(m.count)}</span>
              </div>
              <div style="display:flex;flex-wrap:wrap;gap:4px">
                ${m.subs.map(s => `
                  <a href="#/companies?track=${encodeURIComponent(m.name)}&sub=${encodeURIComponent(s.name)}"
                     style="padding:3px 8px;background:var(--bg-3);border-radius:10px;font-size:11px;color:${s.count > 0 ? 'var(--accent)' : 'var(--text-3)'};text-decoration:none;border:1px solid ${s.count > 0 ? 'transparent' : 'var(--border)'}">
                    ${esc(s.name)} ${s.count}
                  </a>
                `).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div style="margin-top:32px;padding:16px;background:var(--bg-2);border-radius:8px;border:1px solid var(--border);font-size:12px;color:var(--text-3)">
        💡 <strong>使用流程</strong>:首页选优先级(三圈重叠 > Top 50 > Top 500) → 进公司库筛选 → 点企业看画像卡 → 加入拜访清单(⭐)→ 见客户
        <br><br>
        📅 数据日期:${a.data_date || '2026-08-16'} · v9 ${fmt(a.classified_v9)} + A+B ${fmt(a.classified_ab)} + 专利反查 ${fmt(a.classified_ab_patent)} · high ${fmt(highN)} / medium ${fmt(medN)} / low ${fmt(lowN)}
      </div>
    `;
  }

  // ============================================================
  // 渲染:公司库
  // ============================================================
  function renderCompanies() {
    // 解析 URL 参数 (只在路由跳转 / URL 变化时读一次, 避免 sidebar/chip 操作被覆盖)
    const currentHash = location.hash;
    if (state._lastCompaniesHash !== currentHash) {
      state._lastCompaniesHash = currentHash;
      const params = new URLSearchParams(currentHash.split('?')[1] || '');
      const filterType = params.get('filter');
      const trackParam = params.get('track');
      const confParam = params.get('conf');
      if (trackParam !== null) state.filter.track = trackParam;
      if (params.has('conf')) state.filter.confidence = confParam;
      else if (!filterType && !trackParam) state.filter.confidence = '';
      if (params.has('chain')) state.filter.chain = params.get('chain');
      else if (!filterType && !trackParam) state.filter.chain = '';
      if (params.has('sub')) state.filter.sub = params.get('sub');
      else if (!filterType && !trackParam) state.filter.sub = '';
      if (params.has('custInd')) state.filter.custInd = params.get('custInd');
      else if (!filterType && !trackParam) state.filter.custInd = '';
      if (params.has('supInd')) state.filter.supInd = params.get('supInd');
      else if (!filterType && !trackParam) state.filter.supInd = '';
      if (params.has('emp')) state.filter.emp = params.get('emp');
      else if (!filterType && !trackParam) state.filter.emp = '';

      // 重置筛选(从首页进来时)
      if (filterType === 'classified') {
        state.filter.track = '';
        state.filter.q = '已分类';
      } else if (filterType === 'unclassified') {
        state.filter.track = '';
        state.filter.q = '';
      }
    }

    const a = Aggregates;
    const cf = a.confidence || {};

    // 顶部筛选摘要: 已应用的筛选条件 (chips 形式可点 X 移除单个)
    const activeChips = [];
    if (state.filter.q) activeChips.push({ key: 'q', label: `搜索:${state.filter.q}` });
    if (state.filter.track) activeChips.push({ key: 'track', label: `赛道:${state.filter.track}` });
    if (state.filter.sub) activeChips.push({ key: 'sub', label: `子赛道:${state.filter.sub}` });
    if (state.filter.confidence) activeChips.push({ key: 'confidence', label: `置信度:${state.filter.confidence}` });
    if (state.filter.chain) activeChips.push({ key: 'chain', label: `链主:${state.filter.chain === 'yes' ? '有' : '无'}` });
    if (state.filter.custInd) activeChips.push({ key: 'custInd', label: `客户:${state.filter.custInd}` });
    if (state.filter.supInd) activeChips.push({ key: 'supInd', label: `供应商:${state.filter.supInd}` });
    if (state.filter.dist) activeChips.push({ key: 'dist', label: `区县:${state.filter.dist}` });
    if (state.filter.emp) activeChips.push({ key: 'emp', label: `规模:${state.filter.emp}` });

    $('#app').innerHTML = `
      <h1 class="page-title">🏢 公司库</h1>
      <p class="page-sub">${fmt(Companies.length)} 家公司 · 筛选 → 点击看画像卡</p>

      <div class="companies-layout">
        <aside class="filter-panel">
          <input type="search" id="filterSearch" class="filter-search" placeholder="搜索企业名/法人/地址..." value="${esc(state.filter.q)}">

          <div class="filter-group">
            <div class="filter-group-title">主营赛道</div>
            <div class="filter-chips">
              <span class="filter-chip ${!state.filter.track ? 'active' : ''}" data-filter="track" data-val="">全部</span>
              ${a.tracks.map(t => `
                <span class="filter-chip ${state.filter.track === t.name ? 'active' : ''}" data-filter="track" data-val="${esc(t.name)}">${t.emoji} ${esc(t.name)} (${t.classified_count})</span>
              `).join('')}
            </div>
          </div>

          ${state.filter.track && SubTracks.find(m => m.name === state.filter.track && m.subs && m.subs.length > 0) ? `
          <div class="filter-group">
            <div class="filter-group-title">📂 子赛道 · ${esc(state.filter.track)}</div>
            <div class="filter-chips">
              <span class="filter-chip ${!state.filter.sub ? 'active' : ''}" data-filter="sub" data-val="">全部</span>
              ${(SubTracks.find(m => m.name === state.filter.track).subs || []).map(s => `
                <span class="filter-chip ${state.filter.sub === s.name ? 'active' : ''}" data-filter="sub" data-val="${esc(s.name)}">${esc(s.name)} (${s.count})</span>
              `).join('')}
            </div>
          </div>
          ` : ''}

          <div class="filter-group">
            <div class="filter-group-title">分类置信度</div>
            <div class="filter-chips">
              <span class="filter-chip ${!state.filter.confidence ? 'active' : ''}" data-filter="confidence" data-val="">全部</span>
              <span class="filter-chip ${state.filter.confidence === 'high' ? 'active' : ''}" data-filter="confidence" data-val="high" style="${state.filter.confidence === 'high' ? '' : 'color:var(--good)'}">⭐ 高 (${cf.high || 0})</span>
              <span class="filter-chip ${state.filter.confidence === 'medium' ? 'active' : ''}" data-filter="confidence" data-val="medium" style="${state.filter.confidence === 'medium' ? '' : 'color:var(--accent)'}">中 (${cf.medium || 0})</span>
              <span class="filter-chip ${state.filter.confidence === 'low' ? 'active' : ''}" data-filter="confidence" data-val="low" style="${state.filter.confidence === 'low' ? '' : 'color:var(--warn)'}">低 (${cf.low || 0})</span>
              <span class="filter-chip ${state.filter.confidence === 'none' ? 'active' : ''}" data-filter="confidence" data-val="none">空 (${a.unclassified || 0})</span>
            </div>
          </div>

          <div class="filter-group">
            <div class="filter-group-title">链主角色</div>
            <div class="filter-chips">
              <span class="filter-chip ${!state.filter.chain ? 'active' : ''}" data-filter="chain" data-val="">全部</span>
              <span class="filter-chip ${state.filter.chain === 'yes' ? 'active' : ''}" data-filter="chain" data-val="yes">�️ 有 (${Companies.filter(c => (c.chain_role || []).length > 0).length})</span>
              <span class="filter-chip ${state.filter.chain === 'no' ? 'active' : ''}" data-filter="chain" data-val="no">无</span>
            </div>
          </div>

          $1

          ${a.customer_industries && a.customer_industries.length > 0 ? `
          <div class="filter-group">
            <div class="filter-group-title">🎯 客户行业 (拓客渠道)</div>
            <div class="filter-chips">
              <span class="filter-chip ${!state.filter.custInd ? 'active' : ''}" data-filter="custInd" data-val="">全部</span>
              ${a.customer_industries.slice(0, 12).map(i => `
                <span class="filter-chip ${state.filter.custInd === i.name ? 'active' : ''}" data-filter="custInd" data-val="${esc(i.name)}" title="${i.count} 家企业把这个行业作为客户">${esc(i.name)} (${i.count})</span>
              `).join('')}
            </div>
          </div>
          ` : ''}

          ${a.supplier_industries && a.supplier_industries.length > 0 ? `
          <div class="filter-group">
            <div class="filter-group-title">⛏ 供应商行业 (上游产品)</div>
            <div class="filter-chips">
              <span class="filter-chip ${!state.filter.supInd ? 'active' : ''}" data-filter="supInd" data-val="">全部</span>
              ${a.supplier_industries.slice(0, 12).map(i => `
                <span class="filter-chip ${state.filter.supInd === i.name ? 'active' : ''}" data-filter="supInd" data-val="${esc(i.name)}" title="${i.count} 家企业从这个行业采购">${esc(i.name)} (${i.count})</span>
              `).join('')}
            </div>
          </div>
          ` : ''}

          <div class="filter-group">
            <div class="filter-group-title">区县</div>
            <div class="filter-chips">
              <span class="filter-chip ${!state.filter.dist ? 'active' : ''}" data-filter="dist" data-val="">全部</span>
              ${a.districts.slice(0, 10).map(d => `
                <span class="filter-chip ${state.filter.dist === d.name ? 'active' : ''}" data-filter="dist" data-val="${esc(d.name)}">${esc(d.name)} (${d.count})</span>
              `).join('')}
            </div>
          </div>

          <button class="btn" id="resetFilter" style="width:100%;margin-top:8px">重置筛选</button>
        </aside>

        <div>
          <!-- 列表上方筛选摘要:搜索 + 已应用筛选 chips -->
          <div class="companies-filter-summary">
            <input type="search" id="topSearch" class="companies-top-search" placeholder="🔍 搜索企业名/法人/地址..." value="${esc(state.filter.q)}">
            <div class="active-filters">
              ${activeChips.map(chip => `<span class="active-filter-chip" data-clear="${chip.key}">${esc(chip.label)} ✕</span>`).join('')}
              ${activeChips.length > 0 ? `<button class="btn" id="clearAllFilters" style="padding:4px 10px;font-size:11px">清空全部</button>` : ''}
              ${activeChips.length === 0 ? '<span style="color:var(--text-3);font-size:12px;padding:6px">未筛选 · 左侧面板可设详细筛选</span>' : ''}
            </div>
          </div>

          <!-- 工具栏:全选 + 批量 + 翻页 -->
          <div class="table-toolbar">
            <div style="display:flex;align-items:center;gap:12px">
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px">
                <input type="checkbox" id="selectAll">
                <span>全选当前页</span>
              </label>
              <span class="table-count" id="tableCount">加载中...</span>
              <span class="table-count" id="selCount" style="${state.companiesSelection.size > 0 ? 'color:var(--accent);font-weight:600' : ''}">
                已选 ${state.companiesSelection.size} 家
              </span>
            </div>
            <div style="display:flex;gap:6px;align-items:center">
              <button class="btn" id="bulkAddVisits" ${state.companiesSelection.size === 0 ? 'disabled' : ''} title="将选中的企业加入拜访清单">⭐ 批量加入清单 (${state.companiesSelection.size})</button>
              <button class="btn" id="exportSelected" ${state.companiesSelection.size === 0 ? 'disabled' : ''} title="导出选中的企业">📥 导出选中 CSV</button>
            </div>
            <div class="table-pager">
              <button id="prevPage">‹ 上一页</button>
              <span class="page-info" id="pageInfo">1/1</span>
              <button id="nextPage">下一页 ›</button>
            </div>
          </div>
          <div class="table-wrap">
            <table id="companiesTable">
              <thead id="companiesHead"></thead>
              <tbody id="companiesBody"></tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // 绑定
    bindFilterEvents();
    bindTablePagerEvents();
    bindCompaniesToolbarEvents();
    renderTable();
  }

  function bindFilterEvents() {
    // 用事件委托(防止 chip 重新渲染后丢失监听)
    const panel = document.querySelector('.filter-panel');
    if (!panel || panel._chipBound) return;
    panel._chipBound = true;

    // chip 点击
    panel.addEventListener('click', (e) => {
      const chip = e.target.closest('.filter-chip');
      if (chip) {
        const filter = chip.dataset.filter;
        const val = chip.dataset.val;
        if (filter) {
          if (state.filter[filter] === val && val !== '') {
            state.filter[filter] = '';
          } else {
            state.filter[filter] = val;
          }
          state.page = 1;
          renderCompanies();
          requestAnimationFrame(() => {
            const table = document.querySelector('.table-wrap');
            if (table) {
              try {
                table.scrollIntoView({ behavior: 'smooth', block: 'start' });
              } catch (e) {
                // fallback
                const rect = table.getBoundingClientRect();
                window.scrollTo({ top: window.scrollY + rect.top - 80, behavior: 'smooth' });
              }
            }
          });
        }
        return;
      }
      // 重置
      if (e.target.id === 'resetFilter') {
        state.filter = { track: '', sub: '', ind: '', custInd: '', supInd: '', dist: '', city: '', emp: '', scale: '', status: '', confidence: '', chain: '', q: '' };
        state.page = 1;
        renderCompanies();
        e.preventDefault();
        return;
      }
    });

    // 搜索(需要 input 事件)
    const search = panel.querySelector('#filterSearch');
    if (search) {
      search.addEventListener('input', debounce(() => {
        state.filter.q = search.value.trim();
        state.page = 1;
        renderTable();
      }, 200));
    }
  }

  // ============================================================
  // Bug 1 修复: 翻页按钮在 .table-toolbar(不在 .filter-panel),
  // 单独委托。否则 click 永远到不了 listener,翻页看起来"坏掉"。
  // ============================================================
  function bindTablePagerEvents() {
    const toolbar = document.querySelector('.table-toolbar');
    if (!toolbar || toolbar._pagerBound) return;
    toolbar._pagerBound = true;
    toolbar.addEventListener('click', (e) => {
      if (e.target.id === 'prevPage') {
        if (state.page > 1) { state.page--; renderTable(); }
        return;
      }
      if (e.target.id === 'nextPage') {
        state.page++; renderTable();
        return;
      }
    });
  }

  // ============================================================
  // 公司库事件绑定
  //   bindCompaniesToolbarEvents() - 持久元素 (renderCompanies 一次性绑)
  //   bindCompaniesTableEvents()   - 动态元素 (renderTable 每次重渲染绑)
  // ============================================================

  function bindCompaniesTableEvents() {
    // 行 checkbox(renderTable 每次重写 tbody)
    document.querySelectorAll('.row-check').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const code = e.target.dataset.code;
        const tr = e.target.closest('tr');
        if (e.target.checked) {
          state.companiesSelection.add(code);
          tr?.classList.add('selected');
        } else {
          state.companiesSelection.delete(code);
          tr?.classList.remove('selected');
        }
        syncCompaniesSelCount();
      });
    });

    // 表头全选(thead 也被 renderTable 重写)
    function togglePageSelectAll(checked) {
      const trs = document.querySelectorAll('#companiesBody tr');
      trs.forEach(tr => {
        const code = tr.dataset.code;
        if (!code) return;
        const cb = tr.querySelector('.row-check');
        if (checked) {
          state.companiesSelection.add(code);
          if (cb) cb.checked = true;
          tr.classList.add('selected');
        } else {
          state.companiesSelection.delete(code);
          if (cb) cb.checked = false;
          tr.classList.remove('selected');
        }
      });
      syncCompaniesSelCount();
    }
    $('#selectAllHead')?.addEventListener('change', (e) => togglePageSelectAll(e.target.checked));
  }

  function bindCompaniesToolbarEvents() {
    // 顶部全选 checkbox (在工具栏,不重写)
    $('#selectAll')?.addEventListener('change', (e) => {
      const trs = document.querySelectorAll('#companiesBody tr');
      trs.forEach(tr => {
        const code = tr.dataset.code;
        if (!code) return;
        const cb = tr.querySelector('.row-check');
        if (e.target.checked) {
          state.companiesSelection.add(code);
          if (cb) cb.checked = true;
          tr.classList.add('selected');
        } else {
          state.companiesSelection.delete(code);
          if (cb) cb.checked = false;
          tr.classList.remove('selected');
        }
      });
      syncCompaniesSelCount();
    });

    // 批量加入拜访清单
    $('#bulkAddVisits')?.addEventListener('click', () => {
      const codes = Array.from(state.companiesSelection);
      if (codes.length === 0) return;
      let added = 0;
      for (const code of codes) {
        if (!state.visits.includes(code)) {
          state.visits.push(code);
          added++;
        }
      }
      localStorage.setItem('workbench-visits', JSON.stringify(state.visits));
      updateVisitBadge();
      const btn = $('#bulkAddVisits');
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = `✅ 已加 ${added} 家 · 合计 ${state.visits.length}`;
        setTimeout(() => { btn.textContent = orig; syncCompaniesSelCount(); }, 1500);
      }
      renderTable(); // ⭐ 状态变化,重渲染表格
    });

    // 导出选中 CSV (复用 visits 页的导出函数)
    $('#exportSelected')?.addEventListener('click', () => {
      const items = Array.from(state.companiesSelection).map(code => byCode[code]).filter(Boolean);
      if (items.length === 0) return;
      if (typeof exportVisitsCSV === 'function') {
        exportVisitsCSV(items, 'selected');
      }
    });

    // 顶部搜索框 (与左侧 #filterSearch 同步)
    const topSearch = $('#topSearch');
    if (topSearch && !topSearch._bound) {
      topSearch._bound = true;
      topSearch.addEventListener('input', debounce(() => {
        state.filter.q = topSearch.value.trim();
        state.page = 1;
        const sidebarSearch = $('#filterSearch');
        if (sidebarSearch) sidebarSearch.value = state.filter.q;
        renderTable();
        renderCompaniesRefresh();
      }, 200));
    }

    // 单个清除 chip + 全部清空 (active-filters 在 renderCompanies/renderCompaniesRefresh 重写后调用)
    bindActiveFilterEvents();
  }

  function bindActiveFilterEvents() {
    document.querySelectorAll('[data-clear]').forEach(chip => {
      chip.addEventListener('click', () => {
        const key = chip.dataset.clear;
        if (key === 'q') state.filter.q = '';
        else state.filter[key] = '';
        state.page = 1;
        renderCompanies();
      });
    });
    $('#clearAllFilters')?.addEventListener('click', () => {
      state.filter = { track: '', sub: '', ind: '', custInd: '', supInd: '', dist: '', city: '', emp: '', scale: '', status: '', confidence: '', chain: '', q: '' };
      state.page = 1;
      renderCompanies();
    });
  }

  function syncCompaniesSelCount() {
    const selCount = $('#selCount');
    if (selCount) {
      selCount.textContent = `已选 ${state.companiesSelection.size} 家`;
      selCount.style.color = state.companiesSelection.size > 0 ? 'var(--accent)' : '';
      selCount.style.fontWeight = state.companiesSelection.size > 0 ? '600' : '';
    }
    // 顶部 + 表头全选 checkbox 联动状态
    const pageTrs = document.querySelectorAll('#companiesBody tr');
    const pageCodes = Array.from(pageTrs).map(tr => tr.dataset.code).filter(Boolean);
    const pageSel = pageCodes.filter(c => state.companiesSelection.has(c)).length;
    const allSelected = pageCodes.length > 0 && pageSel === pageCodes.length;
    const someSelected = pageSel > 0 && !allSelected;
    [document.getElementById('selectAll'), document.getElementById('selectAllHead')].forEach(el => {
      if (!el) return;
      el.checked = allSelected;
      el.indeterminate = someSelected;
    });
    const bulkBtn = document.getElementById('bulkAddVisits');
    if (bulkBtn) {
      bulkBtn.disabled = state.companiesSelection.size === 0;
      if (!bulkBtn.textContent.startsWith('✅')) bulkBtn.textContent = `⭐ 批量加入清单 (${state.companiesSelection.size})`;
    }
    const expBtn = document.getElementById('exportSelected');
    if (expBtn) expBtn.disabled = state.companiesSelection.size === 0;
  }

  // 轻量重渲染: 只刷新筛选摘要条,不重渲染整页
  function renderCompaniesRefresh() {
    const activeChips = buildActiveChips();
    const af = document.querySelector('.active-filters');
    if (af) {
      af.innerHTML = activeChips.map(chip =>
        `<span class="active-filter-chip" data-clear="${chip.key}">${esc(chip.label)} ✕</span>`
      ).join('') + (activeChips.length > 0
        ? `<button class="btn" id="clearAllFilters" style="padding:4px 10px;font-size:11px">清空全部</button>`
        : '<span style="color:var(--text-3);font-size:12px;padding:6px">未筛选 · 左侧面板可设详细筛选</span>');
      bindActiveFilterEvents();
    }
    const sidebarSearch = document.getElementById('filterSearch');
    if (sidebarSearch) sidebarSearch.value = state.filter.q;
  }

  function buildActiveChips() {
    const chips = [];
    if (state.filter.q) chips.push({ key: 'q', label: `搜索:${state.filter.q}` });
    if (state.filter.track) chips.push({ key: 'track', label: `赛道:${state.filter.track}` });
    if (state.filter.sub) chips.push({ key: 'sub', label: `子赛道:${state.filter.sub}` });
    if (state.filter.confidence) chips.push({ key: 'confidence', label: `置信度:${state.filter.confidence}` });
    if (state.filter.chain) chips.push({ key: 'chain', label: `链主:${state.filter.chain === 'yes' ? '有' : '无'}` });
    if (state.filter.custInd) chips.push({ key: 'custInd', label: `客户:${state.filter.custInd}` });
    if (state.filter.supInd) chips.push({ key: 'supInd', label: `供应商:${state.filter.supInd}` });
    if (state.filter.dist) chips.push({ key: 'dist', label: `区县:${state.filter.dist}` });
    if (state.filter.emp) chips.push({ key: 'emp', label: `规模:${state.filter.emp}` });
    return chips;
  }

  function applyFilter() {
    const f = state.filter;
    return Companies.filter(c => {
      if (f.track && c.trk !== f.track) return false;
      if (f.sub && c.sub_track !== f.sub) return false;
      if (f.ind && c.ind !== f.ind) return false;
      if (f.custInd && !(c.customer_ind || []).some(i => i.name === f.custInd)) return false;
      if (f.supInd && !(c.supplier_ind || []).some(i => i.name === f.supInd)) return false;
      if (f.emp) {
        const e = c.emp;
        const range = f.emp;
        if (range === 'unknown' && e != null) return false;
        if (range !== 'unknown' && e == null) return false;
        if (range === '0' && e !== 0) return false;
        if (range === '1-10' && (e == null || e < 1 || e > 10)) return false;
        if (range === '11-50' && (e == null || e < 11 || e > 50)) return false;
        if (range === '51-200' && (e == null || e < 51 || e > 200)) return false;
        if (range === '201-500' && (e == null || e < 201 || e > 500)) return false;
        if (range === '501-1000' && (e == null || e < 501 || e > 1000)) return false;
        if (range === '1001+' && (e == null || e <= 1000)) return false;
      }
      if (f.dist && c.dist !== f.dist) return false;
      if (f.city && c.city !== f.city) return false;
      if (f.scale && c.scale !== f.scale) return false;
      if (f.status && c.status !== f.status) return false;
      if (f.confidence) {
        const conf = c.confidence || '';
        if (f.confidence === 'none' && c.trk) return false;
        if (f.confidence !== 'none' && conf !== f.confidence) return false;
      }
      if (f.chain === 'yes' && (!c.chain_role || c.chain_role.length === 0)) return false;
      if (f.chain === 'no' && c.chain_role && c.chain_role.length > 0) return false;
      if (f.q) {
        const q = f.q.toLowerCase();
        if (!c.name.toLowerCase().includes(q) &&
            !(c.legal || '').toLowerCase().includes(q) &&
            !(c.addr || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }

  function renderTable() {
    const list = applyFilter();
    const totalPages = Math.max(1, Math.ceil(list.length / state.perPage));
    if (state.page > totalPages) state.page = totalPages;
    const start = (state.page - 1) * state.perPage;
    const pageItems = list.slice(start, start + state.perPage);

    $('#tableCount').textContent = `共 ${list.length.toLocaleString()} 家 · 第 ${state.page}/${totalPages} 页`;
    $('#pageInfo').textContent = `${state.page}/${totalPages}`;
    $('#prevPage').disabled = state.page <= 1;
    $('#nextPage').disabled = state.page >= totalPages;

    // 表头(原代码是空的,这是 bug)
    $('#companiesHead').innerHTML = `
      <tr>
        <th style="width:32px;text-align:center"><input type="checkbox" id="selectAllHead"></th>
        <th style="width:32px;text-align:center">⭐</th>
        <th>公司名</th>
        <th>赛道</th>
        <th>子赛道</th>
        <th>置信度</th>
        <th>链主</th>
        <th>行业大类</th>
        <th>区县</th>
        <th>注册资本</th>
        <th>员工</th>
        <th>科创分</th>
        <th>电话</th>
      </tr>
    `;

    if (pageItems.length === 0) {
      $('#companiesBody').innerHTML = `<tr><td colspan="13" style="text-align:center;color:var(--text-3);padding:32px">无匹配结果</td></tr>`;
      // 同步表头全选状态(当前页空,全选 unchecked)
      const sa = $('#selectAll'); if (sa) { sa.checked = false; sa.indeterminate = false; }
      const sah = $('#selectAllHead'); if (sah) { sah.checked = false; sah.indeterminate = false; }
      return;
    }

    const pageCodes = pageItems.map(c => c.code);
    const pageSelectedCount = pageCodes.filter(c => state.companiesSelection.has(c)).length;
    const allPageSelected = pageSelectedCount === pageCodes.length;
    const somePageSelected = pageSelectedCount > 0 && !allPageSelected;

    // 表头全选 checkbox 同步状态
    const sa = $('#selectAll');
    const sah = $('#selectAllHead');
    if (sa) { sa.checked = allPageSelected; sa.indeterminate = somePageSelected; }
    if (sah) { sah.checked = allPageSelected; sah.indeterminate = somePageSelected; }

    $('#companiesBody').innerHTML = pageItems.map(c => {
      const conf = c.confidence || '';
      const confColor = conf === 'high' ? 'var(--good)' : (conf === 'medium' ? 'var(--accent)' : (conf === 'low' ? 'var(--warn)' : 'var(--text-3)'));
      const confLabel = conf === 'high' ? '高' : (conf === 'medium' ? '中' : (conf === 'low' ? '低' : '-'));
      const checked = state.companiesSelection.has(c.code);
      return `
      <tr data-code="${esc(c.code)}" class="${checked ? 'selected' : ''}">
        <td style="text-align:center"><input type="checkbox" class="row-check" data-code="${esc(c.code)}" ${checked ? 'checked' : ''}></td>
        <td style="text-align:center">${isVisited(c.code) ? '⭐' : '<span style="color:var(--text-3)">·</span>'}</td>
        <td><strong>${esc(c.name)}</strong></td>
        <td>${c.trk ? `<span class="track-tag">${esc(c.trk)}</span>` : '<span class="track-tag unclassified">未分类</span>'}</td>
        <td style="font-size:11px;color:${c.sub_track ? 'var(--accent)' : 'var(--text-3)'}">${esc(c.sub_track || '-')}</td>
        <td style="font-size:11px;color:${confColor}">${confLabel}</td>
        <td style="font-size:11px">${(c.chain_role || []).length > 0 ? `<span style="color:var(--accent)">🕸️ ${c.chain_role.length}</span>` : '<span style="color:var(--text-3)">-</span>'}</td>
        <td style="color:var(--text-2);font-size:11px;line-height:1.3"><div>${esc(c.ind || '-')}</div><div style="color:var(--text-3);font-size:10px">${esc((c.ind_zl || '').slice(0, 14))}</div></td>
        <td>${esc(c.dist || '-')}</td>
        <td class="rc-tag">${fmtWan(c.rc)}</td>
        <td style="color:${c.emp && c.emp > 0 ? (c.emp >= 100 ? 'var(--accent)' : 'var(--text)') : 'var(--text-3)'};font-family:monospace;font-size:12px">${c.emp != null ? c.emp : '-'}</td>
        <td style="color:${c.sci && Number(c.sci) >= 70 ? 'var(--good)' : 'var(--text-3)'}">${c.sci || '-'}</td>
        <td style="font-family:monospace;font-size:12px;color:${c.phone ? 'var(--text)' : 'var(--text-3)'}">${c.phone ? esc(c.phone.split(/[;,]/)[0].trim()) : '-'}</td>
      </tr>
    `;
    }).join('');

    $$('#companiesBody tr').forEach(tr => {
      tr.addEventListener('click', (e) => {
        // 如果点的是 checkbox,不走企业详情 (checkbox 自己处理选中)
        if (e.target.classList.contains('row-check')) return;
        const code = tr.dataset.code;
        if (e.target.textContent.includes('⭐')) {
          e.stopPropagation();
          toggleVisit(code);
          renderTable();
          return;
        }
        showDetail(code);
      });
    });

    // 行 checkbox 事件(renderTable() 会重写 tbody, 需重新绑)
    bindCompaniesTableEvents();
  }

  // ============================================================
  // 渲染:三圈重叠
  // ============================================================
  function renderOverlap() {
    // 计算清单进度(过滤空 code,避免垃圾数据)
    const validCodes = Overlap28.map(o => o.code).filter(c => c && c.length > 0);
    const invalidCount = Overlap28.length - validCodes.length;
    const inList = validCodes.filter(c => state.visits.includes(c));
    const notInList = validCodes.filter(c => !state.visits.includes(c));
    const allInList = validCodes.length > 0 && inList.length === validCodes.length;
    const batchBtnLabel = allInList
      ? `🗑 全部移出拜访清单 (${validCodes.length})`
      : `⭐ 一键加入拜访清单 (${notInList.length}/${validCodes.length})`;
    const batchBtnClass = allInList ? 'btn btn-warn' : 'btn btn-primary';

    $('#app').innerHTML = `
      <h1 class="page-title">⭐ 三圈重叠 · 高质量线索</h1>
      <p class="page-sub">国家级专精特新 ∩ 5000 专精特新 ∩ 深圳高企 · 三重认定 · <strong>${Overlap28.length} 家</strong></p>

      <div style="background:var(--bg-2);border:1px solid var(--accent);border-radius:8px;padding:16px;margin-bottom:20px;font-size:13px;color:var(--text-2)">
        💡 <strong style="color:var(--accent)">这 28 家</strong>经过三重官方认定,直接优先拜访。建议:打第一通电话前,先用画像卡扫一眼注册资本/科创分/专利。
      </div>

      <!-- 顶部批量操作栏 -->
      <div class="table-toolbar" style="margin-bottom:12px">
        <div>
          <span class="table-count">
            清单中已加 <strong style="color:${inList.length > 0 ? 'var(--good)' : 'var(--text-3)'}">${inList.length}</strong> / ${validCodes.length} 家${invalidCount > 0 ? ` <span style="color:var(--warn)" title="主表中未匹配, 无法加清单">⚠️ ${invalidCount} 家无 code</span>` : ''}
          </span>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="${batchBtnClass}" id="overlapBatchToggle">${batchBtnLabel}</button>
          <a class="btn" href="#/visits">查看拜访清单 →</a>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>企业名称</th>
              <th>行业大类</th>
              <th>区县</th>
              <th>注册资本</th>
              <th>参保</th>
              <th>科创分</th>
              <th>专利</th>
              <th>主营产品</th>
              <th>电话</th>
              <th>清单</th>
            </tr>
          </thead>
          <tbody>
            ${Overlap28.map(o => {
              const hasCode = o.code && o.code.length > 0;
              const visited = hasCode && isVisited(o.code);
              return `
              <tr data-code="${esc(o.code || '')}" class="${visited ? 'selected' : ''}">
                <td style="color:var(--accent);font-weight:600">${o.rank}</td>
                <td><strong>${esc(o.name)}</strong></td>
                <td style="font-size:12px;color:var(--text-2)">${esc(o.ind || '-')}</td>
                <td>${esc(o.dist || '-')}</td>
                <td class="rc-tag">${fmtWan(o.rc)}</td>
                <td>${o.emp || '-'}</td>
                <td style="color:${o.sci && o.sci >= 70 ? 'var(--good)' : 'var(--text-2)'}">${o.sci || '-'}</td>
                <td>${o.pat || '-'}</td>
                <td style="font-size:11px;color:var(--text-2)">${esc(o.product || '-')}</td>
                <td style="font-family:monospace;font-size:12px">${o.phone ? esc(o.phone.split(/[;,]/)[0].trim()) : '-'}</td>
                <td>${hasCode ? `<button class="btn-v9 ${visited ? 'btn-skip' : 'btn-adopt'}" data-visit-toggle="${esc(o.code)}" title="${visited ? '从清单移除' : '加入拜访清单'}">${visited ? '✓' : '⭐'}</button>` : '<span style="color:var(--warn);font-size:11px" title="主表中未匹配,无法加清单">⚠</span>'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    // 行点击 → 详情
    $$('tbody tr').forEach(tr => {
      tr.addEventListener('click', (e) => {
        // 点 ⭐ 按钮 → 切换拜访清单(不打开详情)
        if (e.target.dataset.visitToggle !== undefined) {
          e.stopPropagation();
          toggleVisit(e.target.dataset.visitToggle);
          renderOverlap();
          return;
        }
        showDetail(tr.dataset.code);
      });
    });

    // 批量切换按钮
    $('#overlapBatchToggle')?.addEventListener('click', () => {
      if (allInList) {
        if (!confirm(`从拜访清单移出 ${validCodes.length} 家三圈重叠企业?\n\n(只从清单移除,不改其他状态)`)) return;
        for (const code of validCodes) {
          if (state.visits.includes(code)) {
            const i = state.visits.indexOf(code);
            state.visits.splice(i, 1);
          }
        }
        localStorage.setItem('workbench-visits', JSON.stringify(state.visits));
        updateVisitBadge();
        renderOverlap();
      } else {
        if (!confirm(`将 ${notInList.length} 家未在清单的三圈重叠企业加入拜访清单?`)) return;
        for (const code of notInList) {
          if (!state.visits.includes(code)) state.visits.push(code);
        }
        localStorage.setItem('workbench-visits', JSON.stringify(state.visits));
        updateVisitBadge();
        renderOverlap();
      }
    });
  }

  // ============================================================
  // 渲染:公私联动池 (4097 家科创企业_分类v2)
  // ============================================================
  function renderTechV2() {
    // 状态：tech-v2 页面专用筛选
    if (!state.techV2Filter) state.techV2Filter = { track: '', linkage: '', policy: '', dist: '', emp: '', q: '', sort: 'priority' };
    if (!state.techV2Page) state.techV2Page = 1;
    const perPage = 30;

    // 统计
    const total = TechV2.length;
    const linkedRM = TechV2.filter(c => c.rm).length;
    const hasBranch = TechV2.filter(c => c.rm_branch && !c.rm).length;
    const linkedAny = TechV2.filter(c => c.rm || c.rm_branch).length;
    const hightech = TechV2.filter(c => c.is_hightech).length;
    const specialized = TechV2.filter(c => c.is_specialized).length;
    const pevc = TechV2.filter(c => c.is_pevc).length;
    const newkinetic = TechV2.filter(c => c.is_newkinetic).length;
    const strategicLevel = TechV2.filter(c => c.newkinetic_level === '战略层').length;
    const noAccount = TechV2.filter(c => !c.has_account).length;
    const priorityTop = TechV2.filter(c => (c.banking_priority || 0) >= 80).length;
    const priorityHigh = TechV2.filter(c => (c.banking_priority || 0) >= 60 && (c.banking_priority || 0) < 80).length;

    // 过滤
    let filtered = TechV2.slice();
    const f = state.techV2Filter;
    if (f.track) filtered = filtered.filter(c => c.trk === f.track);
    if (f.linkage === 'rm') filtered = filtered.filter(c => c.rm);
    else if (f.linkage === 'branch') filtered = filtered.filter(c => c.rm_branch && !c.rm);
    else if (f.linkage === 'none') filtered = filtered.filter(c => !c.rm && !c.rm_branch);
    if (f.policy === 'specialized') filtered = filtered.filter(c => c.is_specialized);
    else if (f.policy === 'hightech') filtered = filtered.filter(c => c.is_hightech);
    else if (f.policy === 'pevc') filtered = filtered.filter(c => c.is_pevc);
    else if (f.policy === 'newkinetic') filtered = filtered.filter(c => c.is_newkinetic);
    else if (f.policy === 'none') filtered = filtered.filter(c => !c.is_hightech && !c.is_specialized && !c.is_pevc && !c.is_newkinetic);
    if (f.dist) filtered = filtered.filter(c => c.dist === f.dist);
    if (f.emp === '500') filtered = filtered.filter(c => (c.emp || 0) >= 500);
    else if (f.emp === '200') filtered = filtered.filter(c => (c.emp || 0) >= 200);
    else if (f.emp === '100') filtered = filtered.filter(c => (c.emp || 0) >= 100);
    else if (f.emp === '50') filtered = filtered.filter(c => (c.emp || 0) >= 50);
    else if (f.emp === '10') filtered = filtered.filter(c => (c.emp || 0) >= 10);
    else if (f.emp === 'has') filtered = filtered.filter(c => (c.emp || 0) > 0);
    if (f.q) {
      const q = f.q.toLowerCase();
      filtered = filtered.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.legal || '').toLowerCase().includes(q) ||
        (c.biz || '').toLowerCase().includes(q)
      );
    }

    // 按 banking_priority 倒序 (可选 emp)
    if (f.sort === 'emp') {
      filtered.sort((a, b) => (b.emp || 0) - (a.emp || 0) || (b.banking_priority || 0) - (a.banking_priority || 0));
    } else {
      filtered.sort((a, b) => (b.banking_priority || 0) - (a.banking_priority || 0));
    }

    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    if (state.techV2Page > totalPages) state.techV2Page = totalPages;
    const start = (state.techV2Page - 1) * perPage;
    const pageItems = filtered.slice(start, start + perPage);

    // 跑道 emoji + 优先级 badge
    const TRACK_EMOJI_MAP = {
      '软件/SaaS': '💻', '供应链-电子': '🔌', '供应链-精密': '⚙️', '半导体': '🔬',
      '化工/新材料': '🧪', '新能源/储能': '🔋', '检测/认证': '🔍', '通信': '📡',
      '医疗器械': '🏥', '消费升级': '🛍️', '机器人/AI': '🤖', '汽车': '🚗',
      '印刷包装': '🖨️',
      '生物医药': '💊', '其他': '📦',
    };
    const TRACK_PRIORITY = {
      '软件/SaaS': 'S', '半导体': 'S', '通信': 'S', '医疗器械': 'S', '生物医药': 'S',
      '机器人/AI': 'A', '新能源/储能': 'A', '检测/认证': 'A',
      '供应链-电子': 'B', '供应链-精密': 'B', '汽车': 'B', '印刷包装': 'B',
      '化工/新材料': 'C', '消费升级': 'C', '其他': 'C',
    };
    const PRI_COLOR = { S: 'var(--good)', A: 'var(--accent)', B: 'var(--text-2)', C: 'var(--text-3)' };

    // 14 赛道唯一值
    const tracks = Array.from(new Set(TechV2.map(c => c.trk).filter(Boolean))).sort();
    const dists = Array.from(new Set(TechV2.map(c => c.dist).filter(Boolean))).sort();

    $('#app').innerHTML = `
      <h1 class="page-title">🤝 公私联动池 · 科创企业总表_分类v2</h1>
      <p class="page-sub">${fmt(total)} 家宝安科创企业 · 法人都是零售客户 · 按"赛道 × 政策 × 联动"打分选优质</p>

      <!-- 统计卡 -->
      <div class="hero-stats">
        <div class="hero-stat">
          <div class="hero-stat-num">${fmt(total)}</div>
          <div class="hero-stat-label">总量</div>
        </div>
        <div class="hero-stat">
          <div class="hero-stat-num" style="color:var(--good)">${fmt(linkedRM)}</div>
          <div class="hero-stat-label">已挂钩 RM</div>
        </div>
        <div class="hero-stat">
          <div class="hero-stat-num" style="color:var(--good)">${fmt(priorityTop)}</div>
          <div class="hero-stat-label">高分 (≥80)</div>
        </div>
        <div class="hero-stat">
          <div class="hero-stat-num" style="color:var(--warn)">${fmt(noAccount)}</div>
          <div class="hero-stat-label">未开户</div>
        </div>
      </div>

      <div style="background:var(--bg-2);border:1px solid var(--accent);border-radius:8px;padding:14px 16px;margin-bottom:16px;font-size:13px;color:var(--text-2)">
        💡 <strong style="color:var(--accent)">优质分 = 赛道优先级 + 公私联动挂钩 + 政策性标签 + 对公增量空间 + 分类置信度</strong>。高分 (≥80) 含 PEVC/专精特新 + 已挂钩 RM + S 级赛道，几乎可以「打完一通电话、开下一户」；中分 (60-80) 是日常拓客主力。<br>
        📌 <strong style="color:var(--good)">${fmt(specialized)}</strong> 家专精特新 · <strong style="color:var(--good)">${fmt(pevc)}</strong> 家 PEVC 已投 · <strong style="color:var(--good)">${fmt(newkinetic)}</strong> 家新动能（战略层 ${fmt(strategicLevel)}）· <strong style="color:var(--good)">${fmt(hightech)}</strong> 家高新
      </div>

      <!-- 筛选器 -->
      <div class="filter-bar" style="margin-bottom:12px">
        <input type="search" id="tvSearch" class="filter-search" placeholder="搜索企业名/法人/经营范围..." value="${esc(f.q)}" style="min-width:280px">
        <select id="tvTrack" class="filter-search" style="width:160px">
          <option value="">所有赛道</option>
          ${tracks.map(t => `<option value="${esc(t)}" ${f.track === t ? 'selected' : ''}>${TRACK_EMOJI_MAP[t] || '📦'} ${esc(t)}</option>`).join('')}
        </select>
        <select id="tvLinkage" class="filter-search" style="width:160px">
          <option value="">所有联动状态</option>
          <option value="rm" ${f.linkage === 'rm' ? 'selected' : ''}>🤝 有 RM (${linkedRM})</option>
          <option value="branch" ${f.linkage === 'branch' ? 'selected' : ''}>🏦 仅网点 (${hasBranch})</option>
          <option value="none" ${f.linkage === 'none' ? 'selected' : ''}>❓ 未挂钩 (${total - linkedAny})</option>
        </select>
        <select id="tvPolicy" class="filter-search" style="width:140px">
          <option value="">所有政策标签</option>
          <option value="specialized" ${f.policy === 'specialized' ? 'selected' : ''}>🎖️ 专精特新 (${specialized})</option>
          <option value="hightech" ${f.policy === 'hightech' ? 'selected' : ''}>🦄 高新 (${hightech})</option>
          <option value="pevc" ${f.policy === 'pevc' ? 'selected' : ''}>💰 PEVC (${pevc})</option>
          <option value="newkinetic" ${f.policy === 'newkinetic' ? 'selected' : ''}>⚡ 新动能 (${newkinetic})</option>
          <option value="none" ${f.policy === 'none' ? 'selected' : ''}>— 无标签</option>
        </select>
        <select id="tvEmp" class="filter-search" style="width:130px">
          <option value="">员工数 (全部)</option>
          <option value="500" ${f.emp === '500' ? 'selected' : ''}>≥500 人</option>
          <option value="200" ${f.emp === '200' ? 'selected' : ''}>≥200 人</option>
          <option value="100" ${f.emp === '100' ? 'selected' : ''}>≥100 人</option>
          <option value="50" ${f.emp === '50' ? 'selected' : ''}>≥50 人</option>
          <option value="10" ${f.emp === '10' ? 'selected' : ''}>≥10 人</option>
          <option value="has" ${f.emp === 'has' ? 'selected' : ''}>有数据</option>
        </select>
        <select id="tvSort" class="filter-search" style="width:130px">
          <option value="priority" ${f.sort === 'priority' ? 'selected' : ''}>排序: 优质分</option>
          <option value="emp" ${f.sort === 'emp' ? 'selected' : ''}>排序: 员工数</option>
        </select>
        <select id="tvDist" class="filter-search" style="width:120px">
          <option value="">所有区县</option>
          ${dists.map(d => `<option value="${esc(d)}" ${f.dist === d ? 'selected' : ''}>${esc(d)}</option>`).join('')}
        </select>
        <button id="tvReset" class="btn">重置</button>
      </div>

      <!-- 表格 -->
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>分</th>
              <th>赛道</th>
              <th>企业名称</th>
              <th>员工</th>
              <th>法人</th>
              <th>电话</th>
              <th>政策标签</th>
              <th>RM / 网点</th>
              <th>注册资本</th>
              <th>清单</th>
            </tr>
          </thead>
          <tbody>
            ${pageItems.map(c => {
              const visited = isVisited(c.code);
              const pri = TRACK_PRIORITY[c.trk] || 'C';
              const tags = [];
              if (c.is_specialized) tags.push('<span class="badge badge-gold" title="国家级专精特新小巨人">🎖️专精</span>');
              if (c.is_hightech) tags.push('<span class="badge badge-green" title="高新企业">🦄</span>');
              if (c.is_pevc) tags.push('<span class="badge badge-purple" title="PEVC 已投">💰</span>');
              if (c.is_newkinetic) tags.push('<span class="badge badge-blue" title="新动能客群">⚡</span>');
              const tagHtml = tags.length ? tags.join('\n') : '<span style="color:var(--text-3);font-size:11px">—</span>';
              const empVal = c.emp || 0;
              const empColor = empVal >= 200 ? 'var(--good)' : empVal >= 50 ? 'var(--accent)' : empVal >= 10 ? 'var(--text-2)' : 'var(--text-3)';
              const inheritedBadge = c._inherited_from_main ? '<span title="分类继承自主表 v9/ab" style="font-size:10px;color:var(--accent);margin-left:4px">🎯</span>' : '';
              const empDisplay = empVal > 0 ? empVal : '<span style="color:var(--text-3);font-size:11px">—</span>';
              const rmHtml = c.rm
                ? `<div style="font-weight:600;color:var(--good)">🤝 ${esc(c.rm)}</div><div style="font-size:11px;color:var(--text-3)">${esc(c.rm_branch || '')}</div>`
                : c.rm_branch
                  ? `<div style="color:var(--text-2)">🏦 ${esc(c.rm_branch)}</div><div style="font-size:11px;color:var(--warn)">无 RM</div>`
                  : '<div style="color:var(--text-3)">❓ 未挂钩</div>';
              return `
                <tr data-code="${esc(c.code)}" class="${visited ? 'selected' : ''}">
                  <td>
                    <div style="font-size:18px;font-weight:700;color:${c.banking_priority >= 80 ? 'var(--good)' : c.banking_priority >= 60 ? 'var(--accent)' : 'var(--text-2)'}">${c.banking_priority}</div>
                    <div style="font-size:10px;color:${PRI_COLOR[pri]};font-weight:600">${pri} 级</div>
                  </td>
                  <td>
                    <div style="font-size:13px">${TRACK_EMOJI_MAP[c.trk] || '📦'} ${esc(c.trk || '未分')}${inheritedBadge}</div>
                    <div style="font-size:10px;color:var(--text-3)">${esc(c.confidence || '')}${c.method ? ' · ' + esc(c.method.replace('main(', '').replace(')', '')) : ''}</div>
                  </td>
                  <td><strong>${esc(c.name)}</strong><div style="font-size:11px;color:var(--text-3)">${esc(c.dist || '')} · ${esc(c.ind || '')}</div></td>
                  <td style="font-weight:600;color:${empColor};text-align:right;font-variant-numeric:tabular-nums">${empDisplay}</td>
                  <td>${esc(c.legal || '-')}</td>
                  <td style="font-family:monospace;font-size:12px">${esc((c.phone || '').split(/[;,]/)[0].trim() || '-')}</td>
                  <td>${tagHtml}</td>
                  <td>${rmHtml}</td>
                  <td class="rc-tag">${fmtWan(c.rc)}</td>
                  <td><button class="btn-v9 ${visited ? 'btn-skip' : 'btn-adopt'}" data-tv-toggle="${esc(c.code)}" title="${visited ? '从清单移除' : '加入拜访清单'}">${visited ? '✓' : '⭐'}</button></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- 翻页 -->
      <div class="table-toolbar" style="margin-top:12px">
        <div class="table-count">第 ${state.techV2Page} / ${totalPages} 页 · 共 <strong>${fmt(filtered.length)}</strong> 家${f.track || f.linkage || f.policy || f.dist || f.q ? ' <span style="color:var(--accent)">(已筛选)</span>' : ''}</div>
        <div style="display:flex;gap:8px">
          <button class="btn" id="tvPrev" ${state.techV2Page <= 1 ? 'disabled' : ''}>‹ 上一页</button>
          <button class="btn" id="tvNext" ${state.techV2Page >= totalPages ? 'disabled' : ''}>下一页 ›</button>
          <button class="btn btn-warn" id="tvExportAll" title="导出当前筛选结果 CSV">📥 导出 CSV (${fmt(filtered.length)})</button>
        </div>
      </div>

      ${filtered.length === 0 ? '<div style="text-align:center;padding:40px;color:var(--text-3)">无匹配企业·试试重置筛选</div>' : ''}
    `;

    // 绑定
    const debouncedRender = debounce(() => { state.techV2Page = 1; renderTechV2(); }, 200);
    $('#tvSearch').addEventListener('input', e => { state.techV2Filter.q = e.target.value; debouncedRender(); });
    $('#tvTrack').addEventListener('change', e => { state.techV2Filter.track = e.target.value; state.techV2Page = 1; renderTechV2(); });
    $('#tvLinkage').addEventListener('change', e => { state.techV2Filter.linkage = e.target.value; state.techV2Page = 1; renderTechV2(); });
    $('#tvPolicy').addEventListener('change', e => { state.techV2Filter.policy = e.target.value; state.techV2Page = 1; renderTechV2(); });
    $('#tvEmp').addEventListener('change', e => { state.techV2Filter.emp = e.target.value; state.techV2Page = 1; renderTechV2(); });
    $('#tvSort').addEventListener('change', e => { state.techV2Filter.sort = e.target.value; state.techV2Page = 1; renderTechV2(); });
    $('#tvDist').addEventListener('change', e => { state.techV2Filter.dist = e.target.value; state.techV2Page = 1; renderTechV2(); });
    $('#tvReset').addEventListener('click', () => { state.techV2Filter = { track: '', linkage: '', policy: '', dist: '', emp: '', q: '', sort: 'priority' }; state.techV2Page = 1; renderTechV2(); });
    $('#tvPrev')?.addEventListener('click', () => { if (state.techV2Page > 1) { state.techV2Page--; renderTechV2(); } });
    $('#tvNext')?.addEventListener('click', () => { if (state.techV2Page < totalPages) { state.techV2Page++; renderTechV2(); } });

    // 行点击 → 详情
    $$('tbody tr', $('#app')).forEach(tr => {
      tr.addEventListener('click', (e) => {
        if (e.target.dataset.tvToggle !== undefined) {
          e.stopPropagation();
          toggleVisit(e.target.dataset.tvToggle);
          renderTechV2();
          return;
        }
        showTechV2Detail(tr.dataset.code);
      });
    });

    // 导出 CSV
    $('#tvExportAll')?.addEventListener('click', () => {
      exportTechV2CSV(filtered);
    });
  }

  // ============================================================
  // 详情弹窗 (公私联动专用)
  // ============================================================
  function showTechV2Detail(code) {
    const c = TechV2.find(x => x.code === code);
    if (!c) return;

    const tags = [];
    if (c.is_specialized) tags.push('<span class="badge badge-gold">🎖️ 国家级专精特新小巨人</span>');
    if (c.is_hightech) tags.push('<span class="badge badge-green">🦄 高新技术企业</span>');
    if (c.is_pevc) tags.push('<span class="badge badge-purple">💰 PEVC 已投</span>');
    if (c.is_newkinetic) tags.push('<span class="badge badge-blue">⚡ 新动能客群</span>');
    const qualityFlag = c._quality_issue
      ? `<div style="margin-top:8px;padding:6px 10px;background:rgba(255,170,50,0.1);border:1px solid var(--warn);border-radius:4px;font-size:11px;color:var(--warn)">⚠️ 数据异常需人工确认: ${esc(c._quality_detail || '')}</div>`
      : '';

    $('#detailContent').innerHTML = `
      <div class="modal-header">
        <div style="flex:1">
          <div style="font-size:18px;font-weight:600">${esc(c.name)}</div>
          <div style="font-size:12px;color:var(--text-3);margin-top:2px">${esc(c.code)}</div>
        </div>
        <button class="modal-close" data-close>×</button>
      </div>

      <div style="background:linear-gradient(90deg, ${c.banking_priority >= 80 ? 'rgba(80,200,120,0.15)' : c.banking_priority >= 60 ? 'rgba(80,160,255,0.12)' : 'rgba(180,180,180,0.08)'},transparent);padding:12px 16px;border-radius:6px;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:16px">
          <div style="text-align:center">
            <div style="font-size:32px;font-weight:700;color:${c.banking_priority >= 80 ? 'var(--good)' : 'var(--accent)'}">${c.banking_priority}</div>
            <div style="font-size:10px;color:var(--text-3);margin-top:2px">优质分 / 100</div>
          </div>
          <div style="flex:1;display:flex;flex-wrap:wrap;gap:6px">${tags.join('\n') || '<span style="color:var(--text-3);font-size:12px">无政策标签</span>'}</div>
          ${qualityFlag}
          <div style="text-align:right">
            <button class="btn ${isVisited(c.code) ? 'btn-warn' : 'btn-primary'}" id="tvVisitToggle" style="white-space:nowrap">${isVisited(c.code) ? '✓ 在清单中' : '⭐ 加入清单'}</button>
          </div>
        </div>
      </div>

      <h3 style="font-size:13px;color:var(--text-3);margin:16px 0 8px;text-transform:uppercase;letter-spacing:1px">📞 公私联动</h3>
      <table class="detail-table">
        <tr><td>法人</td><td><strong>${esc(c.legal || '-')}</strong></td></tr>
        <tr><td>电话</td><td style="font-family:monospace">${esc((c.phone || '').split(/[;,]/)[0].trim() || '-')}${c.phone && c.phone.includes(';') ? ` <span style="color:var(--text-3);font-size:11px">+${c.phone.split(';').length - 1} 个</span>` : ''}</td></tr>
        <tr><td>邮箱</td><td>${esc(c.email || '-')}</td></tr>
        <tr><td>地址</td><td>${esc(c.addr || '-')}</td></tr>
      </table>

      <h3 style="font-size:13px;color:var(--text-3);margin:16px 0 8px;text-transform:uppercase;letter-spacing:1px">🤝 零售关系</h3>
      <table class="detail-table">
        <tr><td>法人 RM</td><td>${c.rm ? `<strong style="color:var(--good)">🤝 ${esc(c.rm)}</strong>` : '<span style="color:var(--warn)">未挂钩</span>'}</td></tr>
        <tr><td>法人零售网点</td><td>${esc(c.rm_branch || '<span style="color:var(--text-3)">—</span>')}</td></tr>
        <tr><td>客户号</td><td>${esc(c.customer_id || '<span style="color:var(--text-3)">—</span>')}</td></tr>
        <tr><td>是否价值户</td><td>${c.is_value ? '<span style="color:var(--good)">是 ✓</span>' : '<span style="color:var(--text-3)">否</span>'}</td></tr>
      </table>

      <h3 style="font-size:13px;color:var(--text-3);margin:16px 0 8px;text-transform:uppercase;letter-spacing:1px">🏦 我行对公现状</h3>
      <table class="detail-table">
        <tr><td>是否有账户</td><td>${c.has_account ? '<span style="color:var(--good)">是 ✓</span>' : '<span style="color:var(--warn)">否 ← 增量空间</span>'}</td></tr>
        <tr><td>是否有授信</td><td>${c.has_credit ? '<span style="color:var(--good)">是 ✓</span>' : '<span style="color:var(--text-3)">否</span>'}</td></tr>
      </table>

      <!-- 高分但 emp 未知警示 -->
      ${(c.banking_priority >= 80 && (!c.emp || c.emp === 0)) ? '<div style="margin-bottom:12px;padding:8px 12px;background:rgba(255,170,50,0.08);border:1px solid var(--warn);border-radius:6px;font-size:11px;color:var(--warn)">⚠️ <strong>高优先级但参保人数未知</strong> (主表缺数据) · 拜访时记得问 HR/前台确认企业规模</div>' : ''}
      <h3 style="font-size:13px;color:var(--text-3);margin:16px 0 8px;text-transform:uppercase;letter-spacing:1px">📊 基本信息</h3>
      <table class="detail-table">
        <tr><td>登记状态</td><td>${esc(c.status || '-')}</td></tr>
        <tr><td>成立日期</td><td>${esc(c.est || '-')}</td></tr>
        <tr><td>注册资本</td><td>${fmtWan(c.rc)}</td></tr>
        <tr><td>所属行业</td><td>${esc(c.ind || '-')}</td></tr>
        <tr><td>所属赛道</td><td>${esc(c.trk || '未分')} <span style="color:var(--text-3);font-size:11px">(${c.confidence || '-'})</span></td></tr>
        <tr><td>员工数</td><td>${c.emp ? '<strong style="color:var(--good)">' + c.emp + ' 人</strong>' : '<span style="color:var(--text-3)">— 无数据</span>'} ${c.emp >= 100 ? '<span style="font-size:11px;color:var(--good);margin-left:6px">🏢 大企业</span>' : ''}</td></tr>
        <tr><td>分类方法</td><td>${c._inherited_from_main ? '<span style="color:var(--accent)">🎯 继承自主表 (v9/ab+patent)</span>' : '<span style="color:var(--text-3)">A+B 关键词</span>'} ${c.method ? '<span style="color:var(--text-3);font-size:11px;margin-left:6px">' + esc(c.method.replace('main(', '').replace(')', '')) + '</span>' : ''}</td></tr>
        ${c.sub_track ? '<tr><td>子赛道</td><td>' + esc(c.sub_track) + '</td></tr>' : ''}
        ${(c.chain_role || []).length > 0 ? '<tr><td>链主角色</td><td>' + (c.chain_role || []).map(r => '<span class="badge badge-gold" style="margin-right:4px">' + esc(r) + '</span>').join('') + '</td></tr>' : ''}
      </table>

      <h3 style="font-size:13px;color:var(--text-3);margin:16px 0 8px;text-transform:uppercase;letter-spacing:1px">📝 经营范围</h3>
      <div style="font-size:12px;color:var(--text-2);line-height:1.6;padding:10px;background:var(--bg-2);border-radius:6px;max-height:160px;overflow-y:auto">${esc(c.biz || '-')}</div>
    `;
    $('#detailModal').classList.remove('hidden');

    $('#tvVisitToggle').addEventListener('click', () => {
      toggleVisit(c.code);
      renderTechV2();
      $('#detailModal').classList.add('hidden');
    });
  }

  // 导出 tech_v2 当前筛选结果 CSV
  function exportTechV2CSV(items) {
    const headers = ['优质分', '赛道', '员工数', '置信度', '分类方法', '企业名称', '统一代码', '法定代表人', '电话', '邮箱',
      '是否高新', '是否新动能', '是否专精特新', '是否PEVC',
      '法人RM', '法人零售网点', '客户号',
      '是否有账户', '是否有授信',
      '行业大类', '区县', '地址', '注册资本(万)', '成立日期', '经营范围'];
    const rows = [headers.join(',')];
    for (const c of items) {
      const row = [
        c.banking_priority, c.trk || '', c.emp || 0, c.confidence || '',
        c._inherited_from_main ? 'main' : 'ab',
        csvEsc(c.name), c.code, csvEsc(c.legal), csvEsc((c.phone || '').split(';')[0].trim()),
        csvEsc(c.email), c.is_hightech ? '是' : '否', c.is_newkinetic ? '是' : '否',
        c.is_specialized ? '是' : '否', c.is_pevc ? '是' : '否',
        csvEsc(c.rm), csvEsc(c.rm_branch), csvEsc(c.customer_id),
        c.has_account ? '是' : '否', c.has_credit ? '是' : '否',
        csvEsc(c.ind), csvEsc(c.dist), csvEsc(c.addr), c.rc || '',
        csvEsc(c.est), csvEsc(c.biz),
      ];
      rows.push(row.join(','));
    }
    const blob = new Blob(['\ufeff' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `公私联动池_${new Date().toISOString().slice(0, 10)}_${items.length}家.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function csvEsc(s) {
    if (s == null) return '';
    s = String(s);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  // ============================================================
  // 渲染:链主网络(143 家 · 6 角色)
  // ============================================================
  function renderLinks() {
    // 角色分布
    const roleCounts = {};
    ChainLinks.forEach(c => {
      c.roles.forEach(r => {
        roleCounts[r] = (roleCounts[r] || 0) + 1;
      });
    });

    $('#app').innerHTML = `
      <h1 class="page-title">🕸️ 链主网络</h1>
      <p class="page-sub">${ChainLinks.length} 家链主 · 6 种角色 · 按 Top 引用数排序</p>

      <div style="display:flex;gap:12px;margin-bottom:16px">
        <input type="search" id="chainSearch" class="filter-search" placeholder="搜索链主企业名..." style="flex:1">
        <select id="chainRoleFilter" class="filter-search" style="width:200px">
          <option value="">所有角色</option>
          ${Object.keys(roleCounts).map(r => `<option value="${esc(r)}">${esc(r)} (${roleCounts[r]})</option>`).join('')}
        </select>
      </div>

      <div class="hero-stats" style="grid-template-columns:repeat(6,1fr)">
        <div class="hero-stat" style="padding:12px"><div class="hero-stat-num" style="font-size:18px">${roleCounts['Top 链主'] || 0}</div><div class="hero-stat-label">Top 100</div></div>
        <div class="hero-stat" style="padding:12px"><div class="hero-stat-num" style="font-size:18px">${roleCounts['G2B 政府事业单位'] || 0}</div><div class="hero-stat-label">G2B</div></div>
        <div class="hero-stat" style="padding:12px"><div class="hero-stat-num" style="font-size:18px">${roleCounts['产业链链主'] || 0}</div><div class="hero-stat-label">产业链</div></div>
        <div class="hero-stat" style="padding:12px"><div class="hero-stat-num" style="font-size:18px">${roleCounts['上游瓶颈'] || 0}</div><div class="hero-stat-label">上游</div></div>
        <div class="hero-stat" style="padding:12px"><div class="hero-stat-num" style="font-size:18px">${roleCounts['下游分销'] || 0}</div><div class="hero-stat-label">下游</div></div>
        <div class="hero-stat" style="padding:12px"><div class="hero-stat-num" style="font-size:18px">${roleCounts['双向链主'] || 0}</div><div class="hero-stat-label">双向</div></div>
      </div>

      <div style="background:var(--bg-2);border:1px solid var(--accent);border-radius:8px;padding:16px;margin-bottom:16px;font-size:13px;color:var(--text-2)">
        💡 <strong style="color:var(--accent)">Top 5 链主</strong>:这些是被供应商/客户引用最多的企业。拓客策略:<br>
        ·  <strong>上游瓶颈</strong>:你手上有其供应商需求的企业,可以走它供货<br>
        ·  <strong>下游分销</strong>:它下游客户是你的拓展对象<br>
        ·  <strong>G2B</strong>:政府采购渠道,适合提供产品/服务<br>
        ·  <strong>双向</strong>:节点企业,可重点拜访<br>
        ·  <strong>产业链链主</strong>:国企央企 · 资源调度中心
      </div>

      <div class="table-wrap">
        <table id="chainTable">
          <thead>
            <tr>
              <th>排名</th>
              <th>链主企业</th>
              <th>角色</th>
              <th>供应商引用</th>
              <th>客户引用</th>
              <th>合计</th>
            </tr>
          </thead>
          <tbody>
            ${ChainLinks.slice(0, 143).map(c => `
              <tr data-name="${esc(c.name.toLowerCase())}" data-roles="${esc(c.roles.join(','))}">
                <td style="color:var(--accent);font-weight:600">${c.rank || '-'}</td>
                <td><strong>${esc(c.name)}</strong></td>
                <td>
                  ${(c.roles || []).map(r => {
                    const color = {
                      'Top 链主': 'var(--accent)',
                      'G2B 政府事业单位': 'var(--purple)',
                      '产业链链主': 'var(--good)',
                      '上游瓶颈': 'var(--warn)',
                      '下游分销': 'var(--good)',
                      '双向链主': 'var(--accent)',
                    }[r] || 'var(--text-2)';
                    return `<span style="display:inline-block;padding:2px 6px;margin:1px;border-radius:3px;background:var(--bg-3);color:${color};font-size:10px">${esc(r)}</span>`;
                  }).join('')}
                </td>
                <td style="color:var(--text-2)">${c.supplier_count || '-'}</td>
                <td style="color:var(--text-2)">${c.customer_count || '-'}</td>
                <td style="color:${c.total_count > 200 ? 'var(--accent)' : 'var(--text)'};font-weight:600">${c.total_count || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div style="margin-top:24px;padding:16px;background:var(--bg-2);border-radius:8px;font-size:12px;color:var(--text-3)">
        💡 <strong>提示</strong>:链主数据 60 家 G2B 不在企业主表(22,777 家里是工商注册企业),因此不在公司库里。如果你要查看“上游瓶颈 → 某企业的供应商是谁”,这个反向查询需要供应商主表(5.1 万条)做后续开发。
      </div>

      <h2 style="font-size:18px;margin:32px 0 12px">🔍 上下游反查</h2>
      <div style="background:var(--bg-2);border:1px solid var(--accent);border-radius:8px;padding:20px;margin-bottom:16px">
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px">
          <input type="search" id="relSearch" class="filter-search" placeholder="输入企业名(如:华为 / 中信证券 / 深圳地铁)" style="flex:1;font-size:14px;padding:10px">
          <button id="relClear" class="btn" style="display:none">清空</button>
        </div>
        <div id="relSuggestions" style="display:flex;flex-wrap:wrap;gap:4px;font-size:11px;color:var(--text-3);margin-bottom:12px">
          💡 <strong>试一试</strong>:
          ${[...ChainLinks.slice(0, 8).map(c => c.name), ...Companies.slice(0, 3).filter(c => c.name && (c.chain_role || []).length === 0).map(c => c.name)].filter((v, i, a) => a.indexOf(v) === i).slice(0, 12).map(n => `<span class="filter-chip" data-rel-suggest="${esc(n)}">${esc(n)}</span>`).join('')}
        </div>
        <div id="relResult"></div>
      </div>
    `;

    // 绑定搜索
    const search = $('#chainSearch');
    const roleFilter = $('#chainRoleFilter');
    function filterChain() {
      const q = (search.value || '').trim().toLowerCase();
      const role = roleFilter.value;
      $$('#chainTable tbody tr').forEach(tr => {
        const name = tr.dataset.name || '';
        const roles = (tr.dataset.roles || '').split(',');
        const matchQ = !q || name.includes(q);
        const matchR = !role || roles.includes(role);
        tr.style.display = matchQ && matchR ? '' : 'none';
      });
    }
    if (search) search.addEventListener('input', debounce(filterChain, 150));
    if (roleFilter) roleFilter.addEventListener('change', filterChain);

    // 反查绑定
    bindReverseLookup();
  }

  function bindReverseLookup() {
    const input = $('#relSearch');
    const result = $('#relResult');
    const clearBtn = $('#relClear');
    if (!input) return;

    function lookup(q) {
      q = (q || '').trim();
      result.innerHTML = '';
      clearBtn.style.display = q ? '' : 'none';

      if (!q) return;

      // 找匹配的企业(精确优先,子串备用)
      let names = Object.keys(Relations).filter(n => n === q);
      if (names.length === 0) {
        names = Object.keys(Relations).filter(n => n.includes(q));
      }
      if (names.length === 0) {
        result.innerHTML = `<div style="color:var(--warn);padding:12px">😔 "${esc(q)}" 在供应链关系里没找到。试试其他名字(全名更准)。</div>`;
        return;
      }

      const html = names.slice(0, 20).map(name => {
        const rels = Relations[name];
        const sup = rels.sup || [];
        const cus = rels.cus || [];
        const iss = rels.iss || [];  // 谁把我当供应商(反向)
        const isc = rels.isc || [];  // 谁把我当客户(反向)
        const isChain = rels.cr && rels.cr.length > 0;
        const status = isChain ? '🕸️ 链主' : '📋 主表';

        const renderRel = (rels) => rels.slice(0, 15).map(r => {
          // 精简字段:[name, ratio, amount, is_master, is_chain]
          const [n, ratio, amount, isM, isC] = r;
          const ratioStr = ratio != null ? `${ratio}%` : '-';
          const amountStr = amount != null ? (amount >= 10000 ? `${(amount/10000).toFixed(1)}亿` : `${amount}万`) : '-';
          const tag = isC ? '🕸️ ' : '';
          return `<tr><td style="font-size:12px">${tag}${esc(n)}</td><td style="text-align:right;color:var(--accent)">${ratioStr}</td><td style="text-align:right;color:var(--warn)">${amountStr}</td></tr>`;
        }).join('');

        return `
          <div style="margin-bottom:24px;padding:16px;background:var(--bg-2);border:1px solid var(--border);border-radius:8px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
              <strong style="font-size:16px">${esc(name)}</strong>
              <span style="font-size:11px;color:var(--text-3)">${status}</span>
              ${isChain ? `<span style="font-size:10px;color:var(--accent)">${(rels.cr || []).join(', ')}</span>` : ''}
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
              <div>
                <div style="font-size:12px;color:var(--good);margin-bottom:8px">⬆️ 我的供应商(${sup.length})</div>
                ${sup.length === 0 ? '<div style="color:var(--text-3);font-size:12px">无关系</div>' : `
                  <table style="width:100%">
                    <thead><tr><th style="text-align:left;font-size:10px;color:var(--text-3)">名称</th><th style="text-align:right;font-size:10px;color:var(--text-3)">占比</th><th style="text-align:right;font-size:10px;color:var(--text-3)">金额</th></tr></thead>
                    <tbody>${renderRel(sup)}</tbody>
                  </table>
                  ${sup.length > 15 ? `<div style="font-size:11px;color:var(--text-3);margin-top:4px">仅显示前 15 / 共 ${sup.length}</div>` : ''}
                `}
              </div>
              <div>
                <div style="font-size:12px;color:var(--accent);margin-bottom:8px">⬇️ 我的客户(${cus.length})</div>
                ${cus.length === 0 ? '<div style="color:var(--text-3);font-size:12px">无关系</div>' : `
                  <table style="width:100%">
                    <thead><tr><th style="text-align:left;font-size:10px;color:var(--text-3)">名称</th><th style="text-align:right;font-size:10px;color:var(--text-3)">占比</th><th style="text-align:right;font-size:10px;color:var(--text-3)">金额</th></tr></thead>
                    <tbody>${renderRel(cus)}</tbody>
                  </table>
                  ${cus.length > 15 ? `<div style="font-size:11px;color:var(--text-3);margin-top:4px">仅显示前 15 / 共 ${cus.length}</div>` : ''}
                `}
              </div>
            </div>
            ${(iss.length > 0 || isc.length > 0) ? `
              <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">
                <div style="font-size:11px;color:var(--text-3);margin-bottom:8px">💡 <strong>反查视角</strong>(本企业被哪些企业引用):</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
                  <div>
                    <div style="font-size:11px;color:var(--warn);margin-bottom:6px">⬅️ 本企业作为供应商被引用(${iss.length})</div>
                    ${iss.length === 0 ? '<div style="color:var(--text-3);font-size:11px">无</div>' : `
                      <table style="width:100%">
                        <tbody>${renderRel(iss)}</tbody>
                      </table>
                      ${iss.length > 15 ? `<div style="font-size:10px;color:var(--text-3);margin-top:2px">前 15 / 共 ${iss.length}</div>` : ''}
                    `}
                  </div>
                  <div>
                    <div style="font-size:11px;color:var(--accent);margin-bottom:6px">➡️ 本企业作为客户被引用(${isc.length})</div>
                    ${isc.length === 0 ? '<div style="color:var(--text-3);font-size:11px">无</div>' : `
                      <table style="width:100%">
                        <tbody>${renderRel(isc)}</tbody>
                      </table>
                      ${isc.length > 15 ? `<div style="font-size:10px;color:var(--text-3);margin-top:2px">前 15 / 共 ${isc.length}</div>` : ''}
                    `}
                  </div>
                </div>
              </div>
            ` : ''}
          </div>
        `;
      }).join('');

      result.innerHTML = `
        <div style="font-size:12px;color:var(--text-2);margin-bottom:12px">
          🔎 找到 <strong style="color:var(--accent)">${names.length}</strong> 个匹配
          ${names.length > 1 ? '(仅显示前 20 个)' : ''}
        </div>
        ${html}
      `;
    }

    input.addEventListener('input', debounce(e => lookup(e.target.value), 200));
    input.addEventListener('keydown', e => { if (e.key === 'Enter') lookup(input.value); });
    clearBtn.addEventListener('click', () => { input.value = ''; lookup(''); input.focus(); });

    // 点击建议词自动填充
    $$('[data-rel-suggest]').forEach(chip => {
      chip.addEventListener('click', () => {
        input.value = chip.dataset.relSuggest;
        lookup(input.value);
      });
    });
  }

  // ============================================================
  // 渲染:拜访清单(Bug 2 修复 + 筛选 + 全选 + 批量操作)
  // ============================================================
  function applyVisitsFilter(allItems) {
    const f = state.visitsFilter;
    return allItems.filter(c => {
      if (f.track && c.trk !== f.track) return false;
      if (f.confidence) {
        const conf = c.confidence || '';
        if (f.confidence === 'none' && c.trk) return false;
        if (f.confidence !== 'none' && conf !== f.confidence) return false;
      }
      if (f.q) {
        const q = f.q.toLowerCase();
        if (!c.name.toLowerCase().includes(q) &&
            !(c.legal || '').toLowerCase().includes(q) &&
            !(c.addr || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }

  // 清除 selection 里已不在 state.visits 的 code (企业被移除后残留勾选状态)
  function pruneStaleSelection() {
    const validCodes = new Set(state.visits);
    for (const code of state.visitsSelection) {
      if (!validCodes.has(code)) state.visitsSelection.delete(code);
    }
  }

  // 营销建议生成 (HTML 和 MD 复用)
  function buildMarketingSuggestions(c, insight) {
    const s = [];
    if (c.is_specialized) s.push({ type: '产品', text: '专精特新贷（利率 3.85% 起）+ 投行综合服务', pri: 'high' });
    if (c.is_hightech) s.push({ type: '产品', text: '科创贷（最高 3000 万，知识产权质押）', pri: 'high' });
    if (c.is_pevc) s.push({ type: '撮合', text: '投贷联动 + PEVC 下一轮撮合', pri: 'high' });
    if (c.is_newkinetic) s.push({ type: '产品', text: '新动能专项（绿色信贷 + 设备融资租赁）', pri: 'high' });
    if ((c.emp || 0) >= 200) s.push({ type: '产品', text: '代发工资 + 私行介绍 + 员工持股配套', pri: 'mid' });
    else if ((c.emp || 0) >= 50) s.push({ type: '产品', text: '结算套餐 + 代发工资', pri: 'mid' });
    else if ((c.emp || 0) > 0) s.push({ type: '产品', text: '小微结算套餐（免费账户管理费）', pri: 'low' });
    else s.push({ type: '信息', text: '员工人数未知，拜访时顺便问 HR', pri: 'info' });
    if (c.rm) s.push({ type: '策略', text: '与法人 RM (' + c.rm + ') 联动拜访，立即转化对公账户', pri: 'high' });
    else if (c.rm_branch) s.push({ type: '策略', text: '已挂钩 ' + c.rm_branch + '，需找零售端查 RM 联系方式', pri: 'mid' });
    if (!c.has_account) s.push({ type: '策略', text: '未在我行开户，先开基本户 + 结算套餐', pri: 'high' });
    else if (!c.has_credit) s.push({ type: '策略', text: '已有账户无授信，推科创贷 / 税易贷', pri: 'mid' });
    return s;
  }

  function buildOnePager(code) {
    const c = byCode[code];
    if (!c) return '<div style="padding:40px;text-align:center;color:var(--text-3)">未找到企业</div>';
    const insight = TRACK_INSIGHTS[c.trk] || TRACK_INSIGHTS['其他'];
    const vnote = getVisitNote(code);
    const addedAt = state.visitsAdded[code];
    const suggestions = buildMarketingSuggestions(c, insight);

    const risks = [];
    if (insight.risk) risks.push(insight.risk);
    if ((c.emp || 0) === 0 && (c.banking_priority || 0) >= 80) risks.push('员工人数未知，优先确认企业规模');
    if (c._quality_issue) risks.push('政策性标签数据异常，需向数据源方确认');
    if (!c.rm && !c.rm_branch) risks.push('未挂钩任何 RM，需要先挖零售关系');

    const policyBadges = [];
    if (c.is_specialized) policyBadges.push('🎖️ 国家级专精特新');
    if (c.is_hightech) policyBadges.push('🦄 高新技术企业');
    if (c.is_pevc) policyBadges.push('💰 PEVC 已投');
    if (c.is_newkinetic) policyBadges.push('⚡ 新动能' + (c.newkinetic_level ? '(' + c.newkinetic_level + ')' : ''));

    const statusLabels = { pending: '待拜访', visiting: '拜访中', visited: '已拜访', paused: '暂缓', dropped: '放弃' };

    return '<div class="one-pager" id="onePager">' +
      // 头部
      '<div class="op-header">' +
        '<div><div class="op-title">🤝 营销一页通 · ' + esc(c.name) + '</div>' +
        '<div class="op-subtitle">' + insight.emoji + ' ' + esc(c.trk || '未分类') + ' <span class="op-prio" data-prio="' + insight.priority + '">' + insight.priority + ' 级赛道</span></div></div>' +
        '<div class="op-meta">' +
          '<div>📅 生成: ' + new Date().toISOString().substring(0, 10) + '</div>' +
          (addedAt ? '<div>⭐ 加清单: ' + esc(addedAt.substring(0, 10)) + '</div>' : '') +
        '</div>' +
      '</div>' +
      // 企业画像
      '<div class="op-section">' +
        '<div class="op-section-title">📊 企业画像</div>' +
        '<div class="op-grid-2">' +
          gridRow('统一代码', '<span class="mono">' + esc(c.code) + '</span>') +
          gridRow('注册资本', fmtWan(c.rc)) +
          gridRow('成立日期', esc(c.est || '-')) +
          gridRow('员工人数', (c.emp != null ? c.emp + ' 人' : '<span style="color:var(--warn)">— 未知</span>'), (c.emp || 0) >= 100) +
          gridRow('法人', esc(c.legal || '-')) +
          gridRow('所属行业', esc(c.ind || '-')) +
          gridRow('电话', '<span class="mono">' + esc((c.phone || '').split(/[;,]/)[0].trim() || '-') + '</span>') +
          gridRow('邮箱', '<span class="mono">' + esc((c.email || '').split(/[;,]/)[0].trim() || '-') + '</span>') +
          gridRowWide('地址', esc(c.addr || '-')) +
          (c.sub_track ? gridRowWide('子赛道', esc(c.sub_track)) : '') +
        '</div>' +
      '</div>' +
      // 政策性标签
      (policyBadges.length ?
      '<div class="op-section">' +
        '<div class="op-section-title">🏆 政策性标签</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:8px;padding:4px 0">' +
          policyBadges.map(function (b) { return '<span class="op-policy-badge">' + b + '</span>'; }).join('') +
        '</div>' +
        ((c.is_specialized || c.is_hightech) ? '<div style="margin-top:6px;font-size:11px;color:var(--text-3)">💡 高新/专精特新企业可享受研发费用加计扣除、所得税减免等多项税收优惠</div>' : '') +
      '</div>' : '') +
      // 公私联动
      '<div class="op-section">' +
        '<div class="op-section-title">📞 公私联动现状</div>' +
        '<div class="op-grid-2">' +
          gridRow('法人 RM', c.rm ? '<strong style="color:var(--good)">🤝 ' + esc(c.rm) + '</strong>' : '<span style="color:var(--warn)">未挂钩</span>') +
          gridRow('法人零售网点', esc(c.rm_branch || '—')) +
          gridRow('客户号', '<span class="mono">' + esc(c.customer_id || '—') + '</span>') +
          gridRow('是否价值户', c.is_value ? '✓ 是' : '否') +
          gridRow('是否开户', c.has_account ? '✓ 已开户' : '<span style="color:var(--warn)">✗ 未开户（增量空间）</span>') +
          gridRow('是否授信', c.has_credit ? '✓ 已授信' : '否') +
        '</div>' +
      '</div>' +
      // 行业赛道特征
      '<div class="op-section">' +
        '<div class="op-section-title">' + insight.emoji + ' 行业赛道特征 · ' + esc(c.trk || '其他') + '</div>' +
        '<div class="op-callout"><strong>赛道特点：</strong>' + esc(insight.features) + '</div>' +
        (insight.business && insight.business.indexOf('待补充') !== 0 ? '<div class="op-callout"><strong>🏭 主要业务：</strong>' + esc(insight.business) + '</div>' : '') +
        (insight.value_chain && insight.value_chain.indexOf('待补充') !== 0 ? '<div class="op-callout"><strong>🔗 上下游：</strong>' + esc(insight.value_chain) + '</div>' : '') +
        (insight.settlement && insight.settlement.indexOf('待补充') !== 0 ? '<div class="op-callout"><strong>💳 主要结算方式：</strong>' + esc(insight.settlement) + '</div>' : '') +
        (insight.policy_window && insight.policy_window.indexOf('待补充') !== 0 ? '<div class="op-callout"><strong>📅 拜访时间窗：</strong>' + esc(insight.policy_window) + '</div>' : '') +
        (insight.anchor && insight.anchor.indexOf('待补充') !== 0 ? '<div class="op-callout"><strong>🎯 标杆借鉴：</strong>' + esc(insight.anchor) + '</div>' : '') +
        (insight.cases && insight.cases.length > 0 ? '<div class="op-subsection">📚 典型融资/授信案例 (同赛道):</div>' +
          '<ul class="op-talking-points" style="font-size:12px">' +
          insight.cases.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') +
          '</ul>' : '') +
        (insight.policy ? '<div class="op-callout"><strong>行业政策红利：</strong>' + esc(insight.policy) + '</div>' : '') +
        (insight.risk ? '<div class="op-callout op-warn"><strong>行业风险：</strong>' + esc(insight.risk) + '</div>' : '') +
        '<div class="op-subsection">💬 切入话题 (按优先级):</div>' +
        '<ol class="op-talking-points">' +
          insight.talking_points.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') +
        '</ol>' +
      '</div>' +
      // 营销建议
      '<div class="op-section">' +
        '<div class="op-section-title">💡 营销建议</div>' +
        '<div class="op-suggestions">' +
          suggestions.map(function (s) {
            const priColors = { high: 'var(--good)', mid: 'var(--accent)', low: 'var(--text-3)', info: 'var(--text-3)' };
            const priLabels = { high: '⭐⭐⭐', mid: '⭐⭐', low: '⭐', info: 'ℹ️' };
            return '<div class="op-suggestion"><span class="op-pri" style="color:' + (priColors[s.pri] || 'var(--text-2)') + '">' + priLabels[s.pri] + '</span><span class="op-suggestion-type">' + esc(s.type) + '</span><span>' + esc(s.text) + '</span></div>';
          }).join('') +
        '</div>' +
      '</div>' +
      // 标准话术
      '<div class="op-section">' +
        '<div class="op-section-title">🎯 标准话术 (开场)</div>' +
        '<div class="op-pitch">"' + esc(insight.pitch) + '"</div>' +
      '</div>' +
      // 风险提示
      (risks.length ?
      '<div class="op-section">' +
        '<div class="op-section-title">⚠️ 风险提示</div>' +
        '<ul class="op-risks">' +
          risks.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') +
        '</ul>' +
      '</div>' : '') +
      // 备注
      '<div class="op-section">' +
        '<div class="op-section-title">📝 拜访备注</div>' +
        (vnote.note ? '<pre class="op-note">' + esc(vnote.note) + '</pre>' : '<div style="color:var(--text-3);font-size:12px;padding:8px 0">（未填写，在拜访清单页面双击备注列可编辑）</div>') +
        '<div style="display:flex;gap:16px;margin-top:8px;font-size:11px;color:var(--text-3)">' +
          (vnote.status ? '<span>状态: <strong>' + (statusLabels[vnote.status] || vnote.status) + '</strong></span>' : '') +
          (vnote.updated_at ? '<span>更新: ' + esc(vnote.updated_at.substring(0, 16)) + '</span>' : '') +
        '</div>' +
      '</div>' +
      // 页脚
      '<div class="op-footer">' +
        '<div>由 对公拓客工作台 生成 · 数据源：科创企业总表_分类v2.xls</div>' +
        '<div class="op-actions">' +
          '<button class="btn" id="opExportMD">📋 导出 Markdown</button>' +
          '<button class="btn" onclick="window.print()">🖨 打印</button>' +
          '<a class="btn" href="#/visits">← 返回清单</a>' +
        '</div>' +
      '</div>' +
    '</div>';

    // helpers
    function gridRow(label, val, highlight) {
      return '<div><span class="op-label">' + label + '</span><span class="op-value' + (highlight ? ' highlight' : '') + '">' + val + '</span></div>';
    }
    function gridRowWide(label, val) {
      return '<div style="grid-column:1 / -1"><span class="op-label">' + label + '</span><span class="op-value">' + val + '</span></div>';
    }
  }

  // 导出 Markdown (在 visits 之外, 一页通导出独立)
  function exportOnePagerMD(code) {
    const c = byCode[code];
    if (!c) return;
    const insight = TRACK_INSIGHTS[c.trk] || TRACK_INSIGHTS['其他'];
    const vnote = getVisitNote(code);
    const suggestions = buildMarketingSuggestions(c, insight);
    const statusLabels = { pending: '待拜访', visiting: '拜访中', visited: '已拜访', paused: '暂缓', dropped: '放弃' };
    const phone = (c.phone || '').split(/[;,]/)[0].trim();
    const email = (c.email || '').split(/[;,]/)[0].trim();
    const policyTags = [
      c.is_specialized ? '- 🎖️ 国家级专精特新' : '',
      c.is_hightech ? '- 🦄 高新技术企业' : '',
      c.is_pevc ? '- 💰 PEVC 已投' : '',
      c.is_newkinetic ? ('- ⚡ 新动能' + (c.newkinetic_level ? '(' + c.newkinetic_level + ')' : '')) : '',
    ].filter(Boolean).join('\n') || '无';
    const md = [
      '# 🤝 营销一页通 · ' + c.name,
      '',
      '**' + insight.emoji + ' ' + (c.trk || '未分类') + '** · ' + insight.priority + ' 级赛道 · 生成日期 ' + new Date().toISOString().substring(0, 10),
      '',
      '## 📊 企业画像',
      '',
      '| 字段 | 值 |',
      '|---|---|',
      '| 统一代码 | `' + (c.code || '') + '` |',
      '| 注册资本 | ' + fmtWan(c.rc) + ' |',
      '| 成立日期 | ' + (c.est || '-') + ' |',
      '| 员工人数 | ' + (c.emp != null ? c.emp + ' 人' : '未知') + ' |',
      '| 法人 | ' + (c.legal || '-') + ' |',
      '| 所属行业 | ' + (c.ind || '-') + ' |',
      '| 电话 | ' + (phone || '-') + ' |',
      '| 邮箱 | ' + (email || '-') + ' |',
      '| 地址 | ' + (c.addr || '-') + ' |',
      c.sub_track ? '| 子赛道 | ' + c.sub_track + ' |' : '',
      '',
      '## 🏆 政策性标签',
      '',
      policyTags,
      '',
      '## 📞 公私联动现状',
      '',
      '| 字段 | 值 |',
      '|---|---|',
      '| 法人 RM | ' + (c.rm || '未挂钩') + ' |',
      '| 法人零售网点 | ' + (c.rm_branch || '—') + ' |',
      '| 客户号 | ' + (c.customer_id || '—') + ' |',
      '| 是否开户 | ' + (c.has_account ? '是' : '否（增量空间）') + ' |',
      '| 是否授信 | ' + (c.has_credit ? '是' : '否') + ' |',
      '',
      '## ' + insight.emoji + ' 行业赛道特征',
      '',
      '**赛道特点：** ' + insight.features,
      insight.policy ? '\n**行业政策红利：** ' + insight.policy : '',
      insight.risk ? '\n**行业风险：** ' + insight.risk : '',
      '',
      '### 💬 切入话题',
      '',
      insight.talking_points.map(function (p, i) { return (i + 1) + '. ' + p; }).join('\n'),
      '',
      '## 🎯 标准话术',
      '',
      '> ' + insight.pitch,
      '',
      '## 💡 营销建议',
      '',
      suggestions.map(function (s) { return '- **' + s.type + '**: ' + s.text; }).join('\n'),
      '',
      vnote.note ? '## 📝 拜访备注\n\n```\n' + vnote.note + '\n```' : '',
      vnote.status ? '\n状态: **' + (statusLabels[vnote.status] || vnote.status) + '**' : '',
      '',
      '---',
      '',
      '*由 对公拓客工作台 自动生成 · 数据源：科创企业总表_分类v2.xls*',
    ].filter(Boolean).join('\n');

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '一页通_' + c.name + '_' + new Date().toISOString().substring(0, 10) + '.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // 渲染:营销一页通
  function renderOnePager(code) {
    $('#app').innerHTML = buildOnePager(code);
    $('#opExportMD')?.addEventListener('click', function () { exportOnePagerMD(code); });
  }
  function renderOnePagerFromHash() {
    const code = getQueryParam('code');
    if (code) renderOnePager(code);
    else location.hash = '#/visits';
  }

  function renderVisits() {
    pruneStaleSelection();

    const allItems = state.visits.map(code => byCode[code]).filter(Boolean);
    const total = allItems.length;

    // 清单为空
    if (total === 0) {
      $('#app').innerHTML = `
        <h1 class="page-title">⭐ 拜访清单</h1>
        <p class="page-sub">还没有加入任何企业 · 去公司库点企业卡片上的 ⭐</p>
        <div style="text-align:center;padding:80px 0;color:var(--text-3)">
          <div style="font-size:64px;margin-bottom:16px">📭</div>
          <div style="font-size:14px;margin-bottom:24px">清单为空</div>
          <a class="btn btn-primary" href="#/companies">去公司库选企业</a>
        </div>
      `;
      return;
    }

    const items = applyVisitsFilter(allItems);
    const f = state.visitsFilter;
    // 清单里有出现过的赛道(不限于当前可见)
    const tracks = Array.from(new Set(allItems.map(c => c.trk).filter(Boolean))).sort();

    // 表头全选状态 = 当前可见全部已选
    const visibleCodes = items.map(c => c.code);
    const visibleSelectedCount = visibleCodes.filter(c => state.visitsSelection.has(c)).length;
    const allVisibleSelected = visibleCodes.length > 0 && visibleSelectedCount === visibleCodes.length;
    const someVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected;

    const header = ['', '公司名', '统一代码', '赛道', '员工', '政策', '联动RM', '现状', '法人', '电话', '加清单', '备注', '状态', '操作'];

    const rows = items.map(c => {
      const conf = c.confidence || '';
      const confLabel = conf === 'high' ? '⭐' : (conf === 'medium' ? '·' : '·');
      const checked = state.visitsSelection.has(c.code);

      // 政策性标签
      const policyBadges = [];
      if (c.is_specialized) policyBadges.push('<span class="badge badge-gold" title="国家级专精特新小巨人">🎖️</span>');
      if (c.is_hightech) policyBadges.push('<span class="badge badge-green" title="高新企业">🦄</span>');
      if (c.is_pevc) policyBadges.push('<span class="badge badge-purple" title="PEVC 已投">💰</span>');
      if (c.is_newkinetic) policyBadges.push('<span class="badge badge-blue" title="新动能(' + esc(c.newkinetic_level || '是') + ')">⚡</span>');
      const policyHtml = policyBadges.length ? policyBadges.join('') : '<span style="color:var(--text-3);font-size:11px">—</span>';

      // 公私联动
      // 公私联动
      const rmHtml = c.rm
        ? '<div style="font-weight:600;color:var(--good);font-size:12px">🤝 ' + esc(c.rm) + '</div>' : (c.rm_branch ? '<div style="font-size:11px;color:var(--text-2)">🏦 ' + esc(c.rm_branch) + '</div>' : '<span style="color:var(--text-3);font-size:11px">—</span>');

      // 对公现状
      const accHtml = c.has_account
        ? '<span style="color:var(--good)" title="已在我行开户">✓ 户</span>' : '<span style="color:var(--warn)" title="未开户 · 增量空间">✗ 户</span>';
      const credHtml = c.has_credit
        ? ' <span style="color:var(--good)" title="已有授信">✓ 额</span>' : '';

      // 加清单时间
      const addedAt = state.visitsAdded[c.code];
      const addedHtml = addedAt
        ? '<span style="font-size:11px;color:var(--text-3)" title="' + esc(addedAt) + '">' + esc(addedAt.substring(0, 10)) + '</span>' : '<span style="color:var(--text-3);font-size:11px">—</span>';

      // 状态 + 备注
      const vnote = getVisitNote(c.code);
      const statusColors = { pending: 'var(--text-3)', visiting: 'var(--warn)', visited: 'var(--good)', paused: 'var(--text-3)', dropped: 'var(--text-3)' };
      const statusLabels = { pending: '待拜访', visiting: '拜访中', visited: '已拜访', paused: '暂缓', dropped: '放弃' };
      const notePreview = vnote.note ? (vnote.note.length > 30 ? vnote.note.substring(0, 30) + '...' : vnote.note) : '<span style="color:var(--text-3)">点击编辑</span>';
      const updatedTag = vnote.updated_at ? ' <span style="color:var(--text-3);font-size:10px">✏️</span>' : '';

      return `<tr data-code="${esc(c.code)}" class="${checked ? 'selected' : ''}">
        <td style="text-align:center"><input type="checkbox" class="row-check" data-code="${esc(c.code)}" ${checked ? 'checked' : ''}></td>
        <td><strong>${esc(c.name)}</strong><div style="font-size:10px;color:var(--text-3)">${esc(c.ind || '')}</div></td>
        <td style="font-family:monospace;font-size:11px;color:var(--text-3)">${esc(c.code)}</td>
        <td>${c.trk ? '<span class="track-tag">' + esc(c.trk) + '</span> ' + confLabel : '<span style="color:var(--text-3)">未分类</span>'}</td>
        <td style="font-weight:600;color:${(c.emp || 0) >= 100 ? 'var(--good)' : 'var(--text-2)'};text-align:right;font-variant-numeric:tabular-nums">${c.emp != null ? c.emp : '-'}</td>
        <td style="white-space:nowrap">${policyHtml}</td>
        <td>${rmHtml}</td>
        <td>${accHtml}${credHtml}</td>
        <td style="font-size:12px">${esc(c.legal || '-')}<div style="font-size:10px;color:var(--text-3)">${esc(c.sub_track || '')}</div></td>
        <td style="font-family:monospace;font-size:12px">${c.phone ? esc(c.phone.split(/[;,]/)[0].trim()) : '-'}<div style="font-size:10px;color:var(--text-3)">${esc((c.email || '').split(/[;,]/)[0].trim() || '')}</div></td>
        <td>${addedHtml}</td>
        <td class="visit-note-cell" data-code="${esc(c.code)}" title="双击编辑">
          <div class="visit-note-preview">${esc(notePreview)}${updatedTag}</div>
        </td>
        <td>
          <select class="visit-status" data-code="${esc(c.code)}" style="font-size:11px;color:${statusColors[vnote.status] || 'var(--text-3)'};background:var(--bg-2);border:1px solid var(--border);border-radius:4px;padding:2px 4px">
            ${Object.entries(statusLabels).map(([k, v]) => '<option value="' + k + '" ' + (vnote.status === k ? 'selected' : '') + '>' + v + '</option>').join('')}
          </select>
        </td>
        <td style="white-space:nowrap"><a class="btn" href="#/one-pager?code=${esc(c.code)}" title="查看营销一页通">📄</a> <button class="btn btn-remove" data-rm="${esc(c.code)}" title="从清单移除">✕</button></td>
      </tr>`;
    }).join('');

    $('#app').innerHTML = `
      <h1 class="page-title">⭐ 拜访清单</h1>
      <p class="page-sub">清单共 <strong>${total}</strong> 家 · 筛选后 <strong>${items.length}</strong> 家 · localStorage 本地保存</p>

      <!-- 筛选栏(列表上方显示表头和筛选) -->
      <div class="visits-filter">
        <input type="search" id="visitsSearch" class="visits-search" placeholder="搜索企业名/法人/地址..." value="${esc(f.q)}">

        <div class="visits-filter-row">
          <div class="visits-filter-label">赛道</div>
          <div class="visits-filter-chips">
            <span class="filter-chip ${!f.track ? 'active' : ''}" data-vfilter="track" data-val="">全部</span>
            ${tracks.map(t => `
              <span class="filter-chip ${f.track === t ? 'active' : ''}" data-vfilter="track" data-val="${esc(t)}">${esc(t)}</span>
            `).join('')}
          </div>
        </div>

        <div class="visits-filter-row">
          <div class="visits-filter-label">置信度</div>
          <div class="visits-filter-chips">
            <span class="filter-chip ${!f.confidence ? 'active' : ''}" data-vfilter="confidence" data-val="">全部</span>
            <span class="filter-chip ${f.confidence === 'high' ? 'active' : ''}" data-vfilter="confidence" data-val="high" style="${f.confidence === 'high' ? '' : 'color:var(--good)'}">⭐ 高</span>
            <span class="filter-chip ${f.confidence === 'medium' ? 'active' : ''}" data-vfilter="confidence" data-val="medium" style="${f.confidence === 'medium' ? '' : 'color:var(--accent)'}">中</span>
            <span class="filter-chip ${f.confidence === 'low' ? 'active' : ''}" data-vfilter="confidence" data-val="low" style="${f.confidence === 'low' ? '' : 'color:var(--warn)'}">低</span>
            <span class="filter-chip ${f.confidence === 'none' ? 'active' : ''}" data-vfilter="confidence" data-val="none">未分类</span>
          </div>
        </div>

        ${(f.q || f.track || f.confidence) ? `<button class="btn" id="visitsFilterReset" style="margin-top:6px">重置筛选</button>` : ''}
      </div>

      <!-- 工具栏 + 全选 + 批量操作 -->
      <div class="table-toolbar" style="margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:12px">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px">
            <input type="checkbox" id="selectAll" ${allVisibleSelected ? 'checked' : ''} ${someVisibleSelected ? 'data-indeterminate="1"' : ''}>
            <span>全选当前列表 (${items.length})</span>
          </label>
          <span class="table-count" id="selCount" style="${state.visitsSelection.size > 0 ? 'color:var(--accent);font-weight:600' : ''}">
            已选 ${state.visitsSelection.size} 家${visibleSelectedCount !== state.visitsSelection.size ? ` · 列表中 ${visibleSelectedCount}` : ''}
          </span>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn" id="exportSelected" ${state.visitsSelection.size === 0 ? 'disabled' : ''} title="导出选中的企业">📥 导出选中 (${state.visitsSelection.size})</button>
          <button class="btn btn-primary" id="exportCSV">📥 导出全部 CSV</button>
          <button class="btn" id="exportJSON">📥 导出全部 JSON</button>
          <button class="btn btn-warn" id="clearVisits">🗑 清空清单</button>
          <a class="btn" href="#/companies">+ 继续添加</a>
        </div>
      </div>

      <div class="table-wrap">
        <table id="visitsTable">
          <thead><tr>${header.map((h, i) => i === 0
            ? `<th style="width:32px;text-align:center"><input type="checkbox" id="selectAllHead" ${allVisibleSelected ? 'checked' : ''} ${someVisibleSelected ? 'data-indeterminate="1"' : ''}></th>`
            : `<th>${h}</th>`
          ).join('')}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>

      <div style="margin-top:24px;padding:14px;background:var(--bg-2);border-radius:8px;border:1px solid var(--border);font-size:12px;color:var(--text-3)">
        💡 <strong>使用提示</strong>:
        全选 · 批量移除 · 按选中 / 全部导出都支持 · CSV 加 UTF-8 BOM 兼容 Excel 中文 · 清单保存在本机浏览器 localStorage,清缓存会丢,建议每周导出一份备份
      </div>
    `;

    // 表头 indeterminate 状态(部分选中)
    $$('#selectAll, #selectAllHead').forEach(el => {
      if (el.dataset.indeterminate === '1') el.indeterminate = true;
    });

    bindVisitsEvents(visibleCodes);
  }

  function bindVisitsEvents(visibleCodes) {
    // 筛选 - chip 点击
    document.querySelectorAll('[data-vfilter]').forEach(chip => {
      chip.addEventListener('click', () => {
        const filter = chip.dataset.vfilter;
        const val = chip.dataset.val;
        if (state.visitsFilter[filter] === val && val !== '') {
          state.visitsFilter[filter] = '';
        } else {
          state.visitsFilter[filter] = val;
        }
        renderVisits();
      });
    });

    // 筛选 - 搜索
    const search = $('#visitsSearch');
    if (search) {
      search.addEventListener('input', debounce(() => {
        state.visitsFilter.q = search.value.trim();
        renderVisits();
      }, 200));
    }

    // 筛选 - 重置
    $('#visitsFilterReset')?.addEventListener('click', () => {
      state.visitsFilter = { q: '', track: '', confidence: '' };
      renderVisits();
    });

    // 全选 checkbox(顶部 + 表头联动)
    const selectAll = $('#selectAll');
    const selectAllHead = $('#selectAllHead');

    function syncHeaderCheckbox() {
      const codes = visibleCodes || [];
      const visibleSel = codes.filter(c => state.visitsSelection.has(c)).length;
      const allChecked = codes.length > 0 && visibleSel === codes.length;
      const someChecked = visibleSel > 0 && !allChecked;
      [selectAll, selectAllHead].forEach(el => {
        if (!el) return;
        el.checked = allChecked;
        el.indeterminate = someChecked;
      });
    }

    function toggleSelectAll(checked) {
      const codes = visibleCodes || [];
      if (checked) {
        codes.forEach(c => state.visitsSelection.add(c));
      } else {
        codes.forEach(c => state.visitsSelection.delete(c));
      }
      renderVisits();
    }

    selectAll?.addEventListener('change', (e) => toggleSelectAll(e.target.checked));
    selectAllHead?.addEventListener('change', (e) => toggleSelectAll(e.target.checked));

    // 行 checkbox - 不重渲染,只更新计数 + 表头状态
    document.querySelectorAll('.row-check').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const code = e.target.dataset.code;
        const tr = e.target.closest('tr');
        if (e.target.checked) {
          state.visitsSelection.add(code);
          tr?.classList.add('selected');
        } else {
          state.visitsSelection.delete(code);
          tr?.classList.remove('selected');
        }
        updateSelCount();
        syncHeaderCheckbox();
        // 导出选中按钮 enabled 状态
        const btn = $('#exportSelected');
        if (btn) {
          btn.disabled = state.visitsSelection.size === 0;
          btn.textContent = `📥 导出选中 (${state.visitsSelection.size})`;
        }
      });
    });

    function updateSelCount() {
      const selCount = $('#selCount');
      if (!selCount) return;
      const visibleSel = visibleCodes.filter(c => state.visitsSelection.has(c)).length;
      selCount.textContent = `已选 ${state.visitsSelection.size} 家${visibleSel !== state.visitsSelection.size ? ` · 列表中 ${visibleSel}` : ''}`;
      selCount.style.color = state.visitsSelection.size > 0 ? 'var(--accent)' : '';
      selCount.style.fontWeight = state.visitsSelection.size > 0 ? '600' : '';
    }

    // 单个移除
    document.querySelectorAll('[data-rm]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const code = e.target.dataset.rm;
        toggleVisit(code);
        renderVisits();
      });
    });

    // 导出选中
    $('#exportSelected')?.addEventListener('click', () => {
      const items = Array.from(state.visitsSelection).map(code => byCode[code]).filter(Boolean);
      if (items.length === 0) { alert('未选中任何企业'); return; }
      exportVisitsCSV(items, 'selected');
    });

    // 导出全部
    $('#exportCSV')?.addEventListener('click', () => {
      const items = state.visits.map(code => byCode[code]).filter(Boolean);
      if (items.length === 0) { alert('拜访清单为空'); return; }
      exportVisitsCSV(items, 'all');
    });
    $('#exportJSON')?.addEventListener('click', () => {
      const items = state.visits.map(code => byCode[code]).filter(Boolean);
      if (items.length === 0) { alert('拜访清单为空'); return; }
      exportVisitsJSON(items);
    });

    // 清空
    $('#clearVisits')?.addEventListener('click', () => {
      const all = state.visits.length;
      if (all === 0) return;
      if (confirm(`清空全部 ${all} 家拜访清单?\n(导出前请先备份)`)) {
        state.visits = [];
        state.visitsNotes = {};
        state.visitsAdded = {};
        state.visitsSelection.clear();
        localStorage.setItem('workbench-visits', JSON.stringify(state.visits));
        localStorage.setItem('workbench-visits-notes', JSON.stringify(state.visitsNotes));
        localStorage.setItem('workbench-visits-added', JSON.stringify(state.visitsAdded));
        updateVisitBadge();
        renderVisits();
      }
    });

    // 状态变更
    $$('.visit-status').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const code = e.target.dataset.code;
        setVisitNote(code, { status: e.target.value });
        // 更新颜色 (不重渲染, 避免输入框失去焦点)
        const colors = { pending: 'var(--text-3)', visiting: 'var(--warn)', visited: 'var(--good)', paused: 'var(--text-3)', dropped: 'var(--text-3)' };
        e.target.style.color = colors[e.target.value] || 'var(--text-3)';
      });
    });

    // 备注 inline 编辑 - 双击单元格展开 (textarea + 模板条 + 占位符提示)
    $$('.visit-note-cell').forEach(cell => {
      cell.addEventListener('dblclick', (e) => {
        const code = cell.dataset.code;
        const vnote = getVisitNote(code);
        const co = byCode[code] || {};
        // 保存单元格原宽度, 编辑器要更宽
        const tdRect = cell.getBoundingClientRect();
        const editorWidth = Math.max(420, tdRect.width + 240);

        cell.innerHTML = '';
        cell.style.cssText = `position:relative;padding:8px;background:var(--bg-2);border:1px solid var(--accent);border-radius:6px;min-width:${editorWidth}px`;

        // 模板按钮条 (上方)
        const tmplBar = document.createElement('div');
        tmplBar.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;align-items:center';
        tmplBar.innerHTML = '<span style="font-size:11px;color:var(--text-3);margin-right:4px">📋 模板:</span>' +
          VISIT_TEMPLATES.map(t =>
            `<button type="button" data-tmpl="${t.key}" style="font-size:11px;padding:3px 8px;background:var(--bg-3);color:var(--text);border:1px solid var(--border);border-radius:4px;cursor:pointer">${t.label}</button>`
          ).join('');
        cell.appendChild(tmplBar);

        // textarea
        const ta = document.createElement('textarea');
        ta.value = vnote.note;
        ta.placeholder = '点击上方模板快速插入 · 或手动编辑\n\n支持占位符: {{name}} {{legal}} {{phone}} {{addr}} {{date}}';
        ta.style.cssText = 'width:100%;min-height:120px;padding:6px;font-size:12px;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:4px;resize:vertical;font-family:Menlo,Consolas,monospace;line-height:1.5;box-sizing:border-box';
        cell.appendChild(ta);

        // 占位符提示 (下方)
        const hint = document.createElement('div');
        hint.style.cssText = 'margin-top:6px;font-size:10px;color:var(--text-3);display:flex;gap:8px;flex-wrap:wrap;align-items:center';
        hint.innerHTML = '<span>占位符:</span>' +
          ['{{date}}', '{{name}}', '{{legal}}', '{{phone}}', '{{addr}}', '{{emp}}', '{{rm}}', '{{trk}}'].map(p =>
            `<code style="background:var(--bg-3);padding:1px 4px;border-radius:3px;font-size:10px">${p}</code>`
          ).join('') +
          '<span style="margin-left:auto">Esc 取消 · Ctrl+Enter 保存</span>';
        cell.appendChild(hint);

        ta.focus();
        ta.setSelectionRange(ta.value.length, ta.value.length);

        // 模板按钮: 插入到光标位置
        const insertTmpl = (template) => {
          const filled = fillPlaceholders(template, code);
          const start = ta.selectionStart || 0;
          const end = ta.selectionEnd || 0;
          const before = ta.value.substring(0, start);
          const after = ta.value.substring(end);
          // 模板前后加换行 (除非前面已是换行/开头)
          const prefix = before.length && !before.endsWith('\n') ? '\n' : '';
          const suffix = after.length && !after.startsWith('\n') ? '\n' : '';
          ta.value = before + prefix + filled + suffix + after;
          const newPos = before.length + prefix.length + filled.length + suffix.length;
          ta.focus();
          ta.setSelectionRange(newPos, newPos);
        };
        tmplBar.querySelectorAll('[data-tmpl]').forEach(btn => {
          btn.addEventListener('mousedown', (ev) => ev.preventDefault());  // 防止 textarea 失焦
          btn.addEventListener('click', (ev) => {
            const t = VISIT_TEMPLATES.find(x => x.key === btn.dataset.tmpl);
            if (t) insertTmpl(t.template);
          });
          btn.addEventListener('mouseenter', () => btn.style.background = 'var(--accent)');
          btn.addEventListener('mouseleave', () => btn.style.background = 'var(--bg-3)');
        });

        let saved = false;
        const save = () => {
          if (saved) return;
          saved = true;
          setVisitNote(code, { note: ta.value.trim() });
          renderVisits();
        };
        ta.addEventListener('blur', save);
        ta.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') { saved = true; renderVisits(); }
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { ta.blur(); }
        });
      });
    });
  }

  // ============================================================
  // CSV / JSON 导出(Bug 2 修复 + 全选 / 批量导出)
  // ============================================================
  function csvEscape(v) {
    const s = v == null ? '' : String(v);
    // RFC 4180: 含 , " 换行 → 包 " 包裹 + 内部 " → ""
    if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function buildCSV(items) {
    const headers = ['公司名', '统一社会信用代码', '赛道', '子赛道', '置信度', '行业大类', '行业中类', '注册资本(万)', '员工', '科创分', '法人', '电话', '邮箱', '地址', '区县',
      '法人RM', '法人零售网点', '对公账户', '对公授信', '政策性标签', '加清单日期', '拜访状态', '备注', '备注更新时间'];
    const statusLabels = { pending: '待拜访', visiting: '拜访中', visited: '已拜访', paused: '暂缓', dropped: '放弃' };
    const rows = items.map(c => {
      const conf = c.confidence || '';
      const confLabel = conf === 'high' ? '高' : (conf === 'medium' ? '中' : (conf === 'low' ? '低' : ''));
      const vnote = getVisitNote(c.code);
      const addedAt = state.visitsAdded[c.code] || '';
      const policy = [
        c.is_specialized ? '专精特新' : '',
        c.is_hightech ? '高新' : '',
        c.is_pevc ? 'PEVC' : '',
        c.is_newkinetic ? ('新动能' + (c.newkinetic_level ? '(' + c.newkinetic_level + ')' : '')) : '',
      ].filter(Boolean).join(',');
      return [
        c.name, c.code, c.trk || '', c.sub_track || '', confLabel,
        c.ind || '', c.ind_zl || '',
        c.rc != null ? c.rc : '',
        c.emp != null ? c.emp : '',
        c.sci || '',
        c.legal || '',
        (c.phone || '').split(/[;,]/)[0].trim(),
        (c.email || '').split(/[;,]/)[0].trim(),
        c.addr || '',
        c.dist || '',
        c.rm || '', c.rm_branch || '',
        c.has_account ? '已开户' : '未开户',
        c.has_credit ? '已授信' : '未授信',
        policy,
        addedAt ? addedAt.substring(0, 10) : '',
        statusLabels[vnote.status] || '待拜访',
        vnote.note || '',
        vnote.updated_at || '',
      ];
    });
    return [headers, ...rows].map(r => r.map(csvEscape).join(',')).join('\r\n');
  }

  function exportVisitsCSV(items, scope = 'all') {
    if (!items || items.length === 0) { alert('拜访清单为空,先加企业'); return; }
    // 加 UTF-8 BOM 让 Excel 中文不乱码
    const csv = '\ufeff' + buildCSV(items);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    const scopeLabel = scope === 'selected' ? '选中' : '全部';
    a.href = url;
    a.download = `拜访清单_${scopeLabel}_${date}_${items.length}家.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportVisitsJSON(items) {
    if (!items || items.length === 0) { alert('拜访清单为空,先加企业'); return; }
    const statusLabels = { pending: '待拜访', visiting: '拜访中', visited: '已拜访', paused: '暂缓', dropped: '放弃' };
    const enriched = items.map(c => {
      const vnote = getVisitNote(c.code);
      return {
        ...c,
        visit_note: vnote.note || '',
        visit_status: statusLabels[vnote.status] || '待拜访',
        added_at: state.visitsAdded[c.code] || null,
        note_updated_at: vnote.updated_at || null,
      };
    });
    const payload = {
      export_date: new Date().toISOString(),
      count: items.length,
      companies: enriched
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.download = `拜访清单_${date}_${items.length}家.json`;
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ============================================================
  // 渲染:行业研究(外链)
  // ============================================================
  function renderResearch() {
    $('#app').innerHTML = `
      <h1 class="page-title">📚 行业研究</h1>
      <p class="page-sub">15 个赛道的深度分析文档 · 月度输入,不是日常</p>

      <div style="background:var(--bg-2);border:1px solid var(--border);border-radius:8px;padding:24px;text-align:center;margin:40px auto;max-width:600px">
        <div style="font-size:48px;margin-bottom:16px">📚</div>
        <div style="font-size:16px;margin-bottom:8px">行业研究文档</div>
        <div style="font-size:13px;color:var(--text-2);margin-bottom:20px">
          15 个赛道 × 完整客户清单 × 拓客指南<br>
          已沉淀在 industry-research/web/ 单页应用
        </div>
        <a class="btn btn-primary" href="../web/" target="_blank">
          打开行业研究 →
        </a>
        <div style="font-size:11px;color:var(--text-3);margin-top:16px">
          启动方式:cd industry-research/web && python3 -m http.server 8000<br>
          然后浏览器访问 http://localhost:8000/
        </div>
      </div>
    `;
  }

  // ============================================================
  // 详情弹窗
  // ============================================================
  function showDetail(code) {
    const c = byCode[code];
    if (!c) return;

    const trackTag = c.trk ? `<span class="detail-tag track">${esc(c.trk)}</span>` : '<span class="detail-tag">未分类</span>';
    const subTag = c.sub && c.sub !== c.trk ? `<span class="detail-tag">副赛道:${esc(c.sub)}</span>` : '';

    $('#detailContent').innerHTML = `
      <button class="modal-close" data-close>×</button>
      <div class="detail-name">${esc(c.name)}</div>
      <div class="detail-tags">
        ${trackTag}
        ${subTag}
        ${c.sub_track ? `<span class="detail-tag" style="border-color:var(--accent);color:var(--accent)">📂 ${esc(c.sub_track)}</span>` : ''}
        ${(c.chain_role || []).map(r => `<span class="detail-tag" style="border-color:var(--accent);color:var(--accent)">🕸️ ${esc(r)}</span>`).join('')}
        ${c.status ? `<span class="detail-tag">${esc(c.status)}</span>` : ''}
        ${c.scale ? `<span class="detail-tag">${esc(c.scale)}</span>` : ''}
        ${c.src ? `<span class="detail-tag">来源 ${esc(c.src)}</span>` : ''}
      </div>

      <div class="detail-section">
        <div class="detail-section-title">基本信息</div>
        <div class="detail-grid">
          <div><div class="detail-item-label">${fd('legal')}</div><div class="detail-item-value">${esc(c.legal || '-')}</div></div>
          <div><div class="detail-item-label">${fd('est')}</div><div class="detail-item-value">${esc(c.est || '-')}</div></div>
          <div><div class="detail-item-label">${fd('rc')}</div><div class="detail-item-value">${fmtWan(c.rc)}</div></div>
          <div><div class="detail-item-label">${fd('pc')}</div><div class="detail-item-value">${fmtWan(c.pc)}</div></div>
          <div><div class="detail-item-label">${fd('city')} / ${fd('dist')}</div><div class="detail-item-value">${esc(c.city || '-')} / ${esc(c.dist || '-')}</div></div>
          <div><div class="detail-item-label">${fd('ind')}</div><div class="detail-item-value">${esc(c.ind || '-')}</div></div>
          <div><div class="detail-item-label">行业中类</div><div class="detail-item-value">${esc(c.ind_zl || '-')}</div></div>
          <div><div class="detail-item-label">行业小类</div><div class="detail-item-value">${esc(c.ind_xl || '-')}</div></div>
          <div><div class="detail-item-label">${fd('emp')}</div><div class="detail-item-value" style="color:${c.emp && c.emp > 0 ? 'var(--good)' : 'var(--text-2)'}">${c.emp != null ? c.emp + ' 人' : '-'}</div></div>
          <div style="grid-column:1/-1"><div class="detail-item-label">${fd('addr')}</div><div class="detail-item-value">${esc(c.addr || '-')}</div></div>
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">联系方式</div>
        <div class="detail-grid">
          <div><div class="detail-item-label">${fd('phone')}</div><div class="detail-item-value" style="font-family:monospace">${c.phone ? esc(c.phone) : '-'}</div></div>
          <div><div class="detail-item-label">${fd('email')}</div><div class="detail-item-value">${c.email ? esc(c.email) : '-'}</div></div>
        </div>
      </div>

      ${(c.sci || c.pat) ? `
      <div class="detail-section">
        <div class="detail-section-title">科创指标 (v9 来源)</div>
        <div class="detail-grid">
          ${c.sci ? `<div><div class="detail-item-label">${fd('sci')}</div><div class="detail-item-value" style="color:${Number(c.sci) >= 70 ? 'var(--good)' : 'var(--text)'}">${c.sci}</div></div>` : ''}
          ${c.pat ? `<div><div class="detail-item-label">${fd('pat')}</div><div class="detail-item-value">${c.pat}</div></div>` : ''}
          <div><div class="detail-item-label">统一代码</div><div class="detail-item-value" style="font-family:monospace;font-size:11px">${esc(c.code)}</div></div>
        </div>
      </div>
      ` : ''}

      ${(c.customer_ind && c.customer_ind.length > 0) || (c.supplier_ind && c.supplier_ind.length > 0) ? `
      <div class="detail-section">
        <div class="detail-section-title">📡 上下游行业分布 (供应链关系)</div>
        ${c.customer_ind && c.customer_ind.length > 0 ? `
          <div style="margin-bottom:8px">
            <div style="font-size:11px;color:var(--accent);margin-bottom:4px">⬇️ 客户行业 Top ${c.customer_ind.length}</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px">
              ${c.customer_ind.map(i => `<span style="padding:2px 8px;background:var(--bg-3);border-radius:10px;font-size:11px">${esc(i.name)} <strong style="color:var(--accent)">${i.count}</strong></span>`).join('')}
            </div>
          </div>
        ` : ''}
        ${c.supplier_ind && c.supplier_ind.length > 0 ? `
          <div>
            <div style="font-size:11px;color:var(--good);margin-bottom:4px">⬆️ 供应商行业 Top ${c.supplier_ind.length}</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px">
              ${c.supplier_ind.map(i => `<span style="padding:2px 8px;background:var(--bg-3);border-radius:10px;font-size:11px">${esc(i.name)} <strong style="color:var(--good)">${i.count}</strong></span>`).join('')}
            </div>
          </div>
        ` : ''}
      </div>
      ` : ''}

      <div class="detail-actions">
        <button class="btn ${isVisited(c.code) ? 'btn-warn' : 'btn-primary'}" id="visitBtn" data-code="${esc(c.code)}">
          ${isVisited(c.code) ? '⭐ 已加入拜访清单(移除)' : '⭐ 加入拜访清单'}
        </button>
        ${c.phone ? `<a class="btn" href="tel:${esc(c.phone.split(/[;,]/)[0].trim())}">📞 拨打</a>` : ''}
        <a class="btn" href="https://www.tianyancha.com/search?key=${encodeURIComponent(c.name)}" target="_blank">🔍 天眼查</a>
        <button class="btn" data-close>关闭</button>
      </div>
    `;

    $('#detailModal').classList.remove('hidden');

    $('#visitBtn')?.addEventListener('click', (e) => {
      toggleVisit(e.target.dataset.code);
      showDetail(code); // 重渲染
    });
  }

  // 关闭弹窗
  $('#detailModal').addEventListener('click', (e) => {
    if (e.target.dataset.close !== undefined) {
      $('#detailModal').classList.add('hidden');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') $('#detailModal').classList.add('hidden');
  });

  // ============================================================
  // v9 分类复检页面
  // ============================================================
  // 数据模型: V9Review = [{code, name, ind_dl, biz_head, old_trk, suggested_trk, action, _scores, ...}]
  // state.v9ReviewDecisions = {code: {decision: 'adopt'|'skip'|'override', trk?, ts}}

  const V9_TRACK_LIST = (Aggregates.tracks || []).map(t => t.name);

  function saveV9ReviewDecisions() {
    try {
      localStorage.setItem('workbench-v9-review', JSON.stringify(state.v9ReviewDecisions));
    } catch (e) { /* quota */ }
  }

  function setV9ReviewDecision(code, decision, trk) {
    if (!decision) {
      delete state.v9ReviewDecisions[code];
    } else {
      state.v9ReviewDecisions[code] = {
        decision, // 'adopt' | 'skip' | 'override'\n        trk: trk || null,
        ts: Date.now(),
      };
    }
    saveV9ReviewDecisions();
  }

  // 按 action + status + q 过滤
  function applyV9ReviewFilter(rows) {
    const f = state.v9ReviewFilter;
    const decisions = state.v9ReviewDecisions;
    const q = (f.q || '').trim().toLowerCase();

    return rows.filter(r => {
      // action filter: REVIEW = NEEDS_REVIEW + INDUSTRY_FALLBACK (算法拿不准)
      if (f.action === 'REVIEW') {
        if (!(r.action === 'NEEDS_REVIEW' || r.action === 'INDUSTRY_FALLBACK')) return false;
      } else if (f.action === 'NEEDS_REVIEW') {
        if (r.action !== 'NEEDS_REVIEW') return false;
      } else if (f.action === 'INDUSTRY_FALLBACK') {
        if (r.action !== 'INDUSTRY_FALLBACK') return false;
      } else if (f.action === 'KEEP') {
        if (r.action !== 'KEEP') return false;
      } else if (f.action === 'CHANGE') {
        if (!['CHANGE', 'OPTIONAL_CHANGE'].includes(r.action)) return false;
      }
      // status filter
      const d = decisions[r.code];
      if (f.status === 'pending') {
        if (d) return false;
      } else if (f.status === 'adopted') {
        if (!d || (d.decision !== 'adopt' && d.decision !== 'override')) return false;
      } else if (f.status === 'skipped') {
        if (!d || d.decision !== 'skip') return false;
      } else if (f.status === 'done') {
        if (!d) return false;
      }
      // 搜索
      if (q) {
        const hay = (r.name + ' ' + (r.code || '') + ' ' + (r.biz_head || '') + ' ' + (r.ind_dl || '') + ' ' + (r.old_trk || '') + ' ' + (r.suggested_trk || '')).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function renderV9Review() {
    const f = state.v9ReviewFilter;
    const decisions = state.v9ReviewDecisions;

    // 统计(以 action 为单位)
    const totalAction = {
      NEEDS_REVIEW: V9Review.filter(r => r.action === 'NEEDS_REVIEW').length,
      INDUSTRY_FALLBACK: V9Review.filter(r => r.action === 'INDUSTRY_FALLBACK').length,
      KEEP: V9Review.filter(r => r.action === 'KEEP').length,
      CHANGE: V9Review.filter(r => ['CHANGE', 'OPTIONAL_CHANGE'].includes(r.action)).length,
    };

    // 决策统计
    const decStats = { adopt: 0, skip: 0, override: 0 };
    for (const code in decisions) {
      const d = decisions[code];
      if (d.decision === 'adopt') decStats.adopt++;
      else if (d.decision === 'skip') decStats.skip++;
      else if (d.decision === 'override') decStats.override++;
    }
    const totalDecided = decStats.adopt + decStats.skip + decStats.override;

    // 剩余待处理(以 NEEDS_REVIEW + INDUSTRY_FALLBACK 为准)
    const remainingBase = V9Review.filter(r => r.action === 'NEEDS_REVIEW' || r.action === 'INDUSTRY_FALLBACK');
    const remainingPending = remainingBase.filter(r => !decisions[r.code]).length;

    const items = applyV9ReviewFilter(V9Review);
    const perPage = state.v9ReviewPerPage;
    const totalPages = Math.max(1, Math.ceil(items.length / perPage));
    if (state.v9ReviewPage > totalPages) state.v9ReviewPage = totalPages;
    if (state.v9ReviewPage < 1) state.v9ReviewPage = 1;
    const start = (state.v9ReviewPage - 1) * perPage;
    const pageItems = items.slice(start, start + perPage);

    const header = ['', '公司名', '行业大类', '业务摘要', '当前赛道', 'AI 建议', '置信度', '候选', '状态', '操作'];

    const rows = pageItems.map(r => {
      const d = decisions[r.code];
      const decisionBadge = !d ? '<span class="status-pending">待处理</span>'
        : d.decision === 'adopt' ? '<span class="status-adopted">✅ 采纳</span>'
        : d.decision === 'skip' ? '<span class="status-skipped">⏭ 跳过</span>'
        : d.decision === 'override' ? `<span class="status-override">📝 自定义→${esc(d.trk || '?')}</span>`
        : '';
      const confV3 = r.conf_v3 || '-';
      const confColor = confV3 === 'high' ? 'var(--good)' : confV3 === 'medium' ? 'var(--accent)' : confV3 === 'low' ? 'var(--warn)' : 'var(--text-3)';
      const bizShort = (r.biz_head || '').slice(0, 60);
      const candidatesHtml = (r._candidates || []).slice(0, 3).map(c => `<span class="cand-chip">${esc(c)}</span>`).join('\n');
      const actionBadge = r.action === 'NEEDS_REVIEW' ? '<span class="action-badge action-needs">NEEDS_REVIEW</span>' : '<span class="action-badge action-fallback">INDUSTRY_FALLBACK</span>';

      return `<tr data-code="${esc(r.code)}" class="${d ? 'reviewed' : ''}">
        <td>${actionBadge}</td>
        <td><strong class="company-link" data-detail="${esc(r.code)}">${esc(r.name || '-')}</strong><br><span style="font-family:monospace;font-size:10px;color:var(--text-3)">${esc(r.code || '')}</span></td>
        <td style="font-size:11px;color:var(--text-2)">${esc(r.ind_dl || '-')}</td>
        <td style="font-size:11px;color:var(--text-2);max-width:240px;line-height:1.4" title="${esc(r.biz_head || '')}">${esc(bizShort)}${bizShort.length < (r.biz_head || '').length ? '...' : ''}</td>
        <td>${r.old_trk ? `<span class="track-tag old">${esc(r.old_trk)}</span>` : '<span style="color:var(--text-3)">-</span>'}</td>
        <td>${r.suggested_trk ? `<span class="track-tag new">${esc(r.suggested_trk)}</span>` : '<span style="color:var(--text-3)">-</span>'}</td>
        <td style="font-size:11px;color:${confColor}">${confV3}</td>
        <td style="font-size:10px">${candidatesHtml}</td>
        <td>${decisionBadge}</td>
        <td style="white-space:nowrap">
          <button class="btn-v9 btn-adopt" data-v9act="adopt" data-code="${esc(r.code)}" title="采纳 AI 建议: ${esc(r.suggested_trk || '-')}">✅</button>
          <button class="btn-v9 btn-skip" data-v9act="skip" data-code="${esc(r.code)}" title="跳过(保留原赛道)">⏭</button>
          <button class="btn-v9 btn-override" data-v9act="override" data-code="${esc(r.code)}" data-suggested="${esc(r.suggested_trk || '')}" title="自定义赛道">📝</button>
          ${d ? `<button class="btn-v9 btn-undo" data-v9act="undo" data-code="${esc(r.code)}" title="撤销决策">↩</button>` : ''}
          <button class="btn-v9 ${isVisited(r.code) ? 'btn-skip' : 'btn-adopt'}" data-v9act="visit" data-code="${esc(r.code)}" title="${isVisited(r.code) ? '从拜访清单移除' : '加入拜访清单'}">${isVisited(r.code) ? '✓' : '⭐'}</button>
        </td>
      </tr>`;
    }).join('');

    // 顶部概览卡
    $('#app').innerHTML = `
      <h1 class="page-title">🔍 v9 分类复检</h1>
      <p class="page-sub">共 <strong>${fmt(V9Review.length)}</strong> 行 · 复检报告: <code>scripts/_v9_review_report.csv</code></p>

      <div class="v9-stats">
        <div class="v9-stat v9-stat-needs">
          <div class="v9-stat-num">${fmt(totalAction.NEEDS_REVIEW)}</div>
          <div class="v9-stat-label">NEEDS_REVIEW<br>(算法拿不准)</div>
        </div>
        <div class="v9-stat v9-stat-fallback">
          <div class="v9-stat-num">${fmt(totalAction.INDUSTRY_FALLBACK)}</div>
          <div class="v9-stat-label">INDUSTRY_FALLBACK<br>(置信度低)</div>
        </div>
        <div class="v9-stat v9-stat-pending">
          <div class="v9-stat-num" style="color:var(--warn)">${fmt(remainingPending)}</div>
          <div class="v9-stat-label">⏳ 待人工<br>(REVIEW 类中未处理)</div>
        </div>
        <div class="v9-stat v9-stat-decided">
          <div class="v9-stat-num" style="color:var(--good)">${fmt(totalDecided)}</div>
          <div class="v9-stat-label">✅ 已处理<br>(✅${decStats.adopt} ⏭${decStats.skip} 📝${decStats.override})</div>
        </div>
      </div>

      <!-- 筛选栏 -->
      <div class="v9-filter">
        <input type="search" id="v9Search" class="v9-search" placeholder="搜索企业名 / 代码 / 行业 / 赛道..." value="${esc(f.q)}">

        <div class="v9-filter-row">
          <div class="v9-filter-label">action</div>
          <div class="v9-filter-chips">
            <span class="filter-chip ${f.action === 'REVIEW' ? 'active' : ''}" data-v9filter="action" data-val="REVIEW">REVIEW(默认)</span>
            <span class="filter-chip ${f.action === 'NEEDS_REVIEW' ? 'active' : ''}" data-v9filter="action" data-val="NEEDS_REVIEW">NEEDS_REVIEW (${fmt(totalAction.NEEDS_REVIEW)})</span>
            <span class="filter-chip ${f.action === 'INDUSTRY_FALLBACK' ? 'active' : ''}" data-v9filter="action" data-val="INDUSTRY_FALLBACK">INDUSTRY_FALLBACK (${fmt(totalAction.INDUSTRY_FALLBACK)})</span>
            <span class="filter-chip ${f.action === 'CHANGE' ? 'active' : ''}" data-v9filter="action" data-val="CHANGE">已应用 (${fmt(totalAction.CHANGE)})</span>
            <span class="filter-chip ${f.action === 'KEEP' ? 'active' : ''}" data-v9filter="action" data-val="KEEP">KEEP (${fmt(totalAction.KEEP)})</span>
            <span class="filter-chip ${!f.action ? 'active' : ''}" data-v9filter="action" data-val="">全部</span>
          </div>
        </div>

        <div class="v9-filter-row">
          <div class="v9-filter-label">状态</div>
          <div class="v9-filter-chips">
            <span class="filter-chip ${f.status === 'pending' ? 'active' : ''}" data-v9filter="status" data-val="pending">⏳ 待处理</span>
            <span class="filter-chip ${f.status === 'adopted' ? 'active' : ''}" data-v9filter="status" data-val="adopted">✅ 已采纳/自定义</span>
            <span class="filter-chip ${f.status === 'skipped' ? 'active' : ''}" data-v9filter="status" data-val="skipped">⏭ 已跳过</span>
            <span class="filter-chip ${f.status === 'done' ? 'active' : ''}" data-v9filter="status" data-val="done">已完成(含跳过)</span>
            <span class="filter-chip ${!f.status ? 'active' : ''}" data-v9filter="status" data-val="">全部</span>
          </div>
        </div>
      </div>

      <!-- 表格工具栏 -->
      <div class="table-toolbar" style="margin-bottom:12px">
        <div>
          <span class="table-count">
            共 <strong>${fmt(items.length)}</strong> 条 · 当前第 ${state.v9ReviewPage}/${totalPages} 页
          </span>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn" id="v9ExportOverrides" ${(decStats.adopt + decStats.override) === 0 ? 'disabled' : ''} title="导出 ✅ 采纳 + 📝 自定义 的决策为 JSON · 存到 scripts/ 后跑 apply 脚本">📥 导出 overrides (${decStats.adopt + decStats.override})</button>
          <button class="btn" id="v9BatchAdopt" title="批量采纳当前页所有 AI 建议">⚡ 采纳本页</button>
          <button class="btn" id="v9BatchAdoptAll" title="批量采纳所有页中带 AI 建议的待处理公司(谨慎)">⚡⚡ 采纳全部</button>
          <button class="btn" id="v9BatchVisit" title="把当前页所有公司加入拜访清单">⭐ 本页加清单</button>
          <button class="btn btn-warn" id="v9ClearAll" title="清空所有决策记录(谨慎)">🗑 清空决策</button>
        </div>
      </div>

      ${items.length === 0 ? `
        <div style="text-align:center;padding:80px 0;color:var(--text-3)">
          <div style="font-size:64px;margin-bottom:16px">🎉</div>
          <div style="font-size:14px;margin-bottom:24px">${remainingPending === 0 ? '当前筛选下没有需要复检的公司了' : '当前筛选下没有匹配的公司'}</div>
          ${remainingPending > 0 ? `<button class="btn" id="v9ResetFilter">重置筛选</button>` : ''}
        </div>
      ` : `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr>${header.map((h, i) => `<th style="${i === 0 ? 'width:120px' : ''}">${h}</th>`).join('')}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>

      <!-- 翻页 -->
      <div class="table-toolbar" style="margin-top:12px">
        <div>
          <button class="btn" id="v9PrevPage" ${state.v9ReviewPage <= 1 ? 'disabled' : ''}>‹ 上一页</button>
          <button class="btn" id="v9NextPage" ${state.v9ReviewPage >= totalPages ? 'disabled' : ''}>下一页 ›</button>
        </div>
        <div class="table-count">第 ${state.v9ReviewPage} / ${totalPages} 页 · ${fmt(items.length)} 条</div>
      </div>
      `}

      <!-- 底部使用说明 -->
      <div class="v9-help">
        <strong>📖 使用说明</strong>
        <ol>
          <li>✅ <strong>采纳 AI</strong>:把当前公司改为 AI 建议赛道(suggested_trk),记入决策</li>
          <li>⏭ <strong>跳过</strong>:保留当前赛道,不再处理</li>
          <li>📝 <strong>自定义</strong>:从下拉选择新赛道(适合算法建议不对时)</li>
          <li>↩ <strong>撤销</strong>:清掉该公司的决策记录</li>
          <li><strong>📥 导出 overrides</strong>:把 ✅ + 📝 决策存为 <code>_v9_review_decisions_&lt;时间戳&gt;.json</code>,放到 <code>scripts/</code> 下,跑 <code>_refine_v9_apply.py --decisions &lt;file&gt;</code> 应用</li>
        </ol>
      </div>
    `;

    bindV9ReviewEvents();
  }

  function bindV9ReviewEvents() {
    // 顶部筛选
    $$('.filter-chip[data-v9filter]').forEach(chip => {
      chip.addEventListener('click', () => {
        const key = chip.dataset.v9filter;
        const val = chip.dataset.val;
        state.v9ReviewFilter[key] = val;
        state.v9ReviewPage = 1; // 重置页码
        renderV9Review();
      });
    });

    // 搜索(防抖)
    const search = $('#v9Search');
    if (search) {
      const handler = debounce((v) => {
        state.v9ReviewFilter.q = v;
        state.v9ReviewPage = 1;
        renderV9Review();
        // 保持焦点
        const s = $('#v9Search');
        if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
      }, 250);
      search.addEventListener('input', (e) => handler(e.target.value));
    }

    // 行操作按钮
    $$('.btn-v9').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const act = btn.dataset.v9act;
        const code = btn.dataset.code;
        if (!act || !code) return;
        const rec = V9Review.find(r => r.code === code);
        if (!rec) return;

        if (act === 'adopt') {
          if (!rec.suggested_trk) {
            alert('AI 没给建议赛道,无法采纳。请用 📝 自定义。');
            return;
          }
          setV9ReviewDecision(code, 'adopt', rec.suggested_trk);
          renderV9Review();
        } else if (act === 'skip') {
          setV9ReviewDecision(code, 'skip', null);
          renderV9Review();
        } else if (act === 'override') {
          promptV9Override(code, rec.suggested_trk);
        } else if (act === 'undo') {
          setV9ReviewDecision(code, null, null);
          renderV9Review();
        } else if (act === 'visit') {
          toggleVisit(code);
          updateVisitBadge();
          renderV9Review();
        }
      });
    });

    // 公司名 → 详情弹窗
    $$('.company-link[data-detail]').forEach(a => {
      a.style.cursor = 'pointer';
      a.style.color = 'var(--accent)';
      a.addEventListener('click', (e) => {
        showDetail(a.dataset.detail);
      });
    });

    // 翻页
    $('#v9PrevPage')?.addEventListener('click', () => {
      if (state.v9ReviewPage > 1) { state.v9ReviewPage--; renderV9Review(); }
    });
    $('#v9NextPage')?.addEventListener('click', () => {
      state.v9ReviewPage++;
      renderV9Review();
    });

    // 工具栏
    $('#v9ExportOverrides')?.addEventListener('click', exportV9ReviewOverrides);
    $('#v9BatchAdopt')?.addEventListener('click', batchAdoptV9Review);
    $('#v9BatchAdoptAll')?.addEventListener('click', batchAdoptAllV9Review);
    $('#v9BatchVisit')?.addEventListener('click', batchAddVisitV9Review);
    $('#v9ClearAll')?.addEventListener('click', clearAllV9ReviewDecisions);
    $('#v9ResetFilter')?.addEventListener('click', () => {
      state.v9ReviewFilter = { action: 'REVIEW', status: 'pending', q: '' };
      state.v9ReviewPage = 1;
      renderV9Review();
    });
  }

  // 📝 自定义赛道 弹窗(简易 prompt,避免引入新组件)
  function promptV9Override(code, suggested) {
    const options = V9_TRACK_LIST.map((t, i) => `${i + 1}. ${t}`).join('\n');
    const choice = window.prompt(
      `为该公司选择新赛道:\n\n${options}\n\n输入序号或赛道名:`,
      suggested || ''
    );
    if (!choice) return;
    let trk = choice.trim();
    // 序号匹配
    const num = parseInt(trk, 10);
    if (!isNaN(num) && num >= 1 && num <= V9_TRACK_LIST.length) {
      trk = V9_TRACK_LIST[num - 1];
    } else if (!V9_TRACK_LIST.includes(trk)) {
      alert(`未识别的赛道: ${trk}\n\n可选:\n${V9_TRACK_LIST.join('\n')}`);
      return;
    }
    setV9ReviewDecision(code, 'override', trk);
    renderV9Review();
  }

  // ⚡ 批量采纳本页
  function batchAdoptV9Review() {
    const f = state.v9ReviewFilter;
    const start = (state.v9ReviewPage - 1) * state.v9ReviewPerPage;
    const pageItems = applyV9ReviewFilter(V9Review).slice(start, start + state.v9ReviewPerPage);
    const adoptable = pageItems.filter(r => r.suggested_trk && !state.v9ReviewDecisions[r.code]);
    if (adoptable.length === 0) {
      alert('本页没有可采纳的公司(要么没 AI 建议,要么都已处理)');
      return;
    }
    if (!confirm(`批量采纳本页 ${adoptable.length} 家公司的 AI 建议?`)) return;
    for (const r of adoptable) {
      setV9ReviewDecision(r.code, 'adopt', r.suggested_trk);
    }
    renderV9Review();
  }

  // ⚡⚡ 批量采纳全部 (跨页,所有待处理 + 有 AI 建议)
  function batchAdoptAllV9Review() {
    // 拿全量未处理
    const remaining = V9Review.filter(r =>
      (r.action === 'NEEDS_REVIEW' || r.action === 'INDUSTRY_FALLBACK') &&
      !state.v9ReviewDecisions[r.code]
    );
    // 严格采纳: 有 AI 建议 + 建议与现状不同(才才是真改变)
    const adoptable = remaining.filter(r =>
      r.suggested_trk && r.suggested_trk !== r.old_trk
    );
    // no-op: 有 AI 建议但 = 当前赛道(写进 localStorage 也不改变 trk)
    const noop = remaining.filter(r =>
      r.suggested_trk && r.suggested_trk === r.old_trk
    );
    // 手动: 没 AI 建议(NEEDS_REVIEW 里偶尔)
    const manual = remaining.filter(r => !r.suggested_trk);

    if (adoptable.length === 0) {
      alert('没有可批量采纳的公司。剩余 ' + remaining.length + ' 家都不是真改变(可能是 no-op 或没 AI 建议)。');
      return;
    }
    const msg = `将批量采纳 ${adoptable.length} 家待处理公司:\n\n` +
      `· 真采纳(改赛道): ${adoptable.length} 家\n` +
      (noop.length > 0 ? `· 跳过 no-op(AI 建议 = 当前赛道): ${noop.length} 家(仍为 pending, 需手动跳过)\n` : '') +
      (manual.length > 0 ? `· 跳过 需手动: ${manual.length} 家(没 AI 建议, 需逐个看)\n` : '') +
      `\n这些只写 localStorage(不自动改 companies.json),\n你需要点"📥 导出 overrides"下载 JSON + 跑 apply 脚本。\n\n继续?`;
    if (!confirm(msg)) return;
    for (const r of adoptable) {
      setV9ReviewDecision(r.code, 'adopt', r.suggested_trk);
    }
    renderV9Review();
    // 选状态为 'done' 让用户看到结果
    state.v9ReviewFilter.status = 'adopted';
    state.v9ReviewFilter.action = 'REVIEW';
    state.v9ReviewPage = 1;
    renderV9Review();
  }

  // ⭐ 批量加拜访清单 (当前页)
  function batchAddVisitV9Review() {
    const start = (state.v9ReviewPage - 1) * state.v9ReviewPerPage;
    const pageItems = applyV9ReviewFilter(V9Review).slice(start, start + state.v9ReviewPerPage);
    const notInList = pageItems.filter(r => !state.visits.includes(r.code));
    if (notInList.length === 0) {
      alert('本页所有公司都已在拜访清单中');
      return;
    }
    if (!confirm(`将本页 ${notInList.length} 家公司加入拜访清单?\n\n(与决策无关,只是拓客列表)`)) return;
    for (const r of notInList) {
      state.visits.push(r.code);
    }
    localStorage.setItem('workbench-visits', JSON.stringify(state.visits));
    updateVisitBadge();
    renderV9Review();
  }

// 🗑 清空所有决策
  function clearAllV9ReviewDecisions() {
    const n = Object.keys(state.v9ReviewDecisions).length;
    if (n === 0) { alert('当前没有任何决策记录'); return; }
    if (!confirm(`确定清空 ${n} 条决策记录?\n\n(不会改动 companies.json,只清本地标注)`)) return;
    state.v9ReviewDecisions = {};
    saveV9ReviewDecisions();
    renderV9Review();
  }

  // 📥 导出 overrides JSON
  function exportV9ReviewOverrides() {
    const decisions = state.v9ReviewDecisions;
    const overrides = [];
    const adopts = [];
    for (const code in decisions) {
      const d = decisions[code];
      const rec = V9Review.find(r => r.code === code);
      if (!rec) continue;
      if (d.decision === 'override') {
        overrides.push({
          code,
          name: rec.name,
          old_trk: rec.old_trk,
          new_trk: d.trk,
          _review_reason: `v9-review-override(UI): 人工指定 ${d.trk}`,
        });
      } else if (d.decision === 'adopt') {
        adopts.push({
          code,
          name: rec.name,
          old_trk: rec.old_trk,
          new_trk: d.trk,
          _review_reason: `v9-review-adopt(UI): 采纳 AI 建议 ${d.trk}`,
        });
      }
    }
    if (overrides.length === 0 && adopts.length === 0) {
      alert('没有 ✅ 采纳 / 📝 自定义 的决策可导出');
      return;
    }
    const payload = {
      generated_at: new Date().toISOString(),
      total: overrides.length + adopts.length,
      overrides,
      adopts,
      note: '放到 scripts/ 下,用 _refine_v9_apply.py --decisions <file> 应用',
    };
    const ts = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
    const filename = `_v9_review_decisions_${ts}.json`;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ============================================================
  // 初始化
  // ============================================================
  function init() {
    updateVisitBadge();
    bindVisitBadge(); // Bug 2 修复: 顶部 badge 点击跳 #/visits
    const a = Aggregates;
    if (a.data_date) $('#dataDate').textContent = `数据 ${a.data_date}`;

    // 隐藏 loader
    setTimeout(() => {
      $('#loader').classList.add('hidden');
      router();
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();