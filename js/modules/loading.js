/**
 * Loading & Spinners Module
 * Handles loading indicators
 */

/**
 * Inject loading modal into DOM
 */
function injectLoadingModal() {
  if (document.getElementById('loading-modal')) return;

  const modal = document.createElement('div');
  modal.id = 'loading-modal';
  modal.style.display = 'none';
  modal.innerHTML = `
    <div id="loading-spinner"></div>
    <div id="loading-text">Loading...</div>
  `;

  document.body.appendChild(modal);
}

/**
 * Show spinner with message
 */
function showSpinner(message = "Loading...") {
  const modal = document.getElementById('loading-modal');
  const text = document.getElementById('loading-text');
  if (modal && text) {
    text.textContent = message;
    modal.style.display = 'flex';
  }
}

/**
 * Hide spinner
 */
function hideSpinner() {
  const modal = document.getElementById('loading-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// Initialize on load
injectLoadingModal();