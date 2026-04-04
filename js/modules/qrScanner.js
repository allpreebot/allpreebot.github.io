/**
 * QR Scanner Module
 * Opens camera to scan QR codes and adds stores to My List
 */

// Scanner state
let qrScanner = null;
let qrScannerActive = false;

/**
 * Open QR Scanner
 */
function openQRScanner() {
  // Check if scanner container exists
  let scannerContainer = document.getElementById('qrScannerContainer');
  
  if (!scannerContainer) {
    // Create scanner container
    scannerContainer = document.createElement('div');
    scannerContainer.id = 'qrScannerContainer';
    scannerContainer.innerHTML = `
      <div class="qr-scanner-overlay">
        <div class="qr-scanner-box">
          <button class="qr-close-btn" onclick="closeQRScanner()">×</button>
          <h3>Scan Store QR Code</h3>
          <div id="qrReader"></div>
          <p class="qr-instructions">Point camera at QR code to add store to your list</p>
          <div id="qrResult" class="qr-result"></div>
          <div class="qr-manual">
            <p>Or enter store name manually:</p>
            <input type="text" id="manualStoreInput" placeholder="Enter store name">
            <button onclick="addManualStore()">Add Store</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(scannerContainer);
    
    // Add styles
    addQRScannerStyles();
  }
  
  scannerContainer.style.display = 'block';
  showQRResult('info', 'Starting camera...');
  
  // Force library to load before starting the scanner
  loadQRLibrary().then(() => {
    document.getElementById('qrResult').innerHTML = ''; // Clear loading message
    startQRScanner();
  }).catch(() => {
    console.error('[QR] Failed to load library over the network.');
    showQRResult('error', 'Scanner unavailable. Please enter the store name manually.');
    startNativeCamera();
  });
}

/**
 * Start QR Scanner
 */
function startQRScanner() {
  const qrReader = document.getElementById('qrReader');
  
  if (!qrReader) {
    console.error('[QR] qrReader element not found!');
    return;
  }
  
  // Use html5-qrcode library
  if (typeof Html5Qrcode !== 'undefined') {
    console.log('[QR] Html5Qrcode library found, starting scanner...');
    
    qrScanner = new Html5Qrcode('qrReader');
    
    qrScanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: 200 }, // Changed from 250x250 to a responsive safe size
      (decodedText, decodedResult) => {
        console.log('[QR] SCANNED:', decodedText);
        console.log('[QR] Result:', decodedResult);
        onQRCodeScanned(decodedText);
      },
      (errorMessage) => {
        // Suppress constant error logging for empty frames
      }
    ).catch((err) => {
      console.error('[QR] Scanner start error:', err);
      document.getElementById('qrResult').innerHTML = '<p class="qr-error">Camera access denied or blocked by browser. Please use manual input.</p>';
    });
    
    qrScannerActive = true;
  } else {
    console.warn('[QR] Html5Qrcode not found, using native camera fallback');
    // Fallback: Use native camera API
    startNativeCamera();
  }
}

/**
 * Native camera fallback (View Only - Cannot decode)
 */
function startNativeCamera() {
  const qrReader = document.getElementById('qrReader');
  
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    const video = document.createElement('video');
    video.id = 'nativeCamera';
    video.setAttribute('playsinline', '');
    video.style.width = '100%';
    video.style.borderRadius = '12px';
    
    qrReader.innerHTML = '';
    qrReader.appendChild(video);
    
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        video.srcObject = stream;
        video.play();
        qrScannerActive = true;
        
        // Explicitly tell the user this is a dummy camera
        document.getElementById('qrResult').innerHTML = '<p class="qr-error">Auto-scan offline. Camera is view-only. Enter store name manually.</p>';
      })
      .catch((err) => {
        console.log('Camera error:', err);
        document.getElementById('qrResult').innerHTML = '<p class="qr-error">Camera not available. Please enter store name manually.</p>';
      });
  } else {
    document.getElementById('qrResult').innerHTML = '<p class="qr-error">Camera not supported. Please enter store name manually.</p>';
  }
}

/**
 * Handle scanned QR code
 */
function onQRCodeScanned(decodedText) {
  console.log('QR Code scanned:', decodedText);
  
  // Extract store name from URL
  let storeName = extractStoreFromURL(decodedText);
  
  if (storeName) {
    addStoreToList(storeName);
  } else {
    // If can't extract, show the full text for user to confirm
    document.getElementById('qrResult').innerHTML = `
      <p class="qr-found">QR Code detected!</p>
      <p class="qr-content">${decodedText}</p>
      <input type="text" id="qrStoreName" placeholder="Enter store name" value="${decodedText}">
      <button onclick="addQRStore()">Add to List</button>
    `;
  }
}

/**
 * Extract store name from URL
 */
function extractStoreFromURL(url) {
  try {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);
    
    // Check for store parameter
    const store = params.get('store') || params.get('addstore') || params.get('mystore') || params.get('brand');
    
    if (store) {
      return decodeURIComponent(store);
    }
    
    // Check hostname for brand name
    const hostname = urlObj.hostname;
    const brandMatch = hostname.match(/([a-zA-Z0-9-]+)\.(com|net|org)/);
    if (brandMatch) {
      return brandMatch[1].charAt(0).toUpperCase() + brandMatch[1].slice(1);
    }
    
    return null;
  } catch (e) {
    // Not a URL, might be just a store name
    if (url && url.length < 50) {
      return url.trim();
    }
    return null;
  }
}

/**
 * Add store to My List
 */
function addStoreToList(storeName) {
  if (!storeName || storeName.trim() === '') {
    return;
  }
  
  storeName = storeName.trim();
  
  if (typeof addToMyStores === 'function') {
    const added = addToMyStores(storeName);
    
    if (added) {
      showQRResult('success', `✓ "${storeName}" added to your list!`);
      
      // Refresh deals after a short delay
      setTimeout(() => {
        if (typeof loadDeals === 'function') {
          loadDeals();
        }
      }, 1500);
    } else {
      showQRResult('info', `"${storeName}" is already in your list.`);
    }
  }
}

/**
 * Add store from QR input
 */
function addQRStore() {
  const input = document.getElementById('qrStoreName');
  if (input) {
    addStoreToList(input.value);
  }
}

/**
 * Add store from manual input
 */
function addManualStore() {
  const input = document.getElementById('manualStoreInput');
  if (input && input.value.trim()) {
    addStoreToList(input.value);
    input.value = '';
  }
}

/**
 * Show QR result message
 */
function showQRResult(type, message) {
  const resultDiv = document.getElementById('qrResult');
  if (resultDiv) {
    resultDiv.innerHTML = `<p class="qr-${type}">${message}</p>`;
  }
}

/**
 * Close QR Scanner
 */
function closeQRScanner() {
  const scannerContainer = document.getElementById('qrScannerContainer');
  
  if (scannerContainer) {
    scannerContainer.style.display = 'none';
  }
  
  // Stop scanner
  if (qrScanner && qrScannerActive) {
    qrScanner.stop().catch(() => {});
    qrScannerActive = false;
  }
  
  // Stop native camera
  const video = document.getElementById('nativeCamera');
  if (video && video.srcObject) {
    video.srcObject.getTracks().forEach(track => track.stop());
  }
}

/**
 * Add QR Scanner styles
 */
function addQRScannerStyles() {
  if (document.getElementById('qrScannerStyles')) return;
  
  const styles = document.createElement('style');
  styles.id = 'qrScannerStyles';
  styles.textContent = `
    .qr-scanner-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.9);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .qr-scanner-box {
      background: white;
      border-radius: 16px;
      padding: 20px;
      max-width: 350px;
      width: 90%;
      position: relative;
    }
    
    .qr-close-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      background: #f44336;
      color: white;
      border: none;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      font-size: 18px;
      cursor: pointer;
    }
    
    .qr-scanner-box h3 {
      margin: 0 0 15px 0;
      text-align: center;
      color: #163A5C;
    }
    
    #qrReader {
      width: 100%;
      min-height: 200px;
      background: #f0f0f0;
      border-radius: 12px;
      overflow: hidden;
    }
    
    /* REMOVED the object-fit: cover and !important tags that distorted the canvas */
    #qrReader video {
      width: 100%;
      border-radius: 12px;
    }
    
    .qr-instructions {
      text-align: center;
      color: #666;
      font-size: 14px;
      margin: 15px 0 10px;
    }
    
    .qr-result {
      text-align: center;
      margin: 10px 0;
    }
    
    .qr-success {
      color: #4CAF50;
      font-weight: bold;
      padding: 10px;
      background: #e8f5e9;
      border-radius: 8px;
    }
    
    .qr-error {
      color: #f44336;
      font-weight: bold;
      padding: 10px;
      background: #ffebee;
      border-radius: 8px;
      font-size: 14px;
    }
    
    .qr-info {
      color: #2196F3;
      padding: 10px;
      background: #e3f2fd;
      border-radius: 8px;
    }
    
    .qr-found {
      color: #4CAF50;
      font-weight: bold;
    }
    
    .qr-content {
      word-break: break-all;
      font-size: 12px;
      color: #666;
      margin: 5px 0;
    }
    
    .qr-manual {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #eee;
    }
    
    .qr-manual p {
      margin: 0 0 10px 0;
      color: #666;
      font-size: 14px;
    }
    
    .qr-manual input {
      width: calc(100% - 22px);
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 8px;
      margin-bottom: 10px;
      font-size: 16px;
    }
    
    .qr-manual button {
      width: 100%;
      padding: 12px;
      background: #163A5C;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
    }
    
    .qr-manual button:hover {
      background: #2066A7;
    }
    
    #qrStoreName {
      width: calc(100% - 22px);
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 8px;
      margin: 10px 0;
      font-size: 16px;
    }
  `;
  document.head.appendChild(styles);
}

// Load html5-qrcode library dynamically
function loadQRLibrary() {
  if (typeof Html5Qrcode !== 'undefined') return Promise.resolve();
  
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  loadQRLibrary().catch(() => {
    console.log('html5-qrcode library not loaded, using fallback');
  });
});

// Expose functions globally
window.openQRScanner = openQRScanner;
window.closeQRScanner = closeQRScanner;
window.addManualStore = addManualStore;
window.addQRStore = addQRStore;
