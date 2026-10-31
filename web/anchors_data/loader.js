// anchors_data loader — 懒加载按需 fetch
// 默认:加载 index + top200(总计 ~540KB)
// 按类型筛选:动态 fetch by_type/{type}.js

const anchorsTypeFileMap = {
  '政府机关': '政府机关.js',
  '高校/科研': '高校_科研.js',
  '医院/医疗': '医院_医疗.js',
  '央国企(能源/通信)': '央国企能源_通信.js',
  '城建/城投': '城建_城投.js',
  '金融机构': '金融机构.js',
  '其他大企业': '其他大企业.js',
};

const anchorsDataCache = {
  _top200: null,
  _byType: {},  // type -> Promise<data>
};

async function loadAnchorsTop200() {
  if (!anchorsDataCache._top200) {
    anchorsDataCache._top200 = await fetch('anchors_data/top200.js').then(r => r.text()).then(eval);
  }
  return anchorsDataCache._top200;
}

async function loadAnchorsByType(type) {
  if (!anchorsDataCache._byType[type]) {
    const file = anchorsTypeFileMap[type];
    if (!file) {
      // 没对应文件,用 top200 代替
      return await loadAnchorsTop200();
    }
    anchorsDataCache._byType[type] = fetch('anchors_data/by_type/' + file).then(r => r.text()).then(eval);
  }
  return anchorsDataCache._byType[type];
}

if (typeof module !== 'undefined') {
  module.exports = { loadAnchorsTop200, loadAnchorsByType };
}