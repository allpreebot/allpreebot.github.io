/**
 * Module Loader - Loads all PWA modules from server
 * This keeps your code hidden from the HTML file
 */

(function() {
  // External libraries to load first
  const EXTERNAL_LIBS = [
    'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js'
  ];

  const MODULES = [
    // Core utilities & setup (must load first)
    'loading.js',
    'utilities.js',
    'myStores.js',       // Must load before loadDeals.js (getMyStores)
    'init.js',
    'panel.js',
    // Admin
    'admin.js',
    'adminFetch.js',     // Fetches featured/takeover/ranked brand config
    // Brand selection popups
    'favoriteBrands.js',
    'takeoverBrand.js',
    // Cart & location
    'cart.js',
    'location.js',
    'savedLists.js',
    // Deal popup & liked deals (likedDeals before dealPopup to avoid duplicate let)
    'likedDeals.js',
    'dealPopup.js',
    // Main deal loading (depends on all above)
    'loadDeals.js',
    // pwa2 modules
    'splash.js',
    'pwaInstall.js',
    'leaderboard.js',
    'offline.js',
    'deviceTracking.js',
    'stories.js',
    // QR scanner
    'qrScanner.js'
  ];

  const BASE_URL = 'js/modules/';
  const CONFIG_URL = 'js/';

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => {
        console.log('✅ Loaded: ' + src);
        resolve();
      };
      script.onerror = () => {
        console.error('❌ Failed: ' + src);
        reject(new Error('Failed to load ' + src));
      };
      document.body.appendChild(script);
    });
  }

  async function loadAllModules() {
    // Load config first (from js/ folder)
    console.log('🚀 Loading config...');
    try {
      await loadScript(CONFIG_URL + 'config.js');
    } catch (error) {
      console.error('Error loading config.js:', error);
    }
    
    // Load external libraries
    console.log('🚀 Loading external libraries...');
    for (const lib of EXTERNAL_LIBS) {
      try {
        await loadScript(lib);
      } catch (error) {
        console.error('Error loading ' + lib + ':', error);
      }
    }
    
    // Load modules (from js/modules/ folder)
    console.log('🚀 Loading PWA modules...');
    for (const module of MODULES) {
      try {
        await loadScript(BASE_URL + module);
      } catch (error) {
        console.error('Error loading ' + module + ':', error);
      }
    }
    
    console.log('✅ All modules loaded!');
    
    // Start the app after all modules are ready
    if (typeof loadSheetUrls === 'function') {
      console.log('🚀 Starting app...');
      loadSheetUrls();
    } else {
      console.error('loadSheetUrls function not found!');
    }
  }

  // Start loading when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAllModules);
  } else {
    loadAllModules();
  }

})();