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
    'loading.js',
    'utilities.js',
    'init.js',
    'panel.js',
    'admin.js',
    'favoriteBrands.js',
    'takeoverBrand.js',
    'cart.js',
    'location.js',
    'savedLists.js',
    'likedDeals.js',
    'dealPopup.js',
    'loadDeals.js',
    // pwa2 modules
    'splash.js',
    'pwaInstall.js',
    'leaderboard.js',
    'offline.js',
    'deviceTracking.js',
    'stories.js',
    // my stores module
    'myStores.js',
    // qr scanner module
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