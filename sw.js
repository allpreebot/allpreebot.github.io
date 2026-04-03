/**
 * Allpree PWA Service Worker
 * Version: 3.0.0
 */

const CACHE_VERSION = 'allpree-v3.0.0';
const CACHE_NAMES = {
  STATIC: CACHE_VERSION + '-static',
  DYNAMIC: CACHE_VERSION + '-dynamic',
  API: CACHE_VERSION + '-api',
  IMAGES: CACHE_VERSION + '-images'
};

// Core assets to precache
const PRECACHE_URLS = [
  '/',
  '/deals.html',
  '/js/loader.js',
  '/splashpage',
  '/profile",
  '/balance',
  '/salesletter',
  '/marketing',
  '/signup',
  '/404.html',
  '/img/jm.svg',
  '/img/tt.svg',
  '/img/bb.svg',
  '/img/gy.svg',
  '/img/kn.svg',
  '/img/ky.svg',
  '/topup',
  '/css/main.css',
  '/manifest.json',
  '/img/AllPreepwaapp.png',
  '/offline.html'
];

// Never cache these hosts
const NEVER_CACHE_HOSTS = [
  'docs.google.com',
  'raw.githubusercontent.com',
  'googleapis.com',
  'googletagmanager.com',
  'google-analytics.com'
];

// Never cache these paths
const NEVER_CACHE_PATHS = [
  '/img/newp.jpg',
  '/admin',
  '/api/'
];

// API endpoints with custom caching
const API_CACHE_CONFIG = {
  'opensheet.elk.sh': {
    cacheName: CACHE_NAMES.API,
    maxAge: 60 * 60 * 1000
  },
  'script.google.com': {
    cacheName: CACHE_NAMES.API,
    maxAge: 30 * 60 * 1000
  }
};

// Install event - precache static assets
self.addEventListener('install', function(event) {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAMES.STATIC).then(function(cache) {
      console.log('[SW] Precaching static assets...');
      return Promise.allSettled(
        PRECACHE_URLS.map(function(url) {
          return cache.add(url).catch(function(err) {
            console.warn('[SW] Failed to precache: ' + url, err);
          });
        })
      );
    }).then(function() {
      console.log('[SW] Precaching complete!');
      return self.skipWaiting();
    }).catch(function(err) {
      console.error('[SW] Precaching failed:', err);
    })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', function(event) {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(name) {
          return !name.startsWith(CACHE_VERSION);
        }).map(function(name) {
          console.log('[SW] Deleting old cache: ' + name);
          return caches.delete(name);
        })
      );
    }).then(function() {
      console.log('[SW] Old caches cleared!');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip never-cache hosts
  var skipHost = NEVER_CACHE_HOSTS.some(function(host) {
    return url.hostname.includes(host);
  });
  if (skipHost) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Skip never-cache paths
  var skipPath = NEVER_CACHE_PATHS.some(function(path) {
    return url.pathname.startsWith(path);
  });
  if (skipPath) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Handle API requests
  var apiConfig = API_CACHE_CONFIG[url.hostname];
  if (apiConfig) {
    event.respondWith(handleApiRequest(event.request, apiConfig));
    return;
  }

  // Handle images
  if (isImageRequest(event.request)) {
    event.respondWith(handleImageRequest(event.request));
    return;
  }

  // Handle JS/CSS modules
  if (isModuleRequest(event.request)) {
    event.respondWith(handleModuleRequest(event.request));
    return;
  }

  // Handle navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(event.request));
    return;
  }

  // Default: Network first with cache fallback
  event.respondWith(networkFirst(event.request));
});

// Handle API requests with cache-first strategy
function handleApiRequest(request, config) {
  return caches.open(config.cacheName).then(function(cache) {
    return cache.match(request).then(function(cachedResponse) {
      if (cachedResponse) {
        var cachedTime = cachedResponse.headers.get('sw-cached-time');
        if (cachedTime && Date.now() - parseInt(cachedTime) < config.maxAge) {
          console.log('[SW] Serving from API cache: ' + request.url);
          return cachedResponse;
        }
      }

      return fetch(request).then(function(networkResponse) {
        if (networkResponse.ok) {
          var headers = new Headers(networkResponse.headers);
          headers.set('sw-cached-time', Date.now().toString());
          
          var responseToCache = networkResponse.clone();
          cache.put(request, new Response(responseToCache.body, {
            status: responseToCache.status,
            statusText: responseToCache.statusText,
            headers: headers
          }));
          console.log('[SW] Cached API response: ' + request.url);
        }
        return networkResponse;
      }).catch(function(error) {
        console.warn('[SW] API fetch failed, serving cached: ' + request.url);
        return cachedResponse || new Response('[]', { 
          headers: { 'Content-Type': 'application/json' } 
        });
      });
    });
  });
}

// Handle image requests
function handleImageRequest(request) {
  return caches.open(CACHE_NAMES.IMAGES).then(function(cache) {
    return cache.match(request).then(function(cachedResponse) {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then(function(networkResponse) {
        if (networkResponse.ok) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(function() {
        return caches.match('/img/placeholder.svg');
      });
    });
  });
}

// Handle JS/CSS module requests
function handleModuleRequest(request) {
  return caches.open(CACHE_NAMES.STATIC).then(function(cache) {
    return cache.match(request).then(function(cachedResponse) {
      if (cachedResponse) {
        // Revalidate in background
        fetch(request).then(function(networkResponse) {
          if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
        }).catch(function() {});
        return cachedResponse;
      }

      return fetch(request).then(function(networkResponse) {
        if (networkResponse.ok) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(function() {
        return new Response('// Offline', { 
          status: 503,
          headers: { 'Content-Type': 'application/javascript' }
        });
      });
    });
  });
}

// Handle navigation requests
function handleNavigationRequest(request) {
  return caches.open(CACHE_NAMES.STATIC).then(function(cache) {
    return fetch(request).then(function(networkResponse) {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    }).catch(function() {
      return cache.match(request).then(function(cachedResponse) {
        return cachedResponse || cache.match('/offline.html') || cache.match('/deals.html');
      });
    });
  });
}

// Network-first strategy
function networkFirst(request) {
  return caches.open(CACHE_NAMES.DYNAMIC).then(function(cache) {
    return fetch(request).then(function(networkResponse) {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    }).catch(function() {
      return cache.match(request);
    });
  });
}

// Helper functions
function isImageRequest(request) {
  var url = new URL(request.url);
  return /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(url.pathname) ||
         (request.headers.get('Accept') && request.headers.get('Accept').includes('image/'));
}

function isModuleRequest(request) {
  var url = new URL(request.url);
  return url.pathname.endsWith('.js') || 
         url.pathname.endsWith('.css') ||
         url.pathname.includes('/js/modules/') ||
         url.pathname.includes('/css/modules/');
}

// Message handling
self.addEventListener('message', function(event) {
  var data = event.data || {};
  var type = data.type;

  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (type === 'CLEAR_CACHE') {
    event.waitUntil(clearAllCaches());
  }

  if (type === 'CACHE_URLS' && Array.isArray(data.data && data.data.urls)) {
    event.waitUntil(cacheUrls(data.data.urls));
  }
});

function clearAllCaches() {
  return caches.keys().then(function(cacheNames) {
    return Promise.all(cacheNames.map(function(name) {
      return caches.delete(name);
    }));
  });
}

function cacheUrls(urls) {
  return caches.open(CACHE_NAMES.DYNAMIC).then(function(cache) {
    return Promise.all(urls.map(function(url) {
      return cache.add(url).catch(function(err) {
        console.warn('[SW] Failed to cache: ' + url, err);
      });
    }));
  });
}

// Background sync
self.addEventListener('sync', function(event) {
  if (event.tag === 'sync-deals') {
    event.waitUntil(syncDeals());
  }
});

function syncDeals() {
  return fetch('/').then(function() {
    console.log('[SW] Sync complete!');
    return self.clients.matchAll().then(function(clients) {
      clients.forEach(function(client) {
        client.postMessage({ type: 'DEALS_SYNCED' });
      });
    });
  }).catch(function(error) {
    console.error('[SW] Sync failed:', error);
  });
}

// Push notifications
self.addEventListener('push', function(event) {
  var data = {};
  if (event.data) {
    data = event.data.json();
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Allpree', {
      body: data.body || 'New updates available!',
      icon: '/img/AllPreepwaapp.png',
      badge: '/img/AllPreepwaapp.png',
      data: data.url || '/'
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data));
});

console.log('[SW] Service Worker loaded!');
