/**
 * Location Services Module
 * Handles geolocation and navigation
 */

let userLocation = null;
let brandLocations = {};
let isNavigating = false;
let lastKnownLocation = null;

function saveLocation(coords) {
  localStorage.setItem('userLocation', coords);
}

function getSavedLocation() {
  return localStorage.getItem('userLocation');
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function hasMovedSignificantly(savedLocation, currentLocation) {
  if (!savedLocation) return true;
  const [savedLat, savedLon] = savedLocation.split(',').map(Number);
  const [currentLat, currentLon] = currentLocation.split(',').map(Number);
  const distance = getDistance(savedLat, savedLon, currentLat, currentLon);
  return distance > 500;
}

function handleLocationClick(coordinates) {
  if (!coordinates) {
    showSpinner("Sorry, this location is not available yet.");
    setTimeout(hideSpinner, 3000);
    return;
  }
  closeLocationPopup();
  navigateToLocation(coordinates, getSavedLocation());
}

function getUserLocationAndNavigate(destination) {
  const savedLocation = getSavedLocation();
  showSpinner("Finding your location...");

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        hideSpinner();
        const currentCoords = `${pos.coords.latitude},${pos.coords.longitude}`;
        if (!savedLocation || hasMovedSignificantly(savedLocation, currentCoords)) {
          saveLocation(currentCoords);
        }
        navigateToLocation(destination, currentCoords);
      },
      () => {
        hideSpinner();
        showSpinner("Could not retrieve your location.");
        setTimeout(hideSpinner, 3000);
      }
    );
  } else {
    hideSpinner();
    showSpinner("Geolocation is not supported by your browser.");
    setTimeout(hideSpinner, 3000);
  }
}

async function openBrandLocation(brand) {
  if (isNavigating) return;
  isNavigating = true;

  const dest = brandLocations[brand];

  if (!dest || (typeof dest === 'string' && dest.trim() === '') || (typeof dest === 'object' && Object.keys(dest).length === 0)) {
    showSpinner("No location set for this brand yet.");
    setTimeout(hideSpinner, 3000);
    isNavigating = false;
    return;
  }

  const allowed = await ensureUserLocation();
  if (!allowed) {
    isNavigating = false;
    return;
  }

  if (typeof dest === 'object') {
    showLocationPopup(dest);
    isNavigating = false;
  } else {
    getUserLocationAndNavigate(dest);
    isNavigating = false;
  }
}

function showLocationPopup(brandLocations) {
  if (document.getElementById('location-popup')) return;

  const backdrop = document.createElement('div');
  backdrop.id = 'location-popup-backdrop';
  backdrop.style = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    z-index: 10000;
  `;

  const popup = document.createElement('div');
  popup.id = 'location-popup';
  popup.style = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 20px;
    border-radius: 10px;
    z-index: 10001;
    max-width: 400px;
    width: 90%;
    text-align: center;
    overflow-y: auto;
    height: 80%;
  `;
  popup.innerHTML = '<p>Loading locations...</p>';

  document.body.appendChild(backdrop);
  document.body.appendChild(popup);
  backdrop.addEventListener('click', closeLocationPopup);
  popup.addEventListener('click', (event) => event.stopPropagation());

  const saved = getSavedLocation();
  showLocationButtons(saved);

  function showLocationButtons(origin) {
    let optionsHtml = '<h3>Select a Location</h3>';
    for (const [name, coords] of Object.entries(brandLocations)) {
      optionsHtml += `
        <button onclick="handleNavigate('${coords}', '${origin}')" style="margin: 8px; padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px;">${name}</button><br>
      `;
    }
    popup.innerHTML = optionsHtml;
  }
}

function handleNavigate(coords, origin) {
  if (!coords || coords.trim() === '') {
    showSpinner("No location set for this location yet.");
    setTimeout(hideSpinner, 3000);
    return;
  }
  closeLocationPopup();
  navigateToLocation(coords, origin);
}

function closeLocationPopup() {
  const popup = document.getElementById('location-popup');
  const backdrop = document.getElementById('location-popup-backdrop');
  if (popup) popup.remove();
  if (backdrop) backdrop.remove();
}

function closeLocationSection() {
  const popup = document.getElementById('cart-popup');
  const locationSection = popup.querySelector('.location-section');
  if (locationSection) {
    locationSection.remove();
  }
}

function navigateToLocation(dest, originCoords = null) {
  const url = originCoords
    ? `https://www.google.com/maps/dir/?api=1&origin=${originCoords}&destination=${dest}`
    : `https://www.google.com/maps/dir/?api=1&destination=${dest}`;

  window.location.href = url;
}

async function ensureUserLocation() {
  const saved = getSavedLocation();

  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      showSpinner("Geolocation is not supported by your browser.");
      return resolve(false);
    }

    showSpinner("Loading brand locations. Please wait...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        hideSpinner();
        const currentCoords = `${pos.coords.latitude},${pos.coords.longitude}`;

        if (!saved || hasMovedSignificantly(saved, currentCoords)) {
          saveLocation(currentCoords);
        }

        resolve(true);
      },
      (err) => {
        hideSpinner();
        console.warn("User denied location or error occurred", err);
        showSpinner("Location denied. Please allow location access to continue.");
        setTimeout(hideSpinner, 3000);
        resolve(false);
      }
    );
  });
}