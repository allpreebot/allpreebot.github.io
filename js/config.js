/**
 * App Configuration
 * Central place for all API URLs and settings
 * 
 * Usage: All modules reference config.SHEET_URLS.xxx
 */

const config = {
  // ============================================
  // GOOGLE SHEETS - opensheet.elk.sh URLs
  // ============================================
  SHEET_URLS: {
    // Main deals data
    deals: 'https://opensheet.elk.sh/1WcTbHLTOpUl-TK7r0rTWZ_PuT0umIaBc00tzGZozgFw/Sheet1',
    
    // Additional deals data
    deals2: 'https://opensheet.elk.sh/19K8yc9jeDGb4BRjKq_lE_Xh0d-K7p-f24QtnP7vv0sQ/Sheet1',
    
    // Profile/User data
    profile: 'https://opensheet.elk.sh/169KgT37g1HPVkzH-NLmANR4wAByHtLy03y5bnjQA21o/appdata',
    
    // Add more sheets as needed
    // brands: 'https://opensheet.elk.sh/xxx/Sheet1',
    // users: 'https://opensheet.elk.sh/xxx/Sheet1',
  },

  // ============================================
  // GOOGLE APPS SCRIPT - POST URLs
  // ============================================
  SCRIPT_URLS: {
    // Main script for POST operations
    main: 'https://script.google.com/macros/s/AKfycbxl-2XeXXvcOE4VTHVp-7fFnzvpoj8qqI_O2ZfjgVAm0e1sC9NQxRYJTlCFM2LrXLH3/exec',
    
    // Add more scripts as needed
    // analytics: 'https://script.google.com/macros/s/xxx/exec',
  },

  // ============================================
  // APP SETTINGS
  // ============================================
  SETTINGS: {
    // Override durations (in milliseconds)
    takeoverOverrideDuration: 60 * 1000,      // 1 minute
    myListOverrideDuration: 60 * 1000,         // 1 minute
    
    // Cache durations
    cacheRefreshInterval: 5 * 60 * 1000,       // 5 minutes
    
    // WhatsApp contact
    whatsappNumber: '18764604563',
    
    // App info
    appName: 'AllPree',
    appVersion: '1.0.0',
  },

  // ============================================
  // STORAGE KEYS
  // ============================================
  STORAGE_KEYS: {
    // User profile
    profileLogin: 'profileLogin',
    deviceId: 'deviceId',
    
    // Takeover
    selectedTakeoverBrand: 'selectedTakeoverBrand',
    originalTakeoverBrand: 'originalTakeoverBrand',
    overrideTakeoverUntil: 'overrideTakeoverUntil',
    
    // My List
    myStoresList: 'myStoresList',
    myListActive: 'myListActive',
    myListTimer: 'myListTimer',
    
    // Deals
    likedDeals: 'likedDeals',
    cart: 'cart',
  },

  // ============================================
  // THEME COLORS
  // ============================================
  COLORS: {
    primary: '#163A5C',
    secondary: '#2066A7',
    accent: '#059669',
    background: '#e7ebf2',
    text: '#333333',
  }
};

// Freeze config to prevent accidental changes
Object.freeze(config);
Object.freeze(config.SHEET_URLS);
Object.freeze(config.SCRIPT_URLS);
Object.freeze(config.SETTINGS);
Object.freeze(config.STORAGE_KEYS);
Object.freeze(config.COLORS);

// Make available globally
window.config = config;