/**
 * QR Scanner Module
 * Opens camera to scan QR codes and adds stores to My List
 * Fixed for PWA mobile: qrbox object format, jsQR fallback with real decoding,
 * service-worker-safe CDN loading, proper cleanup.
 */

// Scanner state
let qrScanner = null;
let qrScannerActive = false;

/**
 * Open QR Scanner
 */
function openQRScanner() {
  let scannerContainer = document.getElementById('qrScannerContainer');

  if (!scannerContainer) {
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
    addQRScannerStyles();
  }

  scannerContainer.style.display = 'block';
  showQRResult('info', 'Starting camera...');

  loadQRLibrary()
    .then(() => {
      document.getElementById('qrResult').innerHTML = '';
      startQRScanner();
    })
    .catch(() => {
      console.warn('[QR] html5-qrcode failed to load, using jsQR fallback');
      startJsQRCamera();
    });
}

/**
 * Start QR Scanner using html5-qrcode (primary)
 */
function startQRScanner() {
  const qrReader = document.getElementById('qrReader');

  if (!qrReader) {
    console.error('[QR] qrReader element not found');
    return;
  }

  if (typeof Html5Qrcode === 'undefined') {
    console.warn('[QR] Html5Qrcode not available, falling back to jsQR');
    startJsQRCamera();
    return;
  }

  qrScanner = new Html5Qrcode('qrReader');

  qrScanner.start(
    { facingMode: 'environment' },
    {
      fps: 10,
      // FIX: must be an object in html5-qrcode v2.3+, plain number breaks scanning
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
    },
    (decodedText) => {
      console.log('[QR] Scanned:', decodedText);
      onQRCodeScanned(decodedText);
    },
    (errorMessage) => {
      // Suppress noisy per-frame "not found" errors, but log real ones
      if (
        !errorMessage.includes('No MultiFormat') &&
        !errorMessage.includes('No barcode') &&
        !errorMessage.includes('NotFoundException')
      ) {
        console.warn('[QR] Scan warning:', errorMessage);
      }
    }
  ).catch((err) => {
    console.error('[QR] Scanner start error:', err);
    showQRResult('error', 'Camera access denied or unavailable. Please use manual input below.');
  });

  qrScannerActive = true;
}

/**
 * jsQR fallback — real QR decoding via canvas frame loop.
 * Used when html5-qrcode CDN is blocked (common in PWAs with strict SW rules).
 */
function startJsQRCamera() {
  const qrReader = document.getElementById('qrReader');

  qrReader.innerHTML = `
    <video id="nativeCamera" playsinline autoplay muted
      style="width:100%;border-radius:12px;display:block;"></video>
    <canvas id="nativeCanvas" style="display:none;"></canvas>
  `;

  showQRResult('info', 'Camera loading...');

  const startCamera = () => {
    const video = document.getElementById('nativeCamera');
    const canvas = document.getElementById('nativeCanvas');
    const ctx = canvas.getContext('2d');

    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
    })
      .then((stream) => {
        video.srcObject = stream;
        qrScannerActive = true;
        showQRResult('info', 'Scanning... point at QR code');

        video.addEventListener('loadeddata', () => {
          function scanFrame() {
            if (!qrScannerActive) return;

            if (video.readyState >= video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

              // jsQR is loaded by this point
              const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert'
              });

              if (code && code.data) {
                console.log('[QR] jsQR decoded:', code.data);
                qrScannerActive = false; // Stop loop
                onQRCodeScanned(code.data);
                return;
              }
            }

            requestAnimationFrame(scanFrame);
          }

          scanFrame();
        });
      })
      .catch((err) => {
        console.error('[QR] Camera error:', err);
        showQRResult('error', 'Camera not available. Please enter store name manually.');
      });
  };

  // Load jsQR if not already present
  if (typeof jsQR !== 'undefined') {
    startCamera();
  } else {
    const script = document.createElement('script');
    // jsQR is small (~30kb), self-contained, no unpkg dependency
    script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
    script.onload = startCamera;
    script.onerror = () => {
      showQRResult('error', 'Scanner unavailable. Please enter store name manually.');
    };
    document.head.appendChild(script);
  }
}

/**
 * Handle scanned QR code result
 */
function onQRCodeScanned(decodedText) {
  console.log('[QR] Processing:', decodedText);

  // Stop scanning so it doesn't fire multiple times
  if (qrScanner && qrScannerActive) {
    qrScanner.stop().catch(() => {});
  }
  qrScannerActive = false;

  const storeName = extractStoreFromURL(decodedText);

  if (storeName) {
    addStoreToList(storeName);
  } else {
    // Show the raw value and let user confirm/edit
    document.getElementById('qrResult').innerHTML = `
      <p class="qr-found">✓ QR Code detected!</p>
      <p class="qr-content">${decodedText}</p>
      <input type="text" id="qrStoreName" placeholder="Enter store name" value="${decodedText}">
      <button onclick="addQRStore()">Add to List</button>
    `;
  }
}

/**
 * Extract store name from QR payload (URL or plain text)
 */
function extractStoreFromURL(url) {
  try {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);

    const store = params.get('store') || params.get('addstore') || params.get('mystore') || params.get('brand');
    if (store) return decodeURIComponent(store);

    const hostname = urlObj.hostname;
    const brandMatch = hostname.match(/([a-zA-Z0-9-]+)\.(com|net|org|app)/);
    if (brandMatch) {
      return brandMatch[1].charAt(0).toUpperCase() + brandMatch[1].slice(1);
    }

    return null;
  } catch {
    // Not a URL — treat short strings as a store name directly
    if (url && url.trim().length > 0 && url.trim().length < 50) {
      return url.trim();
    }
    return null;
  }
}

/**
 * Add store to My List
 */
function addStoreToList(storeName) {
  if (!storeName || storeName.trim() === '') return;

  storeName = storeName.trim();

  if (typeof addToMyStores === 'function') {
    const added = addToMyStores(storeName);

    if (added) {
      showQRResult('success', `✓ "${storeName}" added to your list!`);
      setTimeout(() => {
        if (typeof loadDeals === 'function') loadDeals();
        closeQRScanner(true); // Explicitly reload here since we added a new store
      }, 1200);
    } else {
      showQRResult('info', `"${storeName}" is already in your list.`);
      setTimeout(() => closeQRScanner(false), 1200);
    }
  }
}

/**
 * Add store from QR confirm input
 */
function addQRStore() {
  const input = document.getElementById('qrStoreName');
  if (input && input.value.trim()) addStoreToList(input.value);
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
 * Show result message in the QR result area
 */
function showQRResult(type, message) {
  const resultDiv = document.getElementById('qrResult');
  if (resultDiv) {
    resultDiv.innerHTML = `<p class="qr-${type}">${message}</p>`;
  }
}

/**
 * Close and fully clean up QR Scanner
 * @param {boolean} reload - If true, reload the page so the splash
 *   video plays and deals refresh. Defaults to false.
 */
function closeQRScanner(reload = false) {
  // Stop frame loop (used by jsQR fallback)
  qrScannerActive = false;

  const scannerContainer = document.getElementById('qrScannerContainer');
  if (scannerContainer) scannerContainer.style.display = 'none';

  // Stop html5-qrcode scanner
  if (qrScanner) {
    qrScanner.stop().catch(() => {});
    qrScanner = null;
  }

  // Stop native camera stream
  const video = document.getElementById('nativeCamera');
  if (video && video.srcObject) {
    video.srcObject.getTracks().forEach(track => track.stop());
    video.srcObject = null;
  }

  // Reload page so splash video plays and deals refresh
  if (reload) {
    location.reload();
  }
}

/**
 * Load html5-qrcode from CDN (primary library)
 */
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

/**
 * Add QR Scanner CSS styles
 */
function addQRScannerStyles() {
  if (document.getElementById('qrScannerStyles')) return;

  const styles = document.createElement('style');
  styles.id = 'qrScannerStyles';
  styles.textContent = `
    .qr-scanner-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
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
      top: 10px; right: 10px;
      background: #f44336;
      color: white;
      border: none;
      border-radius: 50%;
      width: 30px; height: 30px;
      font-size: 18px;
      cursor: pointer;
      z-index: 1;
    }

    .qr-scanner-box h3 {
      margin: 0 0 15px 0;
      text-align: center;
      color: #163A5C;
    }

    #qrReader {
      width: 100%;
      min-height: 200px;
      background: #000;
      border-radius: 12px;
      overflow: hidden;
    }

    #qrReader video {
      width: 100%;
      border-radius: 12px;
      display: block;
    }

    /* Prevent html5-qrcode from distorting its internal canvas */
    #qrReader canvas {
      width: 100% !important;
      height: auto !important;
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

    .qr-found { color: #4CAF50; font-weight: bold; }

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

    .qr-manual input,
    #qrStoreName {
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

    .qr-manual button:hover { background: #2066A7; }

    #qrStoreName { margin: 10px 0; }
  `;
  document.head.appendChild(styles);
}

// Pre-load libraries on page load for faster scanner open
document.addEventListener('DOMContentLoaded', () => {
  loadQRLibrary().catch(() => {
    // Pre-load jsQR as fallback
    if (typeof jsQR === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
      document.head.appendChild(script);
    }
  });
});

// Expose functions globally
window.openQRScanner = openQRScanner;
window.closeQRScanner = closeQRScanner;
window.addManualStore = addManualStore;
window.addQRStore = addQRStore;