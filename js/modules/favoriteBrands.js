/**
 * Favorite Brands Module
 * Handles favorite brand selection and display
 */

function updateFavoriteBrandCount(count) {
  const countEl = document.getElementById('favorite-brand-count');
  if (countEl) {
    countEl.textContent = count;
    countEl.style.display = count > 0 ? 'inline-block' : 'none';
  }
}

function getTotalFavoriteBrands() {
  const favoriteBrands = JSON.parse(localStorage.getItem('favoriteBrands') || '[]');
  return favoriteBrands.length;
}

function addToFavorites(brand) {
  const favoriteBrands = JSON.parse(localStorage.getItem('favoriteBrands') || '[]');
  const alreadyInFavorites = favoriteBrands.includes(brand);

  if (alreadyInFavorites) {
    const index = favoriteBrands.indexOf(brand);
    favoriteBrands.splice(index, 1);
    console.log('Removed from favorites:', brand);
  } else {
    favoriteBrands.push(brand);
    console.log('Added to favorites:', brand);
  }

  localStorage.setItem('favoriteBrands', JSON.stringify(favoriteBrands));
  updateFavoriteBrandCount(getTotalFavoriteBrands());
  showFavoriteBrandIcon();

  return !alreadyInFavorites;
}

function showFavoriteBrandIcon() {
  const favoriteBrands = JSON.parse(localStorage.getItem('favoriteBrands') || '[]');
  if (favoriteBrands.length > 0) {
    document.getElementById('favorite-brand-icon').style.display = 'block';
  } else {
    document.getElementById('favorite-brand-icon').style.display = 'none';
  }
}

function openFavoriteBrandPopup() {
  if (document.getElementById('favorite-brand-backdrop')) return;

  const backdrop = document.createElement('div');
  backdrop.id = 'favorite-brand-backdrop';
  backdrop.style = `
    position: fixed;
    top: 0;
    left: 0;
    bottom: 68px;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeFavoriteBrandPopup();
  });

  let popup = document.getElementById('favorite-brand-popup');
  if (!popup) {
    popup = document.createElement('div');
    popup.id = 'favorite-brand-popup';
    popup.style = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #fff;
      border: 1px solid #ccc;
      border-radius: 10px;
      padding: 10px;
      width: 90%;
      max-width: 500px;
      height: 70%;
      max-height: 100vh;
      overflow-y: scroll;
      scrollbar-width: none;
      -ms-overflow-style: none;
      box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2);
      z-index: 9999;
    `;
  }

  const brands = allBrandsData.map(brand => ({ name: brand.brand, logo: brand.logo }));
  popup.innerHTML = '';

  if (brands.length === 0) {
    popup.innerHTML = `<div style="text-align:center;">No favorite brands available.</div>`;
  } else {
    const brandCarousel = document.createElement('div');
    brandCarousel.style = 'display: flex; flex-direction: column; gap: 10px; overflow-y: scroll; max-height: 70vh; padding: 10px;';

    const selectedBrand = localStorage.getItem('selectedFavoriteBrand');

    brands.forEach(brand => {
      const brandCard = document.createElement('div');
      brandCard.style = `
        width: 100%;
        display: flex;
        align-items: center;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 8px;
        cursor: pointer;
        background-color: #f8f8f8;
        transition: all 0.3s;
      `;

      const brandLogo = document.createElement('img');
      brandLogo.src = brand.logo;
      brandLogo.style = 'width: 40px; height: 40px; margin-right: 15px; border-radius: 50%;';
      
      const brandName = document.createElement('strong');
      brandName.innerText = brand.name;

      brandCard.appendChild(brandLogo);
      brandCard.appendChild(brandName);

      if (brand.name === selectedBrand) {
        brandCard.style.border = '2px solid #ff4d4d';
        brandCard.style.backgroundColor = '#ffe6e6';
      }

      brandCard.onclick = () => {
        selectFavoriteBrand(brand.name, brandCard);
      };

      brandCard.onmouseover = () => {
        brandCard.style.transform = 'scale(1.05)';
        brandCard.style.backgroundColor = '#f0f0f0';
      };

      brandCard.onmouseout = () => {
        brandCard.style.transform = 'scale(1)';
        brandCard.style.backgroundColor = '#f8f8f8';
      };

      brandCarousel.appendChild(brandCard);
    });

    popup.appendChild(brandCarousel);
  }

  backdrop.appendChild(popup);
  document.body.appendChild(backdrop);
}

function selectFavoriteBrand(brand, brandCard) {
  console.log(`Selected favorite brand: ${brand}`);

  const allBrandCards = document.querySelectorAll('#favorite-brand-popup div');
  allBrandCards.forEach(card => {
    card.style.border = '1px solid #ddd';
    card.style.backgroundColor = '#f8f8f8';
  });

  brandCard.style.border = '2px solid #ff4d4d';
  brandCard.style.backgroundColor = '#ffe6e6';

  localStorage.setItem('selectedFavoriteBrand', brand);
  closeFavoriteBrandPopup();
}

function closeFavoriteBrandPopup() {
  const backdrop = document.getElementById('favorite-brand-backdrop');
  if (backdrop) backdrop.remove();
  document.body.style.overflow = '';
}