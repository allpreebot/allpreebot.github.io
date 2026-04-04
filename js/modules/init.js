/**
 * Initialization & Data Loading Module
 * Handles app initialization and data fetching
 */

// Global variables
let sheetUrls = [];
let sheetData = [];  // [{url, brandName}, ...] — with priority info
const allBrandsData = [];
const allDealsFlat = [];
let allDealsFromSheets = [];

/**
 * Hide splash screen and show main app
 */
function showMainApp() {
  const splash = document.getElementById('splash-screen');
  const mainApp = document.getElementById('main-app');
  
  if (splash) splash.style.display = 'none';
  if (mainApp) mainApp.style.display = 'block';
  
  document.body.classList.remove('noscroll');
}

/**
 * Initialize the app
 */
async function init() {
  await loadBrandLocations();
  await loadDeals();
  showMainApp();
}

/**
 * Load sheet URLs from Google Sheets
 * - Reads brandName column for priority sorting
 * - Priority: Takeover > Favorite > Ranked > My Stores > rest
 * - Caches to localStorage for offline boot
 */
async function loadSheetUrls() {
  try {
    const response = await fetchWithTimeout('https://opensheet.elk.sh/1WcTbHLTOpUl-TK7r0rTWZ_PuT0umIaBc00tzGZozgFw/Sheet1');
    
    if (response && !response.error && Array.isArray(response)) {
      // Build sheet data with brand names
      sheetData = response
        .map(row => ({ url: row.sheeturls, brandName: row.brandName || '' }))
        .filter(d => d.url);
      
      // Sort by priority — important brands load first
      sheetData = prioritizeSheets(sheetData);
      sheetUrls = sheetData.map(d => d.url);
      
      // Cache for offline use
      localStorage.setItem('cachedSheetData', JSON.stringify(sheetData));
      console.log('[Init] Sheet data loaded:', sheetData.length, 'sheets (priority-sorted)');
    } else {
      throw new Error(response?.error || 'Invalid response');
    }
    
    init();
  } catch (err) {
    console.warn('[Init] Network failed for sheet URLs, trying cache...', err);
    
    // Try new cache format first
    const cached = localStorage.getItem('cachedSheetData');
    if (cached) {
      sheetData = JSON.parse(cached);
      sheetUrls = sheetData.map(d => d.url);
      console.log('[Init] Using cached sheet data:', sheetData.length, 'sheets');
      init();
    } else {
      // Fall back to old cache format (just URLs, no brand names)
      const oldCached = localStorage.getItem('cachedSheetUrls');
      if (oldCached) {
        sheetUrls = JSON.parse(oldCached);
        sheetData = sheetUrls.map(url => ({ url, brandName: '' }));
        console.log('[Init] Using legacy cached URLs:', sheetUrls.length);
        init();
      } else {
        console.error('[Init] No cached sheet data — app cannot load deals');
        showMainApp();
      }
    }
  }
}

/**
 * Sort sheets so priority brands load first
 * Order: Takeover → Favorite → Ranked slots → My Stores → everything else
 */
function prioritizeSheets(sheets) {
  const takeover = (localStorage.getItem('selectedTakeoverBrand') || '').toLowerCase();
  const favorite = (localStorage.getItem('selectedFavoriteBrand') || '').toLowerCase();
  
  var ranked = [];
  for (var i = 1; i <= 5; i++) {
    var b = localStorage.getItem('rankedSlot' + i);
    if (b) ranked.push(b.toLowerCase());
  }
  
  var myStores = [];
  try {
    myStores = JSON.parse(localStorage.getItem('myStoresList') || '[]')
      .map(function(s) { return s.toLowerCase(); });
  } catch(e) {}

  function getPriority(brandName) {
    if (!brandName) return 99;
    var name = brandName.toLowerCase();
    if (takeover && name === takeover) return 0;  // Takeover first
    if (favorite && name === favorite) return 1;  // Favorite second
    if (ranked.indexOf(name) !== -1) return 2;    // Ranked slots third
    if (myStores.indexOf(name) !== -1) return 3;  // My Stores fourth
    return 99;                                     // Everything else
  }

  return sheets.slice().sort(function(a, b) {
    return getPriority(a.brandName) - getPriority(b.brandName);
  });
}

/**
 * Load brand locations from Google Sheets
 * Caches to localStorage so location pins work offline
 */
async function loadBrandLocations() {
  try {
    const response = await fetchWithTimeout('https://opensheet.elk.sh/19K8yc9jeDGb4BRjKq_lE_Xh0d-K7p-f24QtnP7vv0sQ/Sheet1');
    
    if (response && !response.error && Array.isArray(response)) {
      brandLocations = {};

      response.forEach(row => {
        const brand = row.parentBrand?.trim();
        const store = row.storeLocation?.trim();
        const coords = row.coordinates?.trim();

        if (!brand || !store) return;

        if (!brandLocations[brand]) {
          brandLocations[brand] = {};
        }

        brandLocations[brand][store] = coords || " ";
      });

      // Cache for offline use
      localStorage.setItem('cachedBrandLocations', JSON.stringify(brandLocations));
      console.log('[Init] Brand locations loaded from network:', Object.keys(brandLocations).length);
    } else {
      throw new Error(response?.error || 'Invalid response');
    }
  } catch (err) {
    console.warn('[Init] Network failed for locations, trying cache...', err);
    
    const cached = localStorage.getItem('cachedBrandLocations');
    if (cached) {
      brandLocations = JSON.parse(cached);
      console.log('[Init] Using cached brand locations:', Object.keys(brandLocations).length);
    } else {
      brandLocations = {};
      console.warn('[Init] No cached locations — map pins will not work');
    }
  }
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url, timeout = 7000) {
  return Promise.race([
    fetch(url).then(res => res.json()),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
  ]).catch(error => ({ error }));
}

/**
 * Shuffle array in place
 */
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Start loading (called from loader.js after all modules are ready)
// loadSheetUrls();