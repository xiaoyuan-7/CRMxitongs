// ========== Service Worker - 离线支持 ==========

const CACHE_NAME = 'crm-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/app.js',
    '/js/utils/helpers.js',
    '/js/services/ApiService.js',
    '/js/services/AuthService.js',
    '/js/managers/DataManager.js',
    '/js/components/UIComponents.js'
];

const API_CACHE_NAME = 'crm-api-v1';
const API_CACHE_TIMEOUT = 5 * 60 * 1000; // 5 分钟

/**
 * 安装事件 - 缓存静态资源
 */
self.addEventListener('install', (event) => {
    console.log('[SW] Install');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[SW] Installation complete, skipping waiting');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Installation failed:', error);
            })
    );
});

/**
 * 激活事件 - 清理旧缓存
 */
self.addEventListener('activate', (event) => {
    console.log('[SW] Activate');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((cacheName) => {
                            // 删除旧版本缓存
                            return cacheName.startsWith('crm-') && 
                                   cacheName !== CACHE_NAME && 
                                   cacheName !== API_CACHE_NAME;
                        })
                        .map((cacheName) => {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Activation complete, claiming clients');
                return self.clients.claim();
            })
    );
});

/**
 * 请求事件 - 网络优先，离线时返回缓存
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // 只处理同源请求
    if (url.origin !== location.origin) {
        return;
    }
    
    // API 请求特殊处理
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(handleApiRequest(request));
        return;
    }
    
    // 静态资源：缓存优先
    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    console.log('[SW] Cache hit:', request.url);
                    // 后台更新缓存
                    fetchAndCache(request);
                    return cachedResponse;
                }
                
                // 缓存未命中，从网络获取
                return fetch(request)
                    .then((networkResponse) => {
                        // 成功响应则缓存
                        if (networkResponse && networkResponse.status === 200) {
                            const responseClone = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(request, responseClone);
                                });
                        }
                        return networkResponse;
                    })
                    .catch((error) => {
                        console.error('[SW] Fetch failed:', error);
                        // 网络失败，返回离线页面
                        return caches.match('/index.html');
                    });
            })
    );
});

/**
 * 处理 API 请求 - 网络优先，超时返回缓存
 */
async function handleApiRequest(request) {
    const cache = await caches.open(API_CACHE_NAME);
    
    try {
        // 尝试从网络获取
        const networkResponse = await fetch(request);
        
        if (networkResponse && networkResponse.status === 200) {
            // 成功响应则缓存
            const responseClone = networkResponse.clone();
            cache.put(request, responseClone);
            console.log('[SW] API cached:', request.url);
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[SW] Network failed, trying cache:', request.url);
        
        // 网络失败，尝试从缓存获取
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            // 检查缓存是否过期
            const cachedTime = await getCachedTime(request, cache);
            const now = Date.now();
            
            if (now - cachedTime < API_CACHE_TIMEOUT) {
                console.log('[SW] Returning cached API response');
                return cachedResponse;
            } else {
                console.log('[SW] Cached response expired');
            }
        }
        
        // 缓存也失败，返回错误响应
        return new Response(
            JSON.stringify({ 
                error: 'offline', 
                message: '当前处于离线状态，请检查网络连接' 
            }),
            {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

/**
 * 后台更新缓存
 */
async function fetchAndCache(request) {
    try {
        const response = await fetch(request);
        if (response && response.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
    } catch (error) {
        // 静默失败
    }
}

/**
 * 获取缓存时间（用于判断是否过期）
 */
async function getCachedTime(request, cache) {
    const cachedResponse = await cache.match(request);
    if (!cachedResponse) return 0;
    
    const cachedTime = cachedResponse.headers.get('x-cached-time');
    return cachedTime ? parseInt(cachedTime) : Date.now();
}

/**
 * 消息事件 - 用于与主线程通信
 */
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.keys().then((cacheNames) => {
            cacheNames.forEach((cacheName) => {
                if (cacheName !== CACHE_NAME) {
                    caches.delete(cacheName);
                }
            });
        });
    }
});
