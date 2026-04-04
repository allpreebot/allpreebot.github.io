/**
 * Allpree PWA Service Worker
 * Version: 4.0.0
 * 
 * Optimized for Jamaica's slow/unstable mobile data:
 *   - Aggressive precaching of ALL app shell files
 *   - Stale-while-revalidate for JS/CSS (instant load + background update)
 *   - Cache-first for images (skip network entirely after first load)
 *   - Smart API caching with short TTL for deals, longer for config
 *   - Network timeout of 3s — if network is slow, serve cached immediately
 *   - Image cache size limit to prevent filling phone storage
 *   - Offline fallback page
 */

const CACHE_VERSION = 'allpree-v4.1.0';
const CACHE_NAMES = {
  STATIC: CACHE_VERSION + '-static',     // App shell (HTML, JS, CSS, icons)
  API: CACHE_VERSION + '-api',           // Google Sheets / API data
  IMAGES: CACHE_VERSION + '-images',     // Product images, brand logos
  FONTS: CACHE_VERSION + '-fonts'        // Google Fonts, CDN fonts
};

// Network timeout — if the network doesn't respond in 3 seconds, use cache
const NETWORK_TIMEOUT_MS = 3000;

// Max items in image cache (prevent filling up phone storage)
const MAX_IMAGE_CACHE_ITEMS = 300;

// ============================================
// PRECACHE — Everything needed for first paint
// ============================================

const PRECACHE_URLS = [
  // Pages
  '/',
  '/deals.html',
  '/offline.html',
  '/splashpage.html',
  '/profile.html',
  '/signup.html',

  // App shell
  '/js/loader.js',
  '/js/config.js',
  '/css/main.css',
  '/manifest.json',

  // All JS modules (crucial — these must work offline)
  '/js/modules/loading.js',
  '/js/modules/utilities.js',
  '/js/modules/myStores.js',
  '/js/modules/init.js',
  '/js/modules/panel.js',
  '/js/modules/admin.js',
  '/js/modules/adminFetch.js',
  '/js/modules/favoriteBrands.js',
  '/js/modules/takeoverBrand.js',
  '/js/modules/cart.js',
  '/js/modules/location.js',
  '/js/modules/savedLists.js',
  '/js/modules/likedDeals.js',
  '/js/modules/dealPopup.js',
  '/js/modules/loadDeals.js',
  '/js/modules/splash.js',
  '/js/modules/pwaInstall.js',
  '/js/modules/leaderboard.js',
  '/js/modules/offline.js',
  '/js/modules/deviceTracking.js',
  '/js/modules/stories.js',
  '/js/modules/qrScanner.js',

  // App icon
  '/img/AllPreepwaapp.png',

  // Country flags
  '/img/jm.svg',
  '/img/tt.svg',
  '/img/bb.svg',
  '/img/gy.svg',
  '/img/kn.svg',
  '/img/ky.svg'
];

// External CDN assets to precache
const PRECACHE_CDN = [
  'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js',
  'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css'
];

// ============================================
// NEVER CACHE — Analytics, tracking, POST endpoints
// ============================================

const NEVER_CACHE_HOSTS = [
  'docs.google.com',
  'googletagmanager.com',
  'google-analytics.com',
  'www.google-analytics.com',
  'analytics.google.com'
];

const NEVER_CACHE_PATHS = [
  '/admin',
  '/api/'
];

// ============================================
// API CACHE CONFIG — TTL per host
// ============================================

// Track active sheet URL (set from frontend via message)
var activeSheetUrl = null;

const API_CACHE_CONFIG = {
  'opensheet.elk.sh': {
    strategy: 'network-first',   // Real-time deal pipe — always hit network first
    timeoutMs: NETWORK_TIMEOUT_MS
  },
  'script.google.com': {
    maxAge: 0,                   // Never cache POST results from Apps Script
    timeoutMs: 10000             // Allow 10s for form submissions
  }
};

// ============================================
// INSTALL — Precache everything
// ============================================

self.addEventListener('install', function(event) {
  console.log('[SW] Installing v4.0.0...');

  event.waitUntil(
    caches.open(CACHE_NAMES.STATIC).then(function(cache) {
      console.log('[SW] Precaching app shell...');

      // Cache local files
      var localPromises = PRECACHE_URLS.map(function(url) {
        return cache.add(url).catch(function(err) {
          console.warn('[SW] Failed to precache: ' + url, err.message);
        });
      });

      // Cache CDN files (cross-origin, use no-cors mode)
      var cdnPromises = PRECACHE_CDN.map(function(url) {
        return fetch(url, { mode: 'cors' })
          .then(function(response) {
            if (response.ok) {
              return cache.put(url, response);
            }
          })
          .catch(function(err) {
            console.warn('[SW] Failed to precache CDN: ' + url, err.message);
          });
      });

      return Promise.allSettled(localPromises.concat(cdnPromises));
    }).then(function() {
      console.log('[SW] Precaching complete!');
      return self.skipWaiting();
    }).catch(function(err) {
      console.error('[SW] Precaching failed:', err);
    })
  );
});

// ============================================
// ACTIVATE — Clean old caches
// ============================================

self.addEventListener('activate', function(event) {
  console.log('[SW] Activating...');

  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(name) {
          // Delete any cache that doesn't match current version
          return !name.startsWith(CACHE_VERSION);
        }).map(function(name) {
          console.log('[SW] Deleting old cache: ' + name);
          return caches.delete(name);
        })
      );
    }).then(function() {
      console.log('[SW] Now controlling all clients');
      return self.clients.claim();
    })
  );
});

// ============================================
// FETCH — Route requests to strategies
// ============================================

self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  // Skip non-GET (POST, PUT, etc.) — let them go to network
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip never-cache hosts
  var skipHost = NEVER_CACHE_HOSTS.some(function(host) {
    return url.hostname.includes(host);
  });
  if (skipHost) return;

  // Skip never-cache paths
  var skipPath = NEVER_CACHE_PATHS.some(function(path) {
    return url.pathname.startsWith(path);
  });
  if (skipPath) return;

  // Route: API data (Google Sheets)
  var apiConfig = API_CACHE_CONFIG[url.hostname];
  if (apiConfig) {
    if (apiConfig.strategy === 'network-first') {
      // opensheet.elk.sh — real-time deal updates, always try network first
      event.respondWith(networkFirstAPI(event.request, apiConfig));
    } else if (apiConfig.maxAge > 0) {
      event.respondWith(staleWhileRevalidateAPI(event.request, apiConfig));
    }
    return;
  }

  // Route: Images (cache-first, never re-fetch unless evicted)
  if (isImageRequest(event.request)) {
    event.respondWith(cacheFirstImage(event.request));
    return;
  }

  // Route: Fonts (cache-first, fonts never change)
  if (isFontRequest(event.request)) {
    event.respondWith(cacheFirstFont(event.request));
    return;
  }

  // Route: JS/CSS modules (stale-while-revalidate — instant + background update)
  if (isModuleRequest(event.request)) {
    event.respondWith(staleWhileRevalidate(event.request, CACHE_NAMES.STATIC));
    return;
  }

  // Route: HTML navigation (network with timeout, fallback to cache)
  if (event.request.mode === 'navigate') {
    event.respondWith(networkTimeoutThenCache(event.request));
    return;
  }

  // Default: stale-while-revalidate
  event.respondWith(staleWhileRevalidate(event.request, CACHE_NAMES.STATIC));
});

// ============================================
// STRATEGIES
// ============================================

/**
 * Network-First for API (opensheet.elk.sh)
 * ALWAYS try the network first for real-time deal updates.
 * Cache the response for offline fallback.
 * Only serve cache if network fails or times out.
 */
function networkFirstAPI(request, config) {
  return caches.open(CACHE_NAMES.API).then(function(cache) {
    return fetchWithTimeout(request, config.timeoutMs || NETWORK_TIMEOUT_MS)
      .then(function(networkResponse) {
        if (networkResponse && networkResponse.ok) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      })
      .catch(function() {
        console.warn('[SW] opensheet network failed, serving cached: ' + request.url);
        return cache.match(request).then(function(cached) {
          return cached || new Response('[]', {
            headers: { 'Content-Type': 'application/json' }
          });
        });
      });
  });
}

/**
 * Stale-While-Revalidate
 * Serve cache IMMEDIATELY, then update cache from network in background.
 * Best for: JS modules, CSS — user gets instant load, next visit gets latest.
 */
function staleWhileRevalidate(request, cacheName) {
  return caches.open(cacheName).then(function(cache) {
    return cache.match(request).then(function(cachedResponse) {
      var fetchPromise = fetch(request).then(function(networkResponse) {
        if (networkResponse.ok) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(function() {
        return cachedResponse; // Network failed, reuse cached
      });

      // Return cached version immediately if we have it
      return cachedResponse || fetchPromise;
    });
  });
}

/**
 * Stale-While-Revalidate for API with TTL
 * Like stale-while-revalidate, but respects maxAge.
 * If cached data is fresh enough, serve it and skip network entirely.
 * If stale, serve it but fetch fresh data in background.
 */
function staleWhileRevalidateAPI(request, config) {
  return caches.open(CACHE_NAMES.API).then(function(cache) {
    return cache.match(request).then(function(cachedResponse) {
      var isFresh = false;

      if (cachedResponse) {
        var cachedTime = cachedResponse.headers.get('sw-cached-time');
        if (cachedTime && (Date.now() - parseInt(cachedTime)) < config.maxAge) {
          isFresh = true;
        }
      }

      // If cache is fresh, serve it and DON'T hit network (saves data!)
      if (isFresh) {
        console.log('[SW] API cache hit (fresh): ' + request.url);
        return cachedResponse;
      }

      // Cache is stale or missing — try network with timeout
      var fetchPromise = fetchWithTimeout(request, config.timeoutMs || NETWORK_TIMEOUT_MS)
        .then(function(networkResponse) {
          if (networkResponse.ok) {
            // Clone and add timestamp header
            return networkResponse.clone().blob().then(function(body) {
              var headers = new Headers(networkResponse.headers);
              headers.set('sw-cached-time', Date.now().toString());
              var timestampedResponse = new Response(body, {
                status: networkResponse.status,
                statusText: networkResponse.statusText,
                headers: headers
              });
              cache.put(request, timestampedResponse);
              return networkResponse;
            });
          }
          return networkResponse;
        })
        .catch(function() {
          console.warn('[SW] API network failed, serving stale: ' + request.url);
          // Return stale cached version, or empty array as last resort
          return cachedResponse || new Response('[]', {
            headers: { 'Content-Type': 'application/json' }
          });
        });

      // If we have stale cache, serve it immediately while fetching fresh
      if (cachedResponse) {
        console.log('[SW] API serving stale, revalidating: ' + request.url);
        // Start background fetch (don't await)
        fetchPromise.catch(function() {});
        return cachedResponse;
      }

      // No cache at all — must wait for network
      return fetchPromise;
    });
  });
}

/**
 * Cache-First for Images
 * Images rarely change. Once cached, always serve from cache.
 * Saves mobile data on slow Jamaica connections.
 */
function cacheFirstImage(request) {
  return caches.open(CACHE_NAMES.IMAGES).then(function(cache) {
    return cache.match(request).then(function(cachedResponse) {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then(function(networkResponse) {
        if (networkResponse.ok) {
          cache.put(request, networkResponse.clone());
          // Trim cache if too large
          trimCache(CACHE_NAMES.IMAGES, MAX_IMAGE_CACHE_ITEMS);
        }
        return networkResponse;
      }).catch(function() {
        // Return placeholder image if offline
        return caches.match('/img/AllPreepwaapp.png') || new Response('', {
          status: 404,
          statusText: 'Offline'
        });
      });
    });
  });
}

/**
 * Cache-First for Fonts
 * Fonts never change. Cache permanently.
 */
function cacheFirstFont(request) {
  return caches.open(CACHE_NAMES.FONTS).then(function(cache) {
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
        return new Response('', { status: 404 });
      });
    });
  });
}

/**
 * Network with Timeout, then Cache fallback
 * Try network for 3 seconds. If too slow, serve cached page.
 * Best for: HTML pages — shows content fast on slow connections.
 */
function networkTimeoutThenCache(request) {
  return caches.open(CACHE_NAMES.STATIC).then(function(cache) {
    return fetchWithTimeout(request, NETWORK_TIMEOUT_MS)
      .then(function(networkResponse) {
        if (networkResponse.ok) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      })
      .catch(function() {
        return cache.match(request).then(function(cachedResponse) {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Last resort: show offline page
          return cache.match('/offline.html').then(function(offlinePage) {
            return offlinePage || cache.match('/deals.html');
          });
        });
      });
  });
}

// ============================================
// HELPERS
// ============================================

/**
 * Fetch with timeout — reject if network takes too long
 */
function fetchWithTimeout(request, timeoutMs) {
  return new Promise(function(resolve, reject) {
    var timer = setTimeout(function() {
      reject(new Error('Network timeout after ' + timeoutMs + 'ms'));
    }, timeoutMs);

    fetch(request).then(function(response) {
      clearTimeout(timer);
      resolve(response);
    }).catch(function(err) {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/**
 * Trim old items from cache to prevent filling storage
 */
function trimCache(cacheName, maxItems) {
  caches.open(cacheName).then(function(cache) {
    cache.keys().then(function(keys) {
      if (keys.length > maxItems) {
        // Delete oldest items (first in = first cached)
        var deleteCount = keys.length - maxItems;
        for (var i = 0; i < deleteCount; i++) {
          cache.delete(keys[i]);
        }
        console.log('[SW] Trimmed ' + deleteCount + ' items from ' + cacheName);
      }
    });
  });
}

function isImageRequest(request) {
  var url = new URL(request.url);
  return /\.(jpg|jpeg|png|gif|webp|svg|ico|avif)$/i.test(url.pathname) ||
         (request.destination === 'image');
}

function isModuleRequest(request) {
  var url = new URL(request.url);
  return url.pathname.endsWith('.js') ||
         url.pathname.endsWith('.css') ||
         url.pathname.includes('/js/modules/') ||
         url.pathname.includes('/css/');
}

function isFontRequest(request) {
  var url = new URL(request.url);
  return /\.(woff2?|ttf|otf|eot)$/i.test(url.pathname) ||
         url.hostname.includes('fonts.googleapis.com') ||
         url.hostname.includes('fonts.gstatic.com') ||
         (request.destination === 'font');
}

// ============================================
// MESSAGE HANDLING
// ============================================

self.addEventListener('message', function(event) {
  var data = event.data || {};

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(function(cacheNames) {
        return Promise.all(cacheNames.map(function(name) {
          return caches.delete(name);
        }));
      }).then(function() {
        console.log('[SW] All caches cleared');
      })
    );
  }

  // Prefetch deal images in background (call after deals load)
  if (data.type === 'PREFETCH_IMAGES' && Array.isArray(data.urls)) {
    event.waitUntil(
      caches.open(CACHE_NAMES.IMAGES).then(function(cache) {
        return Promise.allSettled(
          data.urls.map(function(url) {
            return cache.match(url).then(function(cached) {
              if (cached) return; // Already cached, skip
              return fetch(url, { mode: 'no-cors' })
                .then(function(response) {
                  return cache.put(url, response);
                })
                .catch(function() {}); // Silently skip failed images
            });
          })
        );
      }).then(function() {
        console.log('[SW] Prefetched ' + data.urls.length + ' images');
      })
    );
  }

  // Cleanup unused product images (from old brands/deals)
  if (data.type === 'CLEANUP_IMAGES' && Array.isArray(data.currentImageUrls)) {
    event.waitUntil(cleanupUnusedImages(data.currentImageUrls));
  }

  // Cleanup old cached sheets (keep only active ones)
  if (data.type === 'CLEANUP_SHEET_CACHE' && Array.isArray(data.keepSheets)) {
    event.waitUntil(cleanupOldSheets(data.keepSheets));
  }

  // Receive the currently active opensheet URL from frontend
  if (data.type === 'SET_ACTIVE_SHEET') {
    activeSheetUrl = data.url || null;
    event.waitUntil(cleanupOldSheets(activeSheetUrl ? [activeSheetUrl] : []));
  }
});

// ============================================
// BACKGROUND SYNC — Retry failed requests
// ============================================

self.addEventListener('sync', function(event) {
  if (event.tag === 'sync-deals') {
    event.waitUntil(
      fetch('/').then(function() {
        console.log('[SW] Background sync complete');
        return self.clients.matchAll().then(function(clients) {
          clients.forEach(function(client) {
            client.postMessage({ type: 'DEALS_SYNCED' });
          });
        });
      }).catch(function(error) {
        console.warn('[SW] Background sync failed:', error);
      })
    );
  }
});

// ============================================
// PUSH NOTIFICATIONS
// ============================================

self.addEventListener('push', function(event) {
  var data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Allpree', {
      body: data.body || 'New deals available!',
      icon: '/img/AllPreepwaapp.png',
      badge: '/img/AllPreepwaapp.png',
      vibrate: [200, 100, 200],
      data: { url: data.url || '/' },
      actions: [
        { action: 'open', title: 'View Deals' },
        { action: 'dismiss', title: 'Later' }
      ]
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'dismiss') return;

  var targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // If app is already open, focus it
        for (var i = 0; i < clientList.length; i++) {
          if (clientList[i].url.includes('allpree') && 'focus' in clientList[i]) {
            clientList[i].navigate(targetUrl);
            return clientList[i].focus();
          }
        }
        // Otherwise open new window
        return self.clients.openWindow(targetUrl);
      })
  );
});

// ============================================
// CLEANUP HELPERS (from sw.md)
// ============================================

/**
 * Remove cached product images that are no longer in use.
 * Called from frontend when deals reload with new data.
 */
function cleanupUnusedImages(currentImageUrls) {
  return caches.open(CACHE_NAMES.IMAGES).then(function(cache) {
    return cache.keys().then(function(cachedRequests) {
      var keepSet = {};
      currentImageUrls.forEach(function(url) {
        try {
          keepSet[new URL(url, self.location.origin).href] = true;
        } catch(e) {}
      });

      var deletePromises = cachedRequests.filter(function(request) {
        // Only clean up product images, not app icons
        return request.url.includes('/products/images/') && !keepSet[request.url];
      }).map(function(request) {
        console.log('[SW] Deleted unused image: ' + request.url);
        return cache.delete(request);
      });

      return Promise.all(deletePromises);
    });
  });
}

/**
 * Remove cached opensheet responses that are no longer active.
 * Prevents stale deal data from accumulating in the cache.
 */
function cleanupOldSheets(keepList) {
  keepList = keepList || [];
  return caches.open(CACHE_NAMES.API).then(function(cache) {
    return cache.keys().then(function(cachedRequests) {
      var keepSet = {};
      keepList.forEach(function(url) { keepSet[url] = true; });

      var deletePromises = cachedRequests.filter(function(request) {
        return request.url.includes('opensheet.elk.sh') && !keepSet[request.url];
      }).map(function(request) {
        console.log('[SW] Deleted stale sheet: ' + request.url);
        return cache.delete(request);
      });

      return Promise.all(deletePromises);
    });
  });
}

console.log('[SW] Service Worker v4.0.0 loaded');