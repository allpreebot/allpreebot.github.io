/**
 * Shopping Cart Module
 * Handles cart operations and display
 */

// Initialize cart count immediately
updateCartCount(getTotalCartItems());

const cartBtn = document.getElementById('cartBtn');
if (cartBtn) {
  cartBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openCartPopup();
  });
}

function updateCartCount(count) {
  const countEl = document.getElementById('cart-count');
  const tabCountEl = document.getElementById('cartCount');
  if (countEl) {
    countEl.textContent = count;
    countEl.style.display = count > 0 ? 'inline-block' : 'none';
  }
  if (tabCountEl) {
    tabCountEl.textContent = count;
  }
}

function getTotalCartItems() {
  const cart = JSON.parse(localStorage.getItem('cartItems') || '{}');
  return Object.values(cart).reduce((sum, items) => sum + items.length, 0);
}

function addToCart(deal) {
  const dealKey = getDealKey(deal);
  const brand = deal.brandName?.trim() || 'Unknown';
  const cart = JSON.parse(localStorage.getItem('cartItems') || '{}');
  let brandItems = cart[brand] || [];

  const itemIndex = brandItems.findIndex(item => item._id === dealKey);
  const inCart = itemIndex !== -1;

  if (inCart) {
    brandItems.splice(itemIndex, 1);
    console.log('Removed from cart:', deal.name);
  } else {
    const price = parseFloat(deal.discount?.toString().replace(/,/g, '') || '0');
    const originalPrice = parseFloat(deal.original?.toString().replace(/,/g, '') || '0');
    brandItems.push({
      _id: dealKey,
      brand: deal.brandName,
      brandimg: deal.brandLogo,
      name: deal.name,
      img: deal.img || deal.image || '',
      price,
      originalPrice
    });
    console.log('Added to cart:', deal.name);
  }

  cart[brand] = brandItems;
  localStorage.setItem('cartItems', JSON.stringify(cart));
  updateCartCount(getTotalCartItems());
  showCartIcon();

  return !inCart;
}

function clearBrandCart(brand) {
  const cart = JSON.parse(localStorage.getItem('cartItems') || '{}');
  delete cart[brand];
  localStorage.setItem('cartItems', JSON.stringify(cart));
  updateCartCount(getTotalCartItems());

  const popup = document.getElementById('cart-popup');
  if (!popup) return;

  const brandSections = popup.querySelectorAll('strong');
  brandSections.forEach(strong => {
    if (strong.textContent.trim() === brand) {
      const section = strong.closest('div[style*="border-bottom"]');
      if (section) section.remove();
    }
  });

  const remainingCart = JSON.parse(localStorage.getItem('cartItems') || '{}');
  const hasItems = Object.values(remainingCart).some(arr => arr.length > 0);
  if (!hasItems) {
    popup.innerHTML = `<div style="text-align:center;">📝 Your shopping list is empty.</div>`;
  }
}

function showCartIcon() {
  // Show cart icon if items exist
}

async function showCartWithLocations() {
  await loadBrandLocations();
  openCartPopup();
}

function openCartPopup() {
  if (document.getElementById('cart-backdrop')) return;

  showCartWithLocations();

  const backdrop = document.createElement('div');
  backdrop.id = 'cart-backdrop';
  backdrop.style = `
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 1) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeCartPopup();
  });

  let popup = document.getElementById('cart-popup');
  if (!popup) {
    popup = document.createElement('div');
    popup.id = 'cart-popup';
    popup.style = `
      background: #fff;
      border: 1px solid #ccc;
      border-radius: 10px;
      padding: 10px;
      width: 90%;
      max-width: 500px;
      margin-top: -90px;
      height: 80%;
      max-height: 100vh;
      overflow-y: scroll;
      scrollbar-width: none;
      -ms-overflow-style: none;
      box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2);
      z-index: 9999;
    `;
  }

  const cart = JSON.parse(localStorage.getItem('cartItems') || '{}');
  const brandKeys = Object.keys(cart);
  popup.innerHTML = '';

  if (brandKeys.length === 0) {
    popup.innerHTML = `<div style="text-align:center;">🛒 Your shopping cart is empty.</div>`;
  } else {
    brandKeys.forEach(brand => {
      const items = cart[brand];
      if (!items || items.length === 0) return;

      const brandLogo = items[0].brandimg || '';
      const brandSection = document.createElement('div');
      brandSection.style = 'border-bottom: 1px solid #eee; margin-bottom: 12px; padding-bottom: 10px;';
      brandSection.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <img src="${brandLogo}" alt="${brand}" style="width: 30px; height: 30px; object-fit: contain;">
            <strong>${brand}</strong>
          </div>
        </div>
      `;

      items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.style = 'display: flex; gap: 10px; align-items: center; margin-bottom: 6px;';
        itemDiv.innerHTML = `
          <img src="${item.img}" alt="${item.name}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 6px;">
          <div style="flex: 1;">
            <div style="font-size: 14px;">${item.name}</div>
          
          </div>
        `;
        brandSection.appendChild(itemDiv);
      });

      const subtotal = items.reduce((sum, item) => sum + (item.price || 0), 0);
      const fullCost = items.reduce((sum, item) => sum + (item.originalPrice || item.price || 0), 0);
      const totalDiscount = fullCost - subtotal;
      const tax = subtotal * 0.15;
      const grandTotal = subtotal + tax;
      const clubSavings = Math.round(subtotal * 0.49);
      const clubCost = grandTotal - clubSavings;

      const formatCurrency = (amount) => `JMD ${amount.toLocaleString('en-JM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      const totalsDiv = document.createElement('div');
      totalsDiv.style = 'margin-top: 10px; margin-bottom: 10px; font-size: 14px;';
      totalsDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; color: #666; font-size: 13px;"><span>Full Cost:</span><span style="text-decoration: line-through;">${formatCurrency(fullCost)}</span></div>
        <div style="display: flex; justify-content: space-between; color: red; margin-bottom: 5px;"><span>Discount:</span><strong>-${formatCurrency(totalDiscount)}</strong></div>
        <hr style="border: 0; border-top: 1px dashed #ccc; margin: 5px 0;">
        <div style="display: flex; justify-content: space-between;"><span>SubTotal:</span><strong>${formatCurrency(subtotal)}</strong></div>
        <div style="display: flex; justify-content: space-between;"><span>15% Tax:</span><strong>${formatCurrency(tax)}</strong></div>
        <div style="display: flex; justify-content: space-between; font-weight: bold; margin-top: 5px;"><span>Paid With ClubCard:</span><strong style="color: green;">${formatCurrency(grandTotal)}</strong></div>
        <hr style="border: 0; border-top: 1px dashed #ccc; margin: 5px 0;">
        <div style="display: flex; justify-content: space-between; color: #28a745; margin-top: 5px;"><span>Club Saving:- Over ¹²¹ Days</span><strong>upto ${formatCurrency(clubSavings)}</strong></div>
        <hr style="border: 0; border-top: 1px dashed #ccc; margin: 5px 0;">
        <div style="display: flex; justify-content: space-between; font-weight: bold; margin-top: 5px;"><span>GrandTotal:</span><strong style="color: black;">dnto ${formatCurrency(clubCost)}</strong></div>
      `;
      brandSection.appendChild(totalsDiv);

      const actionRow = document.createElement('div');
      actionRow.style = 'display: flex; justify-content: space-between; margin-top: 8px; gap: 2px;';
      actionRow.innerHTML = `
        <button onclick="clearBrandCart('${brand}')" style="background: red; color: white; border: none; padding: 5px 8px; border-radius: 4px; font-size: 11px;">Clear</button>
        <button onclick="saveShoppingList('${brand}')" style="background: #007bff; color: white; border: none; padding: 5px 8px; border-radius: 4px; font-size: 11px;">Save List</button>
        <button onclick="closeCartPopup(); closePopup(); document.querySelector('.menu-button[data-view=\\'salesletter\\']').click();" style="background: #28a745; color: white; border: none; padding: 5px 8px; border-radius: 4px; font-size: 11px;">Join Club</button>
        <button onclick="closeCartPopup(); closePopup(); document.querySelector('.menu-button[data-view=\\'topup\\']').click();" style="background: #28a745; color: white; border: none; padding: 5px 8px; border-radius: 4px; font-size: 11px;">Topup</button>
        <button onclick="openBrandLocation('${brand}')" style="background: #555; color: white; border: none; padding: 5px 8px; border-radius: 4px; font-size: 11px;">Location</button>
      `;
      brandSection.appendChild(actionRow);

      popup.appendChild(brandSection);
    });
  }

  backdrop.appendChild(popup);
  document.body.appendChild(backdrop);
  document.body.style.overflow = 'hidden';
}

function closeCartPopup() {
  const backdrop = document.getElementById('cart-backdrop');
  if (backdrop) backdrop.remove();
  document.body.style.overflow = '';
}