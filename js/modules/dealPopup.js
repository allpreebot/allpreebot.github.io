/**
 * Deal Popup Module
 * Handles deal popup display, swipe navigation, and interactions
 *
 * Depends on:
 *   - likedDeals.js (isLikedMode, likedDealIndex, likedDealKeys, showLikedDealsInPopup, goToNextLikedDeal, goToPrevLikedDeal, cleanUpLikedDeals, renderLikedDealsGallery)
 *   - init.js (fetchWithTimeout, shuffleArray, allDealsFlat, allBrandsData)
 *   - utilities.js (getDealKey)
 *   - cart.js (addToCart)
 *   - loading.js (showSpinner, hideSpinner)
 */

let currentPopupDeal = null;
let isBrandMode = false;
let brandDealIndex = 0;
let brandDealKeys = [];
let popupCountdownInterval = null;
let isSwiping = false;

// ============================
// Countdown Timer
// ============================

function startPopupCountdown(expireDate, el) {
  if (!el || !expireDate) return;

  const parsedDate = Date.parse(expireDate);

  if (isNaN(parsedDate) || parsedDate < Date.now()) {
    el.textContent = "⏳ Coming soon";
    el.classList.add("countdown-upcoming");
    return;
  }

  if (popupCountdownInterval) {
    clearInterval(popupCountdownInterval);
    popupCountdownInterval = null;
  }

  function updateCountdown() {
    const now = new Date();
    const endTime = new Date(parsedDate);
    const diff = endTime - now;

    if (diff <= 0) {
      el.textContent = "❌ Deal expired";
      el.classList.add("countdown-ended");
      clearInterval(popupCountdownInterval);
      popupCountdownInterval = null;
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    let timeStr = `${days}d ${hours}h ${minutes}m ${seconds}s left`;
    el.textContent = `⏳ ${timeStr}`;
  }

  updateCountdown();
  popupCountdownInterval = setInterval(updateCountdown, 1000);
}

// ============================
// Open Popup
// ============================

function openPopup({ image, name, original, discount, description, brandLogo, brandName, sourceUrl }, skipHistory = false) {
  const originalPrice = parseFloat(original.replace(/,/g, '')) || 0;
  const discountPrice = parseFloat(discount.replace(/,/g, '')) || 0;
  const percentOff = originalPrice && discountPrice ? Math.round((1 - discountPrice / originalPrice) * 100) : 0;
  const savings = originalPrice - discountPrice;

  const cashbackPercent = 49;
  const cashbackAmount = Math.round(discountPrice * cashbackPercent / 100);
  const finalPrice = discountPrice - cashbackAmount;

  const cashbackEl = document.getElementById('popupCashback');
  cashbackEl.innerHTML = `Club Savings: upto J$${cashbackAmount.toLocaleString()} (${cashbackPercent}%) <br> <span class="final-price">Club Price: downto J$${finalPrice.toLocaleString()} — Over ¹²¹ Days </span> <br><br>New to Allpree? <a href="#" id="account">Create Account & Join The Club</a>`;

  document.body.classList.add('noscroll');

  currentPopupDeal = { image, name, original, discount, description, brandLogo, brandName, sourceUrl };

  document.getElementById('popupImg').src = image;
  document.getElementById('popupTitle').textContent = name;
  document.getElementById('popupPrice').textContent = `Original Price: JMD $${original}`;
  document.getElementById('popupDiscount').textContent = `Now: JMD $${discount}`;
  document.getElementById('popupDesc').innerHTML = formatDescription(description || '');
  document.getElementById('popupBadge').textContent = `${percentOff}% OFF`;
  document.getElementById('popupSavings').textContent = `SAVINGS $${savings.toLocaleString()}`;

  document.getElementById('brandLogo').src = brandLogo;
  document.getElementById('brandLogo').alt = brandName;
  document.getElementById('brandName').textContent = brandName;

  const popupTimerEl = document.getElementById('popupTimer');
  popupTimerEl.textContent = 'Loading...';
  popupTimerEl.classList.remove('countdown-ended', 'countdown-urgent');

  const brandInfo = allBrandsData.find(b => b.brand === brandName);

  // Wait for the popup to be fully populated before injecting badges
  setTimeout(() => {
    const badgeContainer = document.querySelector('#popup .brand-logo-container');
    if (!badgeContainer) return console.warn('No badge container in popup');

    // Remove old badges (including any future types)
    badgeContainer.querySelectorAll('.badge-premium, .badge-pro, .badge-starter, .badge-exclusive')
      .forEach(el => el.remove());

    if (brandInfo) {
      // Normalize case to avoid mismatches like 'True' vs 'true'
      const isPro = brandInfo.Pro?.toLowerCase() === 'true';
      const isPremium = brandInfo.Premium?.toLowerCase() === 'true';
      const isStarter = brandInfo.Starter?.toLowerCase() === 'true';
      const isExclusive = brandInfo.Exclusive?.toLowerCase() === 'true';

      let badge;

      if (isExclusive) {
        badge = document.createElement('div');
        badge.className = 'badge-exclusive';
        badge.textContent = '🏆';
      } else if (isStarter) {
        badge = document.createElement('div');
        badge.className = 'badge-starter';
        badge.textContent = '🎁';
      } else if (isPro) {
        badge = document.createElement('div');
        badge.className = 'badge-pro';
        badge.textContent = '👑';
      } else if (isPremium) {
        badge = document.createElement('div');
        badge.className = 'badge-premium';
        badge.textContent = '💎';
      }

      if (badge) {
        badgeContainer.appendChild(badge);
        console.log('Badge added to popup:', badge.outerHTML);
      } else {
        console.log('No matching badge type found for brandInfo:', brandInfo);
      }
    }
  }, 100);


  if (brandInfo?.expireDate) {
    startPopupCountdown(brandInfo.expireDate, popupTimerEl);
  }

  const backArrow = document.getElementById('popupBack');
  backArrow.style.display = window.history.length > 1 ? 'block' : 'none';

  if (!skipHistory) {
    history.pushState({ popup: true, dealName: name }, '', '');
  }

  document.getElementById('popup').style.display = 'flex';
  setupLikeButton(currentPopupDeal);
  setupAddToCartButton(currentPopupDeal);
}

// ============================
// Like Button
// ============================

function setupLikeButton(deal) {
  const likeContainer = document.getElementById('likeButtonContainer');

  // Hide like button in brand mode
  if (typeof isBrandMode !== 'undefined' && isBrandMode) {
    likeContainer?.classList.add('hidden');
    return;
  } else {
    likeContainer?.classList.remove('hidden');
  }

  const likeBtn = document.getElementById('popupLikeBtn');
  if (!likeBtn || !deal || !deal.name) {
    console.warn('Like button or deal missing:', { likeBtn, deal });
    return;
  }

  const dealKey = getDealKey(deal);
  console.log('Setting up like button for:', deal.name, 'Key:', dealKey);

  const likedDeals = JSON.parse(localStorage.getItem('likedDeals') || '{}');
  const isLiked = !!likedDeals[dealKey];

  console.log('Is this deal already liked?', isLiked);
  likeBtn.classList.toggle('liked', isLiked);
  likeBtn.textContent = isLiked ? '❤️ Like' : '🤍 Like';

  likeBtn.onclick = () => {
    console.log('Like button clicked for:', deal.name);
    const updatedLikedDeals = JSON.parse(localStorage.getItem('likedDeals') || '{}');

    const isNowLiked = likeBtn.classList.toggle('liked');
    likeBtn.textContent = isNowLiked ? '❤️ Like' : '🤍 Like';
    console.log('Deal is now liked?', isNowLiked);

    const original = parseFloat(deal.original?.toString().replace(/,/g, '') || '0');
    const discount = parseFloat(deal.discount?.toString().replace(/,/g, '') || '0');
    const percentOff = original && discount
      ? Math.round(((original - discount) / original) * 100)
      : 0;

    if (isNowLiked) {
      updatedLikedDeals[dealKey] = {
        ...deal,
        percentOff,
        _id: dealKey
      };
      console.log('Added to liked deals:', updatedLikedDeals[dealKey]);
    } else {
      delete updatedLikedDeals[dealKey];
      console.log('Removed from liked deals:', dealKey);
    }

    localStorage.setItem('likedDeals', JSON.stringify(updatedLikedDeals));
    console.log('Updated localStorage:', updatedLikedDeals);

    renderLikedDealsGallery();
  };
}

// ============================
// Add To Cart Button
// ============================

function setupAddToCartButton(deal) {
  const cartBtnContainer = document.getElementById('cartBtnContainer');
  const addToCartBtn = document.getElementById('popupAddToCartBtn');

  if (typeof isBrandMode === 'undefined' || !isBrandMode) {
    cartBtnContainer?.classList.add('hidden');
    return;
  } else {
    cartBtnContainer?.classList.remove('hidden');
  }

  if (!addToCartBtn || !deal || !deal.name) {
    console.warn('Cart button or deal missing:', { addToCartBtn, deal });
    return;
  }

  const brand = deal.brandName?.trim() || 'Unknown';
  const dealKey = getDealKey(deal);

  const checkIfInCart = () => {
    const cart = JSON.parse(localStorage.getItem('cartItems') || '{}');
    const brandCart = cart[brand] || [];
    return brandCart.some(item => item._id === dealKey);
  };

  updateCartBtnState(checkIfInCart());

  addToCartBtn.onclick = () => {
    const isInCart = checkIfInCart();
    updateCartBtnState(!isInCart); // Update UI instantly
    addToCart(deal); // Then handle logic + real cart update
  };

  function updateCartBtnState(isNowInCart) {
    addToCartBtn.classList.toggle('in-cart', isNowInCart);
    addToCartBtn.textContent = isNowInCart ? '❌ Del' : '🛒 Add';
  }
}

// ============================
// Close Popup
// ============================

function closePopup() {
  document.getElementById('popup').style.display = 'none';
  currentPopupDeal = null;
  document.body.classList.remove('noscroll');

  // FULL RESET here:
  isBrandMode = false;
  isLikedMode = false;

  // Reset tab buttons inside the popup (if you have any active classes)
  const tabs = document.querySelectorAll('.tab-switcher .tab-btn');
  tabs.forEach(tab => tab.classList.remove('active'));

  // Optional: highlight random tab as the default
  const randomTab = document.getElementById('showRandomBtn');
  if (randomTab) randomTab.classList.add('active');
}

function resetTabsToNormal() {
  // Reset the active tab to the "random" deals tab
  highlightTab('showRandomBtn'); // Assumes 'showRandomBtn' is the button for the random tab
  isBrandMode = false; // Reset brand mode
  isLikedMode = false; // Reset liked mode

  // Optionally, reset any other state or UI changes that were specific to the popup
  document.body.classList.remove('noscroll'); // Allow scrolling again after popup close
  // Hide the popup
  document.getElementById('popup').style.display = 'none';

  // Optionally clear any other custom settings (e.g., reset any custom button styles or selected elements)
  // Example: reset the popup content (optional)
  document.getElementById('popupImg').src = '';
  document.getElementById('popupTitle').textContent = '';
  document.getElementById('popupPrice').textContent = '';
  document.getElementById('popupDiscount').textContent = '';
  document.getElementById('popupDesc').textContent = '';
  document.getElementById('popupBadge').textContent = '';
  document.getElementById('popupSavings').textContent = '';
  document.getElementById('popupTimer').textContent = '';
}

// ============================
// Tab Highlighting
// ============================

function highlightTab(tabId) {
  // Reset the styles for all tabs
  const tabs = document.querySelectorAll('.tab-switcher .tab-btn');
  tabs.forEach(tab => tab.classList.remove('active'));

  // Add the active class to the selected tab
  const selectedTab = document.getElementById(tabId);
  if (selectedTab) {
    selectedTab.classList.add('active');
  }
}

// ============================
// Window Popstate Handler (combined both versions from pwa.md)
// ============================

window.onpopstate = function (event) {
  if (event.state && event.state.popup) {
    if (event.state.dealName) {
      // Try to restore the deal by name
      const deal = allDealsFlat.find(d => d.name === event.state.dealName);
      if (deal) {
        openPopup(deal, true); // skip history push
        return;
      }
    }
    // Fallback: just reset tabs
    resetTabsToNormal();
  } else {
    // No popup state — close popup if open
    const popup = document.getElementById('popup');
    if (popup && popup.style.display === 'flex') {
      closePopup();
    }
  }
};

// ============================
// Close popup by clicking outside
// ============================

document.getElementById('popup').addEventListener('click', function (e) {
  if (e.target === this) {
    resetTabsToNormal();
  }
});

// ============================
// Brand Deals in Popup
// ============================

function showBrandDealsInPopup(brandName) {
  isBrandMode = true; // Set this before calling openPopup
  isLikedMode = false; // Disable liked mode (random deals)
  highlightTab('showBrandTabBtn'); // Highlight the "Brand" tab

  // Filter all deals to get the selected brand's deals
  const sourceUrl = currentPopupDeal.sourceUrl;
  const brandDeals = allDealsFlat.filter(d => d.brandName === brandName && d.sourceUrl === sourceUrl);

  if (!brandDeals.length) {
    alert("No deals for " + brandName);
    return;
  }

  brandDealKeys = brandDeals.map(d => d.name);
  brandDealIndex = 0;

  // Check if the current deal is from this brand to maintain position
  const currentKey = getDealKey(currentPopupDeal);
  const startIndex = brandDeals.findIndex(d => getDealKey(d) === currentKey);
  brandDealIndex = startIndex !== -1 ? startIndex : 0;

  const deal = brandDeals[brandDealIndex];

  // Show only brand deals in the "Brand" tab
  openPopup(deal, true); // Skip history push
}


function goToNextBrandDeal() {
  if (!brandDealKeys.length || !currentPopupDeal) return;

  brandDealIndex = (brandDealIndex + 1) % brandDealKeys.length;
  const nextDealName = brandDealKeys[brandDealIndex];

  // Find the next deal specific to the current brand and location
  const deal = allDealsFlat.find(d =>
    d.name === nextDealName &&
    d.brandName === currentPopupDeal.brandName &&
    d.sourceUrl === currentPopupDeal.sourceUrl
  );

  if (deal) {
    openPopup(deal, true);
  }
}

function goToPrevBrandDeal() {
  if (!brandDealKeys.length || !currentPopupDeal) return;

  brandDealIndex = (brandDealIndex - 1 + brandDealKeys.length) % brandDealKeys.length;
  const prevDealName = brandDealKeys[brandDealIndex];

  // Find the previous deal specific to the current brand and location
  const deal = allDealsFlat.find(d =>
    d.name === prevDealName &&
    d.brandName === currentPopupDeal.brandName &&
    d.sourceUrl === currentPopupDeal.sourceUrl
  );

  if (deal) {
    openPopup(deal, true);
  }
}

// ============================
// Random Deals in Popup
// ============================

function showRandomDealsInPopup() {
  isLikedMode = false;
  isBrandMode = false;

  const likedDeals = JSON.parse(localStorage.getItem('likedDeals') || '{}');
  const likedNames = new Set(Object.keys(likedDeals));

  const unlikedDeals = allDealsFlat.filter(deal => !likedNames.has(deal.name));

  if (unlikedDeals.length === 0) {
    alert("You've liked all the deals!");
    return;
  }

  const randomIndex = Math.floor(Math.random() * unlikedDeals.length);
  const deal = unlikedDeals[randomIndex];
  openPopup(deal, true);
}

// ============================
// Tab Button Handlers
// ============================

// showLikedBtn handler is in likedDeals.js to avoid duplication

document.getElementById('showRandomBtn').onclick = () => {
  // Only change deal if switching FROM liked/brand mode
  // If already in random mode, just keep current deal
  if (isLikedMode || isBrandMode) {
    isLikedMode = false;
    isBrandMode = false;
    highlightTab('showRandomBtn');
    showRandomDealsInPopup();
  }
};

document.getElementById('showBrandTabBtn').onclick = () => {
  const brand = currentPopupDeal?.brandName;
  if (!brand) return;
  isLikedMode = false;
  isBrandMode = true;
  highlightTab('showBrandTabBtn');
  showBrandDealsInPopup(brand);
};

// ============================
// Description Formatter
// ============================

function formatDescription(description) {
  if (!description) return '';

  // Replace bold markers (e.g., **bold**) with <strong> tags
  description = description.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Replace newlines (\n) with <br> to preserve line breaks, without showing \n to the user
  description = description.replace(/\n/g, '<br>');

  // Optional: Replace multiple consecutive <br> tags with <p> tags for paragraphs
  description = description.replace(/(<br>){2,}/g, '</p><p>');

  return description;
}

// ============================
// Brand Container Click (opens brand tab from popup header)
// ============================

const brandContainer = document.getElementById('brandContainer');
if (brandContainer) {
  brandContainer.addEventListener('click', () => {
    const brandName = document.getElementById('brandName')?.textContent?.trim();
    if (brandName) {
      showBrandDealsInPopup(brandName); // Open the brand tab with that brand
    }
  });
}

function activateBrandTab() {
  const brandTabBtn = document.getElementById('brandTabBtn');
  if (brandTabBtn) {
    brandTabBtn.click(); // Simulate user clicking on the Brand tab
  }
}

// ============================
// Popup Swipe Listeners
// ============================

let _swipeListenersAttached = false;

function addPopupSwipeListeners() {
  // Guard: only attach listeners ONCE, no matter how many times this is called
  if (_swipeListenersAttached) return;
  _swipeListenersAttached = true;

  const popup = document.getElementById('popup');
  if (!popup) return;

  let startY = 0;
  let endY = 0;

  popup.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      startY = e.touches[0].clientY;
    }
  }, { passive: true });

  popup.addEventListener('touchend', (e) => {
    endY = e.changedTouches[0].clientY;
    handleSwipe();
  }, { passive: true });

  function handleSwipe() {
    const deltaY = endY - startY;

    if (isSwiping || Math.abs(deltaY) <= 100) return;

    isSwiping = true;

    if (deltaY < 0) {
      // Swipe UP - go to next deal
      if (isLikedMode) {
        goToNextLikedDeal();
      } else if (isBrandMode) {
        goToNextBrandDeal();
      } else {
        // Random mode - show another random deal
        if (allDealsFlat.length <= 1) { isSwiping = false; return; }
        let next;
        do {
          const randomIndex = Math.floor(Math.random() * allDealsFlat.length);
          next = allDealsFlat[randomIndex];
        } while (next.name === currentPopupDeal?.name);

        document.getElementById('showLikedBtn')?.classList.remove('active');
        document.getElementById('showRandomBtn')?.classList.add('active');
        isLikedMode = false;
        isBrandMode = false;

        openPopup(next, true);
      }
    } else {
      // Swipe DOWN - show another random deal (not close)
      if (isLikedMode) {
        goToPrevLikedDeal();
      } else if (isBrandMode) {
        goToPrevBrandDeal();
      } else {
        // Random mode - show another random deal on swipe down too
        if (allDealsFlat.length <= 1) { isSwiping = false; return; }
        let prev;
        do {
          const randomIndex = Math.floor(Math.random() * allDealsFlat.length);
          prev = allDealsFlat[randomIndex];
        } while (prev.name === currentPopupDeal?.name);

        document.getElementById('showLikedBtn')?.classList.remove('active');
        document.getElementById('showRandomBtn')?.classList.add('active');
        isLikedMode = false;
        isBrandMode = false;

        openPopup(prev, true);
      }
    }

    setTimeout(() => {
      isSwiping = false;
    }, 300);
  }
}

// Initialize swipe listeners
addPopupSwipeListeners();

// ============================
// #account Click Handler (delegates to signup panel)
// ============================

document.addEventListener('click', function (event) {
  const accountLink = event.target.closest('#account');
  if (accountLink) {
    event.preventDefault();
    closePopup();
    // Trigger the signup panel via the menu button
    const realButton = document.querySelector('.menu-button[data-view="signup"]');
    if (realButton) {
      realButton.click();
    } else {
      console.error('Signup button not found.');
    }
  }
});

// ============================
// Commented-Out Handlers (preserved from pwa.md)
// ============================

/*
  // popupImg click - navigate to random deal on image click
  document.getElementById('popupImg').addEventListener('click', () => {
    let next;
    do {
      const randomIndex = Math.floor(Math.random() * allDealsFlat.length);
      next = allDealsFlat[randomIndex];
    } while (next.name === currentPopupDeal?.name);
    openPopup(next);
  });

  // popupBack click - go back in browser history
  document.getElementById('popupBack').addEventListener('click', () => {
    window.history.back();
  });
*/

// ============================
// Commented-Out: My Stores Feature (preserved from pwa.md)
// ============================

/*
function getMyStores() {
  return JSON.parse(localStorage.getItem('myStores') || '[]');
}

function saveMyStores(list) {
  localStorage.setItem('myStores', JSON.stringify(list));
}

function addToMyStores(brandName) {
  const stores = getMyStores();
  if (!stores.includes(brandName)) {
    stores.push(brandName);
    saveMyStores(stores);
  }
}

function removeFromMyStores(brandName) {
  let stores = getMyStores();
  stores = stores.filter(b => b !== brandName);
  saveMyStores(stores);
}

function isInMyStores(brandName) {
  return getMyStores().includes(brandName);
}
*/