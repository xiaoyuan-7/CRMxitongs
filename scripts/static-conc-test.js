/**
 * static-server 并发能力测试
 * 用 node http 客户端发 N 个并发请求，观察服务端是否能全部响应
 */
const http = require('http');
const N = parseInt(process.env.N || '11', 10);
const FILES = ['_fields', 'aggregates', 'sub_tracks', 'chain_links', 'overlap_28',
  'top50_classified', 'top500_unclassified', 'v9_review', 'tech_v2', 'relations', 'companies'];

function one(file) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const req = http.get({
      host: '127.0.0.1', port: 8000, path: '/workbench/data/' + file + '.json',
      headers: { 'Accept-Encoding': 'gzip' }
    }, (res) => {
      let bytes = 0;
      res.on('data', d => bytes += d.length);
      res.on('end', () => resolve({ file, status: res.statusCode, bytes, ms: Date.now() - t0 }));
    });
    req.on('error', e => resolve({ file, status: 'ERR:' + e.code, bytes: 0, ms: Date.now() - t0 }));
  });
}

(async () => {
  console.log('并发数:', N, '（11 个文件）');
  const t0 = Date.now();
  const results = await Promise.all(FILES.map(one));
  const total = Date.now() - t0;
  results.forEach(r => console.log('  ' + r.file.padEnd(24) + String(r.status).padStart(6) +
    String(r.bytes).padStart(10) + 'B  ' + String(r.ms).padStart(6) + 'ms'));
  console.log('');
  console.log('全部完成总耗时:', total, 'ms');
  const ok = results.filter(r => r.status === 200).length;
  console.log('成功 200:', ok, '/', results.length);
})();
