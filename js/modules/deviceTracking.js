/**
 * Device Tracking Module
 * Handles device ID, installation tracking, and pings
 */

let retryThisSession = false;

async function getDeviceId() {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
}

function getInstallNote() {
  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
    return 'standalone';
  }
  return 'browser';
}

async function reportAnonymousInstall() {
  if (localStorage.getItem('installReported')) {
    console.log('Anonymous install already reported.');
    return;
  }

  const deviceId = await getDeviceId();
  const userAgent = navigator.userAgent;
  const timestamp = Date.now();
  const note = getInstallNote();

  try {
    const res = await fetch('https://script.google.com/macros/s/AKfycbxl-2XeXXvcOE4VTHVp-7fFnzvpoj8qqI_O2ZfjgVAm0e1sC9NQxRYJTlCFM2LrXLH3/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        action: 'install',
        deviceId,
        userAgent,
        timestamp: timestamp.toString(),
        note
      }),
    });
    const text = await res.text();
    console.log('Anonymous install reported:', text);
    localStorage.setItem('installReported', 'true');
    localStorage.setItem('lastPingTimestamp', timestamp); // Set initial ping timestamp here
  } catch (e) {
    console.error('Error reporting anonymous install:', e);
  }
}

async function pingDevice() {
  const deviceId = await getDeviceId();
  const userAgent = navigator.userAgent;
  const timestamp = Date.now();
  const note = getInstallNote();

  // Attempt to retrieve profile
  const profile = JSON.parse(localStorage.getItem('profileLogin') || '{}');

  const bodyData = {
    action: 'install',  // same action to update lastSeen timestamp
    deviceId,
    userAgent,
    timestamp: timestamp.toString(),
    note,
    idcode: profile.idcode || '',
    firstName: profile.firstName || '',
    lastName: profile.lastName || '',
    phone: profile.phone || ''
  };

  try {
    const res = await fetch('https://script.google.com/macros/s/AKfycbxl-2XeXXvcOE4VTHVp-7fFnzvpoj8qqI_O2ZfjgVAm0e1sC9NQxRYJTlCFM2LrXLH3/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(bodyData),
    });

    const text = await res.text();
    console.log('Ping sent:', text);
    localStorage.setItem('lastPingTimestamp', timestamp);

    if (text.toLowerCase().includes('new row created') && profile.idcode) {
      localStorage.removeItem(`installLinked_${profile.idcode}`);
      console.log(`Cleared installLinked_${profile.idcode} because new row created on ping`);

      if (!retryThisSession) {
        retryThisSession = true;
        console.log('Retrying ping once this session to link newly created row...');
        await pingDevice();
      }
    }

  } catch (e) {
    console.error('Error sending ping:', e);
  }
}

async function pingDeviceThrottled() {
  if (!localStorage.getItem('installReported')) {
    // Don't ping if install not yet reported
    return;
  }

  const lastPing = localStorage.getItem('lastPingTimestamp');
  const now = Date.now();
  const ONE_DAYS_MS = 1 * 24 * 60 * 60 * 1000;

  if (!lastPing || now - lastPing > ONE_DAYS_MS) {
    await pingDevice();
  } else {
    console.log('Ping skipped — last ping less than 1 days ago');
  }
}

function updateUserSpecificButtonsVisibility() {
  // Get the profile data from localStorage
  const profile = localStorage.getItem('profileLogin');

  // Find the buttons by their IDs
  const lockButton = document.getElementById('lockButton');
  const cartButton = document.getElementById('CartButton');
  const savedListsButton = document.getElementById('savedListsButton');
  const marketingButton = document.getElementById('marketing');
  const generategiftcard = document.getElementById('generategiftcard');

  // Check if profile exists and is not an empty object string like '{}'
  const isLoggedIn = profile && profile !== '{}' && profile !== 'null';

  if (isLoggedIn) {
    // If logged in, show the buttons by clearing the inline 'display' style
    if (lockButton) lockButton.style.display = '';
    if (cartButton) cartButton.style.display = '';
  //  if (savedListsButton) savedListsButton.style.display = '';
    if (marketingButton) marketingButton.style.display = '';
    if (generategiftcard) generategiftcard.style.display = '';
  } else {
    // If not logged in, hide the buttons
    if (lockButton) lockButton.style.display = 'none';
    if (cartButton) cartButton.style.display = 'none';
  //  if (savedListsButton) savedListsButton.style.display = 'none';
    if (marketingButton) marketingButton.style.display = 'none';
    if (generategiftcard) generategiftcard.style.display = 'none';
  }
}

// Run immediately (DOM already loaded when module runs)
reportAnonymousInstall().then(() => {
  pingDeviceThrottled();
});
// Call the function to set initial button visibility
updateUserSpecificButtonsVisibility();