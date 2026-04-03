/**
 * Liked Deals Module
 * Handles liked deals functionality
 */

let likedDealIndex = 0;
let likedDealKeys = [];
let isLikedMode = false;

function renderLikedDealsGallery() {
  const likedDeals = JSON.parse(localStorage.getItem('likedDeals') || '{}');
  const galleryEl = document.getElementById('likedDealsGallery');
  const sectionEl = document.getElementById('likedDealsSection');

  galleryEl.innerHTML = '';
  const likedKeys = Object.keys(likedDeals);

  if (likedKeys.length === 0) {
    sectionEl.style.display = 'none';
    return;
  }

  likedKeys.forEach(key => {
    const deal = likedDeals[key];
    if (deal && deal.name && deal.image && deal.original) {
      const card = document.createElement('div');
      card.className = 'deal liked';

      const percentOff = deal.percentOff || 0;
      const brandLogo = deal.brandLogo || '';
      const shortName = deal.name.length > 20 ? deal.name.substring(0, 20) + '...' : deal.name;

      card.innerHTML = `
        <div class="liked-deal-brand">
          <img src="${brandLogo}" alt="Brand Logo" class="liked-deal-brand-img">
        </div>
        <img src="${deal.image}" class="liked-deal-card-img" alt="${deal.name}">
        ${percentOff ? `<span class="liked-discount-badge">${percentOff}% OFF </span>` : ''}
        <div class="liked-deal-content">
          <div class="liked-deal-title">${shortName}</div>
          <div class="liked-deal-price">J$${deal.original}</div>
          <div class="liked-deal-discount">J$${deal.discount}</div>
        </div>
      `;

      card.addEventListener('click', () => {
        const likedDeals = JSON.parse(localStorage.getItem('likedDeals') || '{}');
        likedDealKeys = Object.keys(likedDeals);
        likedDealIndex = likedDealKeys.findIndex(k => k === getDealKey(deal));

        isLikedMode = true;
        document.getElementById('showLikedBtn')?.classList.add('active');
        document.getElementById('showRandomBtn')?.classList.remove('active');

        openPopup(deal);

        setTimeout(() => {
          addPopupSwipeListeners();
        }, 100);
      });

      galleryEl.appendChild(card);
    }
  });

  sectionEl.style.display = 'block';
}

function showLikedDealsInPopup() {
  const likedDeals = JSON.parse(localStorage.getItem('likedDeals') || '{}');
  likedDealKeys = Object.keys(likedDeals);

  if (likedDealKeys.length === 0) {
    alert("No liked deals yet.");
    return;
  }

  isBrandMode = false;
  isLikedMode = true;
  likedDealIndex = 0;
  const deal = likedDeals[likedDealKeys[likedDealIndex]];
  openPopup(deal, true);
}

function goToNextLikedDeal() {
  if (likedDealKeys.length === 0) return;
  likedDealIndex = (likedDealIndex + 1) % likedDealKeys.length;
  const likedDeals = JSON.parse(localStorage.getItem('likedDeals') || '{}');
  const deal = likedDeals[likedDealKeys[likedDealIndex]];
  openPopup(deal, true);
}

function goToPrevLikedDeal() {
  if (likedDealKeys.length === 0) return;
  likedDealIndex = (likedDealIndex - 1 + likedDealKeys.length) % likedDealKeys.length;
  const likedDeals = JSON.parse(localStorage.getItem('likedDeals') || '{}');
  const deal = likedDeals[likedDealKeys[likedDealIndex]];
  openPopup(deal, true);
}

function cleanUpLikedDeals() {
  const likedDeals = JSON.parse(localStorage.getItem('likedDeals') || '{}');

  console.log("🧪 allDealsFlat.length before cleanup:", allDealsFlat.length);
  console.log("🧪 allDealsFlat keys:", allDealsFlat.map(getDealKey));

  const validKeys = new Set(allDealsFlat.map(deal => getDealKey(deal)));
  
  let updated = false;

  Object.keys(likedDeals).forEach(key => {
    if (!validKeys.has(key)) {
      console.log('Removing invalid liked deal:', key);
      delete likedDeals[key];
      updated = true;
    }
  });

  if (updated) {
    localStorage.setItem('likedDeals', JSON.stringify(likedDeals));
    renderLikedDealsGallery();
  }
}

document.getElementById('showLikedBtn').onclick = () => {
  isLikedMode = true;
  isBrandMode = false;
  document.getElementById('showLikedBtn').classList.add('active');
  document.getElementById('showRandomBtn').classList.remove('active');
  document.getElementById('showBrandTabBtn')?.classList.remove('active');
  highlightTab('showLikedBtn');
  showLikedDealsInPopup();
};