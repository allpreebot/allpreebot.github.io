/**
 * Admin Panel Module
 * Handles admin functionality
 */

let selectedRankSlot = null;
let selectedRankBrand = null;
let adminSelectedTakeoverBrand = localStorage.getItem('adminSelectedTakeoverBrand') || null;

// Create Admin Panel
const adminPanel = document.createElement('div');
adminPanel.id = 'adminPanel';
adminPanel.style.display = 'none';
adminPanel.innerHTML = `
  <a href="https://www.allpree.com/stats"><button>Overall Stats</button></a>
  <hr />
  <a href="https://www.allpree.com/add"><button>Add Products</button></a>
  <hr />
  <button id="selectTakeoverBrandBtn">Select Takeover Brand</button>
  <label for="takeoverExpiryInput">Takeover Expiry:</label>
  <input type="datetime-local" id="takeoverExpiryInput" />
  <button id="sendTakeoverBtn">Update Takeover Brand</button>
  <hr />
  <div><strong>Select Top Rank Slot:</strong><br/>
    <div id="rankSlotButtonsContainer">
      ${[1, 2, 3, 4, 5].map(i => `<button class="rankSlotBtn" data-slot="${i - 1}">${i}</button>`).join(' ')}
    </div>
  </div>
  <button id="selectTopRankBrandBtn" disabled>Select Top Rank Brand</button>
  <label for="rankExpiryInput">Expiration Date:</label>
  <input type="datetime-local" id="rankExpiryInput" />
  <button id="sendSelectedRankBtn" disabled>Update Top Rank Brand</button>
  <hr />
  <button id="selectFavoriteBrandBtn">Select Featured Brand</button>
  <label for="expiryInput">Favorite Expiry:</label>
  <input type="datetime-local" id="expiryInput" />
  <button id="sendFeaturedBtn">Update Featured Brand</button>
`;

document.body.appendChild(adminPanel);

// Show/hide with 13 clicks
let tapCount = 0;
let lastTapTime = 0;

document.body.addEventListener('click', () => {
  const now = Date.now();
  if (now - lastTapTime < 600) {
    tapCount++;
    if (tapCount >= 13) {
      tapCount = 0;
      showAdminPanel();
    }
  } else {
    tapCount = 1;
  }
  lastTapTime = now;
});

function showAdminPanel() {
  adminPanel.style.display = adminPanel.style.display === 'none' ? 'block' : 'none';
}

// Rank Slot Buttons
document.querySelectorAll('.rankSlotBtn').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedRankSlot = parseInt(btn.getAttribute('data-slot'));
    selectedRankBrand = null;
    document.getElementById('selectTopRankBrandBtn').disabled = false;
    document.getElementById('sendSelectedRankBtn').disabled = true;
    alert(`Selected Slot ${selectedRankSlot + 1}`);
  });
});

// Select Brand for Slot
document.getElementById('selectTopRankBrandBtn').addEventListener('click', () => {
  if (selectedRankSlot === null) {
    alert('Please select a slot first!');
    return;
  }
  openRankBrandPopup();
});

// Update Slot Button
document.getElementById('sendSelectedRankBtn').addEventListener('click', () => {
  const expiry = document.getElementById('rankExpiryInput').value;
  if (!expiry || !selectedRankBrand || selectedRankSlot === null) {
    alert('Make sure you selected a slot, brand, and expiration!');
    return;
  }

  const formattedExpiry = new Date(expiry).toISOString().slice(0, 16);

  fetch('https://script.google.com/macros/s/AKfycbxl-2XeXXvcOE4VTHVp-7fFnzvpoj8qqI_O2ZfjgVAm0e1sC9NQxRYJTlCFM2LrXLH3/exec', {
    method: 'POST',
    body: new URLSearchParams({
      brand: selectedRankBrand,
      expiresAt: formattedExpiry,
      index: selectedRankSlot.toString(),
      action: 'toprank'
    })
  }).then(() => {
    alert(`Slot ${selectedRankSlot + 1} updated with "${selectedRankBrand}"`);
    selectedRankSlot = null;
    selectedRankBrand = null;
    document.getElementById('selectTopRankBrandBtn').disabled = true;
    document.getElementById('sendSelectedRankBtn').disabled = true;
  }).catch(err => {
    console.error('Error:', err);
    alert('There was an error updating the slot.');
  });
});

// Favorite Brand Flow
document.getElementById('selectFavoriteBrandBtn').addEventListener('click', () => {
  openAdminFavoriteBrandPopup();
});

document.getElementById('sendFeaturedBtn').addEventListener('click', () => {
  const selectedBrand = localStorage.getItem('selectedFavoriteBrand');
  const expiryInput = document.getElementById('expiryInput').value;
  if (!expiryInput) return alert('Please select expiration!');
  if (!selectedBrand) return alert('Select a favorite brand first!');

  const formattedExpiry = new Date(expiryInput).toISOString().slice(0, 16);

  fetch('https://script.google.com/macros/s/AKfycbxl-2XeXXvcOE4VTHVp-7fFnzvpoj8qqI_O2ZfjgVAm0e1sC9NQxRYJTlCFM2LrXLH3/exec', {
    method: 'POST',
    body: new URLSearchParams({
      brand: selectedBrand,
      expiresAt: formattedExpiry,
      action: 'favorite'
    })
  }).then(() => {
    alert('Featured brand successfully updated!');
  }).catch(err => {
    console.error('Error updating brand:', err);
    alert('Error updating featured brand.');
  });
});

// Favorite Brand Popup
function openAdminFavoriteBrandPopup() {
  if (document.getElementById('admin-favorite-brand-backdrop')) return;

  document.body.classList.add('no-scroll');
  const backdrop = document.createElement('div');
  backdrop.id = 'admin-favorite-brand-backdrop';
  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) closeAdminFavoriteBrandPopup();
  });

  const popup = document.createElement('div');
  popup.id = 'admin-favorite-brand-popup';

  const brands = allBrandsData.map(brand => ({ name: brand.brand, logo: brand.logo }));
  const selectedBrand = localStorage.getItem('selectedFavoriteBrand');
  const carousel = document.createElement('div');
  carousel.className = 'admin-brand-carousel';

  brands.forEach(brand => {
    const card = document.createElement('div');
    card.className = 'admin-brand-card';
    if (brand.name === selectedBrand) card.classList.add('selected');

    card.innerHTML = `<img src="${brand.logo}" /><strong>${brand.name}</strong>`;
    card.onclick = () => {
      document.querySelectorAll('.admin-brand-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      localStorage.setItem('selectedFavoriteBrand', brand.name);
      closeAdminFavoriteBrandPopup();
    };

    carousel.appendChild(card);
  });

  popup.appendChild(carousel);
  backdrop.appendChild(popup);
  document.body.appendChild(backdrop);
}

function closeAdminFavoriteBrandPopup() {
  document.getElementById('admin-favorite-brand-backdrop')?.remove();
  document.body.classList.remove('no-scroll');
}

// Brand Selection Popup for Top Rank
function openRankBrandPopup() {
  if (document.getElementById('admin-single-rank-backdrop')) return;

  const backdrop = document.createElement('div');
  backdrop.id = 'admin-single-rank-backdrop';

  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) closeRankBrandPopup();
  });

  const popup = document.createElement('div');
  popup.id = 'admin-single-rank-popup';
  popup.innerHTML = '<h3>Select a Brand for Slot</h3>';

  const brandList = document.createElement('div');
  brandList.className = 'admin-brand-carousel';

  allBrandsData.forEach(brand => {
    const card = document.createElement('div');
    card.className = 'admin-brand-card';

    const img = document.createElement('img');
    img.src = brand.logo;

    const label = document.createElement('div');
    label.textContent = brand.brand;

    card.appendChild(img);
    card.appendChild(label);

    card.onclick = () => {
      selectedRankBrand = brand.brand;
      document.getElementById('sendSelectedRankBtn').disabled = false;
      closeRankBrandPopup();
    };

    brandList.appendChild(card);
  });

  popup.appendChild(brandList);
  backdrop.appendChild(popup);
  document.body.appendChild(backdrop);
}

function closeRankBrandPopup() {
  const el = document.getElementById('admin-single-rank-backdrop');
  if (el) el.remove();
}

// Takeover Brand
document.getElementById('selectTakeoverBrandBtn').addEventListener('click', () => {
  openAdminTakeoverBrandPopup();
});

document.getElementById('sendTakeoverBtn').addEventListener('click', () => {
  const expiryInput = document.getElementById('takeoverExpiryInput').value;
  if (!expiryInput) return alert('Please select expiration!');
  if (!adminSelectedTakeoverBrand) return alert('Select a takeover brand first!');

  const formattedExpiry = new Date(expiryInput).toISOString().slice(0, 16);
  console.log("Submitting takeover brand:", adminSelectedTakeoverBrand);
  
  fetch('https://script.google.com/macros/s/AKfycbxl-2XeXXvcOE4VTHVp-7fFnzvpoj8qqI_O2ZfjgVAm0e1sC9NQxRYJTlCFM2LrXLH3/exec', {
    method: 'POST',
    body: new URLSearchParams({
      brand: adminSelectedTakeoverBrand,
      expiresAt: formattedExpiry,
      action: 'takeover'
    })
  }).then(() => {
    alert('Takeover brand successfully updated!');
  }).catch(err => {
    console.error('Error updating takeover brand:', err);
    alert('Error updating takeover brand.');
  });
});

function openAdminTakeoverBrandPopup() {
  if (document.getElementById('admin-takeover-brand-backdrop')) return;
  const selectedBrand = localStorage.getItem('adminSelectedTakeoverBrand');

  document.body.classList.add('no-scroll');

  const backdrop = document.createElement('div');
  backdrop.id = 'admin-takeover-brand-backdrop';
  backdrop.className = 'admin-favorite-brand-backdrop';
  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) closeAdminTakeoverBrandPopup();
  });

  const popup = document.createElement('div');
  popup.id = 'admin-takeover-brand-popup';
  popup.className = 'admin-favorite-brand-popup';

  const carousel = document.createElement('div');
  carousel.className = 'admin-brand-carousel';

  const brands = allBrandsData.map(brand => ({ name: brand.brand, logo: brand.logo }));

  brands.forEach(brand => {
    const card = document.createElement('div');
    card.className = 'admin-brand-card';
    if (brand.name === adminSelectedTakeoverBrand) card.classList.add('selected');

    card.innerHTML = `<img src="${brand.logo}" alt="${brand.name}" /><strong>${brand.name}</strong>`;
    card.onclick = () => {
      document.querySelectorAll('.admin-brand-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      adminSelectedTakeoverBrand = brand.name;
      localStorage.setItem('adminSelectedTakeoverBrand', brand.name);
      closeAdminTakeoverBrandPopup();
      alert(`Takeover brand selected: ${adminSelectedTakeoverBrand}`);
    };

    carousel.appendChild(card);
  });

  popup.appendChild(carousel);
  backdrop.appendChild(popup);
  document.body.appendChild(backdrop);
}

function closeAdminTakeoverBrandPopup() {
  document.getElementById('admin-takeover-brand-backdrop')?.remove();
  document.body.classList.remove('no-scroll');
}