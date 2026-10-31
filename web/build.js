#!/usr/bin/env node
// ==========================================================
// 构建脚本:从 MD 文件重新生成 data.js
// 用法: node build.js
// ==========================================================

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WEB_DIR = __dirname;

const TRACKS = [
  {
    id: 'medical-devices',
    name: '医疗器械',
    icon: '🏥',
    color: '#10b981',
    priority: '主攻',
    description: 'IVD / 医疗设备 / 高值耗材 · 抗周期 · 政策持续 · 迈瑞产业链',
    docs: [
      { id: 'readme', file: 'README.md', title: '赛道说明' },
      { id: 'industry-map', file: '01-行业地图.md', title: '行业地图' },
      { id: 'learning-path', file: '02-30天学习路径.md', title: '30天学习路径' },
      { id: 'company-list', file: '03-代表企业清单.md', title: '代表企业清单' },
      { id: 'visit-checklist', file: '04-首次拜访清单.md', title: '首次拜访清单' },
      { id: 'scoring', file: '05-评分模型.md', title: '评分模型' },
      { id: 'glossary', file: '06-术语词典.md', title: '术语词典' },
      { id: 'industry-insider', file: '07-行业内核.md', title: '行业内核(10 大洞察)' },
      { id: 'potential-customers', file: '08-潜力客户名单.md', title: '潜力客户名单(100+ 家)' },
      { id: 'banking-opportunity', file: '09-银行机会图谱.md', title: '银行机会图谱(量化)' },
      { id: 'sales-scripts', file: '10-实战话术库.md', title: '实战话术库' },
      { id: 'customer-channels', file: '11-拓客渠道汇总.md', title: '拓客渠道汇总(15 大渠道)' },
      { id: 'trigger-events', file: '12-客户触发器清单.md', title: '客户触发器清单(12 个触发器)' },
      { id: 'case-library', file: '13-标杆案例库.md', title: '标杆案例库(成功+失败)' },
      { id: 'team-management', file: '14-每周节奏与团队管理.md', title: '每周节奏与团队管理' },
    ],
  },
  {
    id: 'cross-border-ecommerce',
    name: '跨境电商/品牌出海',
    icon: '🌍',
    color: '#3b82f6',
    priority: '主攻',
    description: '3C 数码 / 智能家居 / 储能 · 数据透明 · 华强北产业链 · 流水友好',
    docs: [
      { id: 'readme', file: 'README.md', title: '赛道说明' },
      { id: 'industry-map', file: '01-行业地图.md', title: '行业地图' },
      { id: 'learning-path', file: '02-30天学习路径.md', title: '30天学习路径' },
      { id: 'company-list', file: '03-代表企业清单.md', title: '代表企业清单' },
      { id: 'visit-checklist', file: '04-首次拜访清单.md', title: '首次拜访清单' },
      { id: 'scoring', file: '05-评分模型.md', title: '评分模型' },
      { id: 'glossary', file: '06-术语词典.md', title: '术语词典' },
      { id: 'industry-insider', file: '07-行业内核.md', title: '行业内核(10 大洞察)' },
      { id: 'potential-customers', file: '08-潜力客户名单.md', title: '潜力客户名单(100+ 家)' },
      { id: 'banking-opportunity', file: '09-银行机会图谱.md', title: '银行机会图谱(量化)' },
      { id: 'sales-scripts', file: '10-实战话术库.md', title: '实战话术库' },
      { id: 'customer-channels', file: '11-拓客渠道汇总.md', title: '拓客渠道汇总(15 大渠道)' },
      { id: 'trigger-events', file: '12-客户触发器清单.md', title: '客户触发器清单(12 个触发器)' },
      { id: 'case-library', file: '13-标杆案例库.md', title: '标杆案例库(成功+失败)' },
      { id: 'team-management', file: '14-每周节奏与团队管理.md', title: '每周节奏与团队管理' },
    ],
  },
  {
    id: 'new-energy-storage',
    name: '新能源/储能',
    icon: '🔋',
    color: '#f59e0b',
    priority: '储备',
    description: '光伏 / 储能 / 电池 · 重资产 + 周期波动 + 政策红利期',
    docs: [
      { id: 'readme', file: 'README.md', title: '赛道说明' },
      { id: 'industry-map', file: '01-行业地图.md', title: '行业地图' },
      { id: 'learning-path', file: '02-30天学习路径.md', title: '30天学习路径' },
      { id: 'company-list', file: '03-代表企业清单.md', title: '代表企业清单' },
      { id: 'visit-checklist', file: '04-首次拜访清单.md', title: '首次拜访清单' },
      { id: 'scoring', file: '05-评分模型.md', title: '评分模型' },
      { id: 'glossary', file: '06-术语词典.md', title: '术语词典' },
      { id: 'industry-insider', file: '07-行业内核.md', title: '行业内核(10 大洞察)' },
      { id: 'potential-customers', file: '08-潜力客户名单.md', title: '潜力客户名单(100+ 家)' },
      { id: 'banking-opportunity', file: '09-银行机会图谱.md', title: '银行机会图谱(量化)' },
      { id: 'sales-scripts', file: '10-实战话术库.md', title: '实战话术库' },
      { id: 'customer-channels', file: '11-拓客渠道汇总.md', title: '拓客渠道汇总(15 大渠道)' },
      { id: 'trigger-events', file: '12-客户触发器清单.md', title: '客户触发器清单(12 个触发器)' },
      { id: 'case-library', file: '13-标杆案例库.md', title: '标杆案例库(成功+失败)' },
      { id: 'team-management', file: '14-每周节奏与团队管理.md', title: '每周节奏与团队管理' },
    ],
  },
  {
    id: 'robotics-ai',
    name: '机器人/AI',
    icon: '🤖',
    color: '#8b5cf6',
    priority: '跟踪',
    description: '人形机器人 / 工业机器人 / 医疗 AI · 长线跟踪 · 轻资产',
    docs: [
      { id: 'readme', file: 'README.md', title: '赛道说明' },
      { id: 'industry-map', file: '01-行业地图.md', title: '行业地图' },
      { id: 'learning-path', file: '02-30天学习路径.md', title: '30天学习路径' },
      { id: 'company-list', file: '03-代表企业清单.md', title: '代表企业清单' },
      { id: 'visit-checklist', file: '04-首次拜访清单.md', title: '首次拜访清单' },
      { id: 'scoring', file: '05-评分模型.md', title: '评分模型' },
      { id: 'glossary', file: '06-术语词典.md', title: '术语词典' },
      { id: 'industry-insider', file: '07-行业内核.md', title: '行业内核(10 大洞察)' },
      { id: 'potential-customers', file: '08-潜力客户名单.md', title: '潜力客户名单(100+ 家)' },
      { id: 'banking-opportunity', file: '09-银行机会图谱.md', title: '银行机会图谱(量化)' },
      { id: 'sales-scripts', file: '10-实战话术库.md', title: '实战话术库' },
      { id: 'customer-channels', file: '11-拓客渠道汇总.md', title: '拓客渠道汇总(15 大渠道)' },
      { id: 'trigger-events', file: '12-客户触发器清单.md', title: '客户触发器清单(12 个触发器)' },
      { id: 'case-library', file: '13-标杆案例库.md', title: '标杆案例库(成功+失败)' },
      { id: 'team-management', file: '14-每周节奏与团队管理.md', title: '每周节奏与团队管理' },
    ],
  },
  {
    id: 'supply-chain',
    name: '供应链金融',
    icon: '🔗',
    color: '#0ea5e9',
    priority: '主攻',
    description: 'PCB / PCBA / 模具 / 注塑 / 光学 · 链主确权 + 链上小微 · 深圳+东莞集群',
    docs: [
      { id: 'readme', file: 'README.md', title: '供应链生态总览' },
      { id: 'electronics', file: '01-电子制造供应链.md', title: '电子制造(PCB/PCBA/连接器)' },
      { id: 'precision', file: '02-精密制造供应链.md', title: '精密制造(模具/注塑/CNC)' },
      { id: 'optics', file: '03-光学与新兴供应链.md', title: '光学与新兴(激光雷达/传感器)' },
      { id: 'anchors', file: '04-核心链主企业图谱.md', title: '核心链主企业图谱(比亚迪/华为等)' },
      { id: 'products', file: '05-银行供应链金融产品矩阵.md', title: '银行供应链金融产品矩阵' },
    ],
  },
];

// 自动发现新赛道(空目录跳过,提示用户)
const knownTrackIds = new Set(TRACKS.map((t) => t.id));
const subDirs = fs.readdirSync(ROOT).filter((f) => {
  const full = path.join(ROOT, f);
  return fs.statSync(full).isDirectory() && !['web', '参考资料'].includes(f);
});

subDirs.forEach((dir) => {
  if (!knownTrackIds.has(dir)) {
    console.warn(`⚠️  发现未配置的赛道目录: ${dir}/`);
    console.warn(`   请在 build.js 的 TRACKS 数组里手动添加配置`);
  }
});

// 读取所有 MD 文件
for (const track of TRACKS) {
  const trackDir = path.join(ROOT, track.id);
  if (!fs.existsSync(trackDir)) {
    console.warn(`⚠️  赛道目录不存在: ${trackDir}`);
    continue;
  }
  for (const doc of track.docs) {
    const filePath = path.join(trackDir, doc.file);
    if (fs.existsSync(filePath)) {
      doc.content = fs.readFileSync(filePath, 'utf8');
    } else {
      console.warn(`⚠️  文件不存在: ${filePath}`);
      doc.content = `# ${doc.title}\n\n(文档待补充)`;
    }
  }
}

// ===== 额外扫描: industry-research/已分类/ (天眼查补全的企业分类) =====
function scan_extra_dir(EXTRA_DIR, extraTrackId, extraTrackName, extraTrackEmoji, extraTrackColor, description) {
  const extraTrack = {
    id: extraTrackId,
    name: extraTrackName,
    icon: extraTrackEmoji,
    color: extraTrackColor,
    priority: '实战',
    description,
    docs: [],
  };
  if (fs.existsSync(EXTRA_DIR)) {
    // 1) 扫根目录的 .md 顶层报告
    const topFiles = fs.readdirSync(EXTRA_DIR).filter(f => f.endsWith('.md'));
    for (const file of topFiles) {
      const filePath = path.join(EXTRA_DIR, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const docId = `${extraTrackId}-${file.replace('.md','')}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      extraTrack.docs.push({
        id: docId,
        file: file,
        title: file.replace('.md','').replace(/^_/,'').replace(/-/g,' '),
        content,
      });
    }
    // 2) 扫子目录里的 .md(赛道清单)
    const subDirs = fs.readdirSync(EXTRA_DIR).filter((n) => {
      const full = path.join(EXTRA_DIR, n);
      return fs.statSync(full).isDirectory();
    });
    for (const sub of subDirs) {
      const subPath = path.join(EXTRA_DIR, sub);
      const files = fs.readdirSync(subPath).filter((f) => f.endsWith('.md'));
      for (const file of files) {
        const filePath = path.join(subPath, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const docId = `${extraTrackId}-${sub}-${file.replace('.md','')}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        extraTrack.docs.push({
          id: docId,
          file: `${sub}/${file}`,
          title: `${sub} ${file.replace('.md','').replace(/^\d+\./,'').replace(/-/g,' ')}`,
          content,
        });
      }
    }
  }
  return extraTrack;
}

const extra1 = scan_extra_dir(
  path.join(ROOT, '已分类'),
  'industry-classified',
  '行业分类(天眼查补全 v2)',
  '🎯',
  '#ec4899',
  '天眼查 MCP 实时补全的 6000+ 家深圳专精特新企业(3711 家小巨人 + 5282 家市级),按 15 一级行业分类'
);
if (extra1.docs.length > 0) {
  TRACKS.push(extra1);
  console.log(`📋 已分类 v2 扫描: ${extra1.docs.length} 个企业分类文档加入`);
}

const extra2 = scan_extra_dir(
  path.join(ROOT, '已分类_v3'),
  'industry-classified-v3',
  '行业分类 v3 (5971 家完整)',
  '🎯',
  '#db2777',
  'v3 完整分类:1450+5000.xlsx (自带完整工商) + 269k 专利信号, 5971 家 × 30 列, 1525 家跨赛道机会'
);
if (extra2.docs.length > 0) {
  TRACKS.push(extra2);
  console.log(`📋 已分类 v3 扫描: ${extra2.docs.length} 个企业分类文档加入`);
}

const dataJs = `// Auto-generated from MD files at ${new Date().toISOString()}
// Run \`node build.js\` to regenerate

const RESEARCH_DATA = ${JSON.stringify(TRACKS, null, 2)};

if (typeof module !== 'undefined') {
  module.exports = RESEARCH_DATA;
}
`;

const outPath = path.join(WEB_DIR, 'data.js');
fs.writeFileSync(outPath, dataJs, 'utf8');

const totalDocs = TRACKS.reduce((s, t) => s + t.docs.length, 0);
const totalSize = (fs.statSync(outPath).size / 1024).toFixed(1);

console.log(`✅ data.js 已重新生成`);
console.log(`   赛道: ${TRACKS.length}`);
console.log(`   文档: ${totalDocs}`);
console.log(`   大小: ${totalSize} KB`);
console.log(`   路径: ${outPath}`);
console.log(`\n💡 启动方式:`);
console.log(`   cd web/ && python3 -m http.server 8000`);
console.log(`   浏览器打开: http://localhost:8000/`);