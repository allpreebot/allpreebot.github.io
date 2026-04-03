/**
 * Deal Popup Module
 * Handles deal popup display and interactions
 */

let currentPopupDeal = null;
let isBrandMode = false;
let brandDealIndex = 0;
let brandDealKeys = [];
let popupCountdownInterval = null;
let isSwiping = false;

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

  setTimeout(() => {
    const badgeContainer = document.querySelector('#popup .brand-logo-container');
    if (!badgeContainer) return console.warn('No badge container in popup');

    badgeContainer.querySelectorAll('.badge-premium, .badge-pro, .badge-starter, .badge-exclusive')
      .forEach(el => el.remove());

    if (brandInfo) {
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

function setupLikeButton(deal) {
  const likeContainer = document.getElementById('likeButtonContainer');

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
    updateCartBtnState(!isInCart);
    addToCart(deal);
  };

  function updateCartBtnState(isNowInCart) {
    addToCartBtn.classList.toggle('in-cart', isNowInCart);
    addToCartBtn.textContent = isNowInCart ? '❌ Del' : '🛒 Add';
  }
}

function closePopup() {
  document.getElementById('popup').style.display = 'none';
  currentPopupDeal = null;
  document.body.classList.remove('noscroll');

  isBrandMode = false;
  isLikedMode = false;

  const tabs = document.querySelectorAll('.tab-switcher .tab-btn');
  tabs.forEach(tab => tab.classList.remove('active'));

  const randomTab = document.getElementById('showRandomBtn');
  if (randomTab) randomTab.classList.add('active');
}

function resetTabsToNormal() {
  highlightTab('showRandomTabBtn');
  isBrandMode = false;
  isLikedMode = false;

  document.body.classList.remove('noscroll');
  document.getElementById('popup').style.display = 'none';

  document.getElementById('popupImg').src = '';
  document.getElementById('popupTitle').textContent = '';
  document.getElementById('popupPrice').textContent = '';
  document.getElementById('popupDiscount').textContent = '';
  document.getElementById('popupDesc').textContent = '';
  document.getElementById('popupBadge').textContent = '';
  document.getElementById('popupSavings').textContent = '';
  document.getElementById('popupTimer').textContent = '';
}

window.onpopstate = function(event) {
  if (event.state && event.state.popup) {
    resetTabsToNormal();
  }
};

function highlightTab(buttonId) {
  document.querySelectorAll('.tab-switcher .tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.getElementById(buttonId)?.classList.add('active');
}

document.getElementById('popup').addEventListener('click', function (e) {
  if (e.target === this) {
    resetTabsToNormal();
  }
});

function showBrandDealsInPopup(brandName) {
  isBrandMode = true;
  isLikedMode = false;
  highlightTab('showBrandTabBtn');

  const sourceUrl = currentPopupDeal.sourceUrl;
  const brandDeals = allDealsFlat.filter(d => d.brandName === brandName && d.sourceUrl === sourceUrl);

  if (!brandDeals.length) {
    alert("No deals for " + brandName);
    return;
  }

  brandDealKeys = brandDeals.map(d => d.name);
  brandDealIndex = 0;

  const currentKey = getDealKey(currentPopupDeal);
  const startIndex = brandDeals.findIndex(d => getDealKey(d) === currentKey);
  brandDealIndex = startIndex !== -1 ? startIndex : 0;

  const deal = brandDeals[brandDealIndex];
  openPopup(deal, true);
}

function goToNextBrandDeal() {
  if (!brandDealKeys.length || !currentPopupDeal) return;

  brandDealIndex = (brandDealIndex + 1) % brandDealKeys.length;
  const nextDealName = brandDealKeys[brandDealIndex];

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

  const deal = allDealsFlat.find(d =>
    d.name === prevDealName &&
    d.brandName === currentPopupDeal.brandName &&
    d.sourceUrl === currentPopupDeal.sourceUrl
  );

  if (deal) {
    openPopup(deal, true);
  }
}

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

function formatDescription(description) {
  if (!description) return '';

  description = description.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  description = description.replace(/\n/g, '<br>');
  description = description.replace(/(<br>){2,}/g, '</p><p>');

  return description;
}

const brandContainer = document.getElementById('brandContainer');
if (brandContainer) {
  brandContainer.addEventListener('click', () => {
    const brandName = document.getElementById('brandName')?.textContent?.trim();
    if (brandName) {
      showBrandDealsInPopup(brandName);
    }
  });
}

function activateBrandTab() {
  const brandTabBtn = document.getElementById('brandTabBtn');
  if (brandTabBtn) {
    brandTabBtn.click();
  }
}

function addPopupSwipeListeners() {
  const popup = document.getElementById('popup');
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
      if (isLikedMode) {
        goToNextLikedDeal();
      } else if (isBrandMode) {
        goToNextBrandDeal();
      } else {
        let next;
        do {
          const randomIndex = Math.floor(Math.random() * allDealsFlat.length);
          next = allDealsFlat[randomIndex];
        } while (next.name === currentPopupDeal?.name);

        document.getElementById('showLikedBtn')?.classList.remove('active');
        document.getElementById('showRandomBtn')?.classList.add('active');
        isLikedMode = false;
        isBrandMode = false;

        openPopup(next);
      }
    } else {
      if (isLikedMode) {
        goToPrevLikedDeal();
      } else if (isBrandMode) {
        goToPrevBrandDeal();
      } else {
        window.history.back();
      }
    }

    setTimeout(() => {
      isSwiping = false;
    }, 300);
  }
}

document.getElementById('showRandomBtn').onclick = () => {
  document.getElementById('showRandomBtn').classList.add('active');
  document.getElementById('showLikedBtn').classList.remove('active');
  document.getElementById('showBrandTabBtn').classList.remove('active');
  showRandomDealsInPopup();
};

document.getElementById('showBrandTabBtn').onclick = () => {
  const brand = currentPopupDeal?.brandName;
  if (!brand) return;
  isLikedMode = false;
  isBrandMode = true;
  highlightTab('showBrandTabBtn');
  showBrandDealsInPopup(brand);
};

document.addEventListener('click', function (event) {
  const accountLink = event.target.closest('#account');
  
  if (accountLink) {
    event.preventDefault();
    closePopup();
    
    const realButton = document.querySelector('.menu-button[data-view="signup"]');
    if (realButton) {
      realButton.click();
    } else {
      console.error('Target action button not found.');
    }
  }
});