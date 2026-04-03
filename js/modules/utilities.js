/**
 * Data Processing & Utilities Module
 * Helper functions for data manipulation
 */

/**
 * Generate unique deal key
 */
function getDealKey(deal) {
  return `${(deal.brandName || '').trim().toLowerCase()}-${(deal.name || '').trim().toLowerCase()}`
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9\-]/g, '');
}

/**
 * Convert hex color to semi-transparent RGBA
 */
function toSemiTransparent(color, alpha = 0.5) {
  color = color.trim();
  
  if (color.startsWith('#')) {
    let r, g, b;
    
    if (color.length === 7) {
      r = parseInt(color.substr(1, 2), 16);
      g = parseInt(color.substr(3, 2), 16);
      b = parseInt(color.substr(5, 2), 16);
    } else if (color.length === 4) {
      r = parseInt(color[1] + color[1], 16);
      g = parseInt(color[2] + color[2], 16);
      b = parseInt(color[3] + color[3], 16);
    } else {
      return color;
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  return color;
}

/**
 * Start brand countdown timer
 */
function startBrandCountdown(expireDate, elementId) {
  const parsedDate = Date.parse(expireDate);
  const el = document.getElementById(elementId);

  if (!el) return;

  if (isNaN(parsedDate) || parsedDate < Date.now()) {
    el.textContent = '⏳ Coming soon';
    el.classList.add('countdown-upcoming');
    return;
  }

  function update() {
    const timeLeft = parsedDate - Date.now();

    if (timeLeft <= 0) {
      el.textContent = '❌ Deal ended';
      el.classList.add('countdown-ended');
      clearInterval(timer);
    } else {
      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hrs = String(Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / 3600000)).padStart(2, '0');
      const mins = String(Math.floor((timeLeft % 3600000) / 60000)).padStart(2, '0');
      const secs = String(Math.floor((timeLeft % 60000) / 1000)).padStart(2, '0');

      let countdownStr = '';
      if (days > 0) {
        countdownStr += `${days}d `;
      }

      countdownStr += `${hrs}hr :${mins}min :${secs}sec`;

      el.innerHTML = `⏳ <span class="countdown-timer">Ends in: ${countdownStr}</span>`;

      if (timeLeft <= 3600000) {
        el.classList.add('countdown-urgent');
      } else {
        el.classList.remove('countdown-urgent');
      }
    }
  }

  update();
  const timer = setInterval(update, 1000);
}