/**
 * Initialization & Data Loading Module
 * Handles app initialization and data fetching
 */

// Global variables
let sheetUrls = [];
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
 */
async function loadSheetUrls() {
  try {
    const response = await fetch('https://opensheet.elk.sh/1WcTbHLTOpUl-TK7r0rTWZ_PuT0umIaBc00tzGZozgFw/Sheet1');
    const data = await response.json();
    sheetUrls = data.map(row => row.sheeturls);
    console.log(sheetUrls);
    init();
  } catch (err) {
    console.error('Failed to load sheet URLs:', err);
  }
}

/**
 * Load brand locations from Google Sheets
 */
async function loadBrandLocations() {
  try {
    const res = await fetch('https://opensheet.elk.sh/19K8yc9jeDGb4BRjKq_lE_Xh0d-K7p-f24QtnP7vv0sQ/Sheet1');
    if (!res.ok) throw new Error('Failed to fetch locations from Google Sheet');

    const data = await res.json();
    brandLocations = {};

    data.forEach(row => {
      const brand = row.parentBrand?.trim();
      const store = row.storeLocation?.trim();
      const coords = row.coordinates?.trim();

      if (!brand || !store) return;

      if (!brandLocations[brand]) {
        brandLocations[brand] = {};
      }

      brandLocations[brand][store] = coords || " ";
    });

    console.log("Loaded brand locations:", brandLocations);
  } catch (err) {
    console.error('Failed to load brand locations:', err);
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