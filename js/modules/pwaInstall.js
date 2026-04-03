/**
 * PWA Install Module (A2HS)
 * Handles "Add to Home Screen" prompts for iOS and Android
 */

let deferredPrompt;
const IOS_STORAGE_KEY = 'iosPwaLastSeen';
const IOS_DAYS_LIMIT = 30;

function isIos() {
  return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
}

function isInStandaloneMode() {
  return ('standalone' in window.navigator) && window.navigator.standalone;
}

function daysSince(dateString) {
  const previous = new Date(dateString);
  const now = new Date();
  const diffTime = now - previous;
  return diffTime / (1000 * 60 * 60 * 24);
}

function showPopup() {
  if (!localStorage.getItem('a2hsShown')) {
    const popup = document.getElementById('a2hs-popup');
    if (popup) popup.style.display = 'block';
  }
}

// Android: Capture A2HS event
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  setTimeout(() => {
    const messageEl = document.getElementById('a2hs-message');
    const installBtn = document.getElementById('a2hs-install-btn');
    
    if (messageEl) {
      messageEl.innerHTML = `
        <strong>Install This App, It's Free <br>-- No App Store <br>-- No Play Store <br>-- No Downloads</strong><br><br>
        Add to your home screen for fast, instant access!
      `;
    }
    if (installBtn) installBtn.style.display = 'inline-block';
    showPopup();
  }, 10000);
});

// iOS: Show custom message if not in standalone and not seen in 30 days
window.addEventListener('load', () => {
  if (isIos()) {
    if (isInStandaloneMode()) {
      // User opened the app in standalone — update timestamp
      localStorage.setItem(IOS_STORAGE_KEY, new Date().toISOString());
    } else {
      const lastSeen = localStorage.getItem(IOS_STORAGE_KEY);
      const shouldShowPrompt = !lastSeen || daysSince(lastSeen) >= IOS_DAYS_LIMIT;

      if (shouldShowPrompt) {
        setTimeout(() => {
          const messageEl = document.getElementById('a2hs-message');
          const installBtn = document.getElementById('a2hs-install-btn');
          
          if (messageEl) {
            messageEl.innerHTML = `
              <strong>Install This App, It's Free <br>-- No App Store <br>-- No Play Store <br>-- No Downloads</strong><br><br>
              Add to your home screen for fast, instant access!
              <br><br>
              Tap the <span style="font-weight: bold;">Share</span> icon
              <span style="font-size: 1.2rem;">📤</span> and then select <strong>"Add to Home Screen"</strong>.
            `;
          }
          if (installBtn) installBtn.style.display = 'none';
          showPopup();
        }, 10000);
      }
    }
  }
});

// Android install button
document.getElementById('a2hs-install-btn')?.addEventListener('click', async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    console.log('User response:', result.outcome);
    const popup = document.getElementById('a2hs-popup');
    if (popup) popup.style.display = 'none';
    localStorage.setItem('a2hsShown', 'true');
    deferredPrompt = null;
  }
});

// Close button
document.getElementById('a2hs-close')?.addEventListener('click', () => {
  const popup = document.getElementById('a2hs-popup');
  if (popup) popup.style.display = 'none';
  localStorage.setItem('a2hsShown', 'false'); // So it can show again next time
});

// Android: If installed
window.addEventListener('appinstalled', () => {
  console.log('App was installed');
  const popup = document.getElementById('a2hs-popup');
  if (popup) popup.style.display = 'none';
  localStorage.setItem('a2hsShown', 'true');
});