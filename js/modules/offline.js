/**
 * Offline Detection Module
 * Handles online/offline button visibility
 */

function updateOfflineButtons() {
  const isOnline = navigator.onLine;

  const overrideBtn = document.getElementById("overrideButton");
  if (overrideBtn) {
    overrideBtn.classList.toggle("hidden-offline", !isOnline);
  }

  const buttonsToHide = ["lockButton", "profile", "marketing", "viewAllButton", "salesletter"];
  const buttonsToStyle = ["CartButton"];
  const offlineMessage = document.getElementById("offlineMessage");

  buttonsToHide.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.hidden = !isOnline;
    }
  });

  buttonsToStyle.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.style.marginLeft = isOnline ? "" : "";
    }
  });

  if (offlineMessage) {
    offlineMessage.style.display = isOnline ? "none" : "block";
  }
}

// Run on page load
updateOfflineButtons();

// Listen for connection changes
window.addEventListener("online", updateOfflineButtons);
window.addEventListener("offline", updateOfflineButtons);