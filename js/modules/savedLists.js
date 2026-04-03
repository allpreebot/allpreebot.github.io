/**
 * Saved Shopping Lists Module
 * Handles saving and managing shopping lists
 */

function deleteSavedList(brand, index) {
  const savedLists = JSON.parse(localStorage.getItem('savedLists') || '{}');
  if (savedLists[brand]) {
    savedLists[brand].splice(index, 1);
    if (savedLists[brand].length === 0) delete savedLists[brand];
    localStorage.setItem('savedLists', JSON.stringify(savedLists));
    
    const hasItems = renderSavedListsContent();

    if (!hasItems) {
      closeSavedListsPopup();
    }
  }
}

function formatCurrency(value) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function saveShoppingList(brand) {
  const cart = JSON.parse(localStorage.getItem('cartItems') || '{}');
  const savedLists = JSON.parse(localStorage.getItem('savedLists') || '{}');
  const timestamp = new Date().toISOString();

  if (cart[brand]) {
    if (!savedLists[brand]) savedLists[brand] = [];
    savedLists[brand].push({
      date: timestamp,
      items: cart[brand]
    });
    localStorage.setItem('savedLists', JSON.stringify(savedLists));
    alert(`Shopping list for ${brand} saved!`);
  }
}

function renderSavedListsContent() {
  const popup = document.getElementById('saved-lists-popup');
  if (!popup) return;

  const savedLists = JSON.parse(localStorage.getItem('savedLists') || '{}');
  const brandKeys = Object.keys(savedLists);
  popup.innerHTML = `<h3 style="margin-bottom: 16px;">📝 Saved Shopping Lists</h3>`;

  if (brandKeys.length === 0) {
    popup.innerHTML += `<div style="text-align: center;">📝 No saved shopping lists yet.</div>`;
    return false;
  } else {
    brandKeys.forEach(brand => {
      savedLists[brand].forEach((list, index) => {
        const date = new Date(list.date).toLocaleString();
        const section = document.createElement('div');
        section.style = 'border: 1px solid #ccc; border-radius: 8px; padding: 10px; margin-bottom: 12px;';
        section.innerHTML = `
          <strong>${brand}</strong><br>
          <small>Saved: ${date}</small>
          <ul style="margin-top: 8px; padding-left: 16px;">
            ${list.items.map(item => `<li>${item.name} – JMD ${formatCurrency(item.price)}</li>`).join('')}
          </ul>
          <button onclick="deleteSavedList('${brand}', ${index})" style="margin-top: 6px; background: red; color: white; border: none; padding: 4px 8px; border-radius: 4px;">Delete</button>
        `;
        popup.appendChild(section);
      });
    });
    return true;
  }
}

function openSavedListsPopup() {
  if (document.getElementById('saved-lists-backdrop')) {
    return;
  }

  const backdrop = document.createElement('div');
  backdrop.id = 'saved-lists-backdrop';
  backdrop.style = `
    position: fixed;
    top: 0;
    left: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.4);
    z-index: 10000;
  `;
  backdrop.onclick = (e) => {
    if (e.target === backdrop) closeSavedListsPopup();
  };

  const popup = document.createElement('div');
  popup.id = 'saved-lists-popup';
  popup.style = `
    background: #fff;
    padding: 16px;
    border-radius: 10px;
    max-width: 500px;
    width: 90%;
    max-height: 70vh;
    overflow-y: auto;
    box-shadow: 0 0 20px rgba(0,0,0,0.2);
  `;

  backdrop.appendChild(popup);
  document.body.appendChild(backdrop);
  
  renderSavedListsContent();
}

function closeSavedListsPopup() {
  document.getElementById('saved-lists-backdrop')?.remove();
}