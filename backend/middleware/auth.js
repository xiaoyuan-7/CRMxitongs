/**
 * API 访问控制中间件
 *
 * 背景（2026-11-01 安全审计）：
 *   14 个业务路由（leads/companies/contacts/...）此前完全无鉴权，
 *   后端曾绑定 0.0.0.0:3001 直接暴露公网，任何人可读写全部客户数据。
 *
 * 现状的访问路径：
 *   公网 → cloudflared tunnel → auth-proxy(3100, Basic Auth) → backend(3001)
 *
 * 本中间件采用「共享密钥 + JWT」双通道：
 *   1. 共享密钥头 X-Internal-Auth：auth-proxy 转发时注入。
 *      → 前端零改动（相对路径 /api 照常工作），且绕过代理直连 3001 会被拒。
 *   2. Bearer JWT：给脚本 / 外部集成用，行为与之前一致。
 *
 * 例外（不需要任何凭据）：
 *   - /api/health  健康检查（deploy-from-git.sh 直接 curl 本机，需要放行）
 *   - /api/log-error 前端错误上报
 */
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;

// 缺少 JWT_SECRET 时直接拒绝（与 users.js 的处理一致）
if (!JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET 未设置，拒绝启动。');
  process.exit(1);
}

if (!INTERNAL_SECRET) {
  console.error('[FATAL] INTERNAL_API_SECRET 未设置，拒绝启动。');
  console.error('       该密钥用于 auth-proxy → backend 的内部握手，不能为空。');
  process.exit(1);
}

// 无需鉴权的路径前缀
// login 必须放行：它是拿到 token 的入口，本身靠用户名+密码校验
const PUBLIC_PATHS = [
  '/api/health',
  '/api/log-error',
  '/api/users/login'
];

function isPublicPath(reqPath) {
  const p = reqPath.split('?')[0];
  // 兼容两种形态：挂在 app.use('/api') 下时 req.path 已去掉 '/api' 前缀（如 '/health'），
  // 直接 app.use(requireAuth) 时则是 '/api/health'。
  const norm = p.startsWith('/api/') ? p.slice(4) : p;
  return PUBLIC_PATHS.some((pp) => {
    const bare = pp.replace(/^\/api/, '');
    return norm === bare || norm.startsWith(bare + '/');
  });
}

function extractBearer(req) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(h.slice(7), JWT_SECRET);
  } catch (e) {
    return null;
  }
}

// 共享密钥比较：定长比较，避免时序侧信道
function secretMatches(given, expected) {
  if (typeof given !== 'string') return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return require('crypto').timingSafeEqual(a, b);
}

module.exports = function requireAuth(req, res, next) {
  // 静态资源放行；本中间件挂在 /api 下时 req.path 已无 '/api' 前缀
  const fullPath = req.originalUrl.split('?')[0];
  if (!fullPath.startsWith('/api/')) return next();
  if (isPublicPath(fullPath)) return next();

  // 通道 1：auth-proxy 注入的内部共享密钥
  if (secretMatches(req.headers['x-internal-auth'], INTERNAL_SECRET)) {
    req.authSource = 'internal';
    return next();
  }

  // 通道 2：有效 JWT
  const decoded = extractBearer(req);
  if (decoded) {
    req.authSource = 'jwt';
    req.user = decoded;
    return next();
  }

  return res.status(401).json({ error: '未授权' });
};
