/**
 * My Stores - Add/Remove Stores Feature
 * This file adds My Stores button next to Takeover button
 * Copy this code to the end of loadDeals.js
 */

// ============================================
// MY STORES BUTTON - Add after the takeover button code
// ============================================

/*
// Add this code after the takeover override button section:

  // My Stores button (shows when user has saved stores from QR codes)
  const myStoresList = typeof getMyStores === 'function' ? getMyStores() : [];
  const isMyStoresOverride = typeof isMyStoresOverrideActive === 'function' && isMyStoresOverrideActive();
  
  if (myStoresList.length > 0 && !isMyStoresOverride) {
    const myStoresBtn = document.createElement('button');
    myStoresBtn.textContent = `🏪 My Stores (${myStoresList.length})`;
    myStoresBtn.id = 'myStoresButton';
    myStoresBtn.className = 'my-stores-button';
    myStoresBtn.style.cssText = `
      margin: 1rem auto;
      display: block;
      padding: 12px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 25px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    `;
    
    myStoresBtn.addEventListener('click', () => {
      // Set override for 5 minutes to show all brands
      sessionStorage.setItem('myStoresOverrideUntil', (Date.now() + 5 * 60 * 1000).toString());
      location.reload();
    });
    
    container.appendChild(myStoresBtn);
  }
  
  // If My Stores override is active, show "Back to My Stores" button
  if (isMyStoresOverride && myStoresList.length > 0) {
    const backBtn = document.createElement('button');
    backBtn.textContent = '← Back to My Stores';
    backBtn.id = 'backToMyStoresButton';
    backBtn.style.cssText = `
      margin: 1rem auto;
      display: block;
      padding: 12px 24px;
      background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
      color: white;
      border: none;
      border-radius: 25px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
    `;
    
    backBtn.addEventListener('click', () => {
      sessionStorage.removeItem('myStoresOverrideUntil');
      location.reload();
    });
    
    container.appendChild(backBtn);
  }
*/

// ============================================
// MY STORES MODE - Add this in the sheet filtering section
// ============================================

/*
// Replace the sheet filtering code with this:

    // Skip sheets based on active mode
    if (activeMode === 'takeover') {
      // Takeover: Only load the takeover brand's sheet
      if (!rows.some(row => row.BrandName === selectedTakeoverBrand)) {
        console.log(`Skipping sheet ${i} due to takeover mode.`);
        continue;
      }
    } else if (activeMode === 'mystores') {
      // My Stores: Only load sheets for brands in the list
      const hasMyStoreBrand = rows.some(row => 
        myStoresList.some(storeBrand => 
          row.BrandName && row.BrandName.toLowerCase().includes(storeBrand.toLowerCase())
        )
      );
      if (!hasMyStoreBrand) {
        console.log(`Skipping sheet ${i} due to My Stores mode.`);
        continue;
      }
    }
*/