/**
 * My Stores Module
 * Simple storage for My List brands
 * Works as sub-setting of Takeover mode
 */

const MY_STORES_KEY = 'myStoresList';

/**
 * Add brand to My List (from QR scan)
 */
function addToMyStores(brandName) {
  if (!brandName) return false;
  brandName = brandName.trim();
  
  const myStores = getMyStores();
  if (!myStores.includes(brandName)) {
    myStores.push(brandName);
    localStorage.setItem(MY_STORES_KEY, JSON.stringify(myStores));
    console.log('[MyList] Added:', brandName);
    return true;
  }
  return false;
}

/**
 * Remove brand from My List
 */
function removeFromMyStores(brandName) {
  if (!brandName) return false;
  brandName = brandName.trim();
  
  const myStores = getMyStores();
  const index = myStores.indexOf(brandName);
  if (index !== -1) {
    myStores.splice(index, 1);
    localStorage.setItem(MY_STORES_KEY, JSON.stringify(myStores));
    console.log('[MyList] Removed:', brandName);
    return true;
  }
  return false;
}

/**
 * Get My List
 */
function getMyStores() {
  return JSON.parse(localStorage.getItem(MY_STORES_KEY) || '[]');
}

/**
 * Clear My List
 */
function clearMyStores() {
  localStorage.removeItem(MY_STORES_KEY);
  console.log('[MyList] Cleared');
}

/**
 * Check URL for QR code parameter
 */
function checkQRCodeParam() {
  const urlParams = new URLSearchParams(window.location.search);
  const storeBrand = urlParams.get('store') || urlParams.get('addstore') || urlParams.get('mystore');
  
  if (storeBrand) {
    addToMyStores(storeBrand);
    urlParams.delete('store');
    urlParams.delete('addstore');
    urlParams.delete('mystore');
    const newUrl = urlParams.toString() 
      ? window.location.pathname + '?' + urlParams.toString() + window.location.hash
      : window.location.pathname + window.location.hash;
    window.history.replaceState({}, '', newUrl);
  }
}

// Check QR on load
checkQRCodeParam();

// Expose functions globally
window.addToMyStores = addToMyStores;
window.removeFromMyStores = removeFromMyStores;
window.getMyStores = getMyStores;
window.clearMyStores = clearMyStores;