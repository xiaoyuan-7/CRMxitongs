#!/usr/bin/env node
/**
 * 端到端验证 19 份报告页 — Node fetch 模拟浏览器(自动 URL-encode 中文)
 */
const BASE = 'http://localhost:8765';

const REPORTS = [
  // v3
  ['_report_overview.html', '../已分类_v3/_总览报告_v3.md'],
  ['_report_cross_track.html', '../已分类_v3/_跨赛道机会_1525家.md'],
  ['_report_patent_top100.html', '../已分类_v3/_专利TOP100_技术强企.md'],
  ['_report_patent_domains.html', '../已分类_v3/_专利领域分布.md'],
  ['_report_g2b.html', '../已分类_v3/_G2B政府采购专项报告.md'],
  ['_report_relation_quality.html', '../已分类_v3/_关系深度评分报告.md'],
  ['_report_anchors.html', '../已分类_v3/_链主拓客指南.md'],
  ['_report_ivd_research.html', '../已分类_v3/01-医疗器械/_IVD行业深度研究报告.md'],
  // v2
  ['_v2_report_medical_devices.html', '../已分类/01-医疗器械/00-全部客户清单.md'],
  ['_v2_report_ivd.html', '../已分类/01-医疗器械/1.1-IVD体外诊断.md'],
  ['_v2_report_energy_storage.html', '../已分类/02-新能源储能/00-全部客户清单.md'],
  ['_v2_report_portable_storage.html', '../已分类/02-新能源储能/2.1-便携储能海外.md'],
  ['_v2_report_robotics.html', '../已分类/03-机器人AI/00-全部客户清单.md'],
  ['_v2_report_cross_border.html', '../已分类/04-跨境电商/00-全部客户清单.md'],
  ['_v2_report_electronics.html', '../已分类/05-供应链电子/00-全部客户清单.md'],
  ['_v2_report_precision.html', '../已分类/06-供应链精密/00-全部客户清单.md'],
  ['_v2_report_semi.html', '../已分类/07-半导体/00-全部客户清单.md'],
  ['_v2_report_auto.html', '../已分类/08-汽车/00-全部客户清单.md'],
  ['_v2_report_chem.html', '../已分类/09-化工新材料/00-全部客户清单.md'],
  ['_v2_report_saas.html', '../已分类/10-软件SaaS/00-全部客户清单.md'],
];

(async () => {
  console.log('━'.repeat(70));
  console.log('📊 端到端报告页验证 (Node fetch 模拟浏览器)');
  console.log('━'.repeat(70));

  let ok = 0, fail = 0;
  for (const [page, mdPath] of REPORTS) {
    // 模拟浏览器相对路径解析
    const url = new URL(mdPath, BASE + '/' + page).href;
    let r, text;
    try {
      r = await fetch(url);
      text = await r.text();
    } catch (e) {
      console.log(`❌ ${page.padEnd(36)} FETCH_ERR: ${e.message}`);
      fail++;
      continue;
    }
    const len = text.length;
    const preview = text.replace(/\s+/g, ' ').slice(0, 50);
    if (r.status === 200 && len > 100) {
      console.log(`✅ ${page.padEnd(36)} ${r.status}  ${(len/1024).toFixed(1).padStart(7)}KB  ${preview}...`);
      ok++;
    } else {
      console.log(`❌ ${page.padEnd(36)} ${r.status}  ${len}B`);
      fail++;
    }
  }
  console.log('━'.repeat(70));
  console.log(`📊 总计: ${ok} OK / ${fail} 异常`);
  process.exit(fail > 0 ? 1 : 0);
})();