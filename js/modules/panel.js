/**
 * UI Panel & Navigation Module
 * Handles the sliding panel UI
 */

(function() {
  const panel = document.getElementById("panel");
  const content = document.getElementById("panelContent");
  
  if (!panel || !content) {
    console.warn('Panel elements not found');
    return;
  }
  
  let startY = 0, currentY = 0, panelY = 0, isDragging = false;
  const screenHeight = window.innerHeight;

  const positions = {
    full: screenHeight * 0,
    mid: screenHeight * 0.5,
    collapsed: screenHeight * 0.89
  };

  const allowedViews = ["add", "generategiftcard", "topup", "signup", "balance", "marketing", "salesletter", "profile"];

  function setPanelY(y, animate = true) {
    panel.style.transition = animate ? "transform 0.3s ease" : "none";
    panel.style.transform = `translateY(${y}px)`;
    panelY = y;

    if (y === positions.full) {
      content.style.overflowY = 'auto';
    } else {
      content.style.overflowY = 'hidden';
      content.scrollTop = 0;
    }

    if (y === positions.collapsed) {
      document.body.classList.remove('noscroll');
    } else {
      document.body.classList.add('noscroll');
    }
  }

  function closestSnap(y) {
    const diffs = Object.values(positions).map(p => Math.abs(p - y));
    const min = Math.min(...diffs);
    return Object.values(positions)[diffs.indexOf(min)];
  }

  async function loadPanelContent(view) {
    if (!allowedViews.includes(view)) {
      console.warn(`[Panel] Blocked attempt to load unknown view: "${view}"`);
      return;
    }

    const url = `${view}.html`;

    try {
      const res = await fetch(url);
      const html = await res.text();

      const contentDiv = document.getElementById('panelContent');
      contentDiv.innerHTML = html;

      const bottomPadding = screenHeight - positions.collapsed;
      contentDiv.style.paddingBottom = `${bottomPadding + 70}px`;

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      tempDiv.querySelectorAll('script').forEach((script) => {
        const newScript = document.createElement('script');
        if (script.src) {
          newScript.src = script.src;
        } else {
          newScript.textContent = script.textContent;
        }
        document.body.appendChild(newScript);
      });

      if (!document.querySelector(`script[src="https://allpree.com/js/${view}.js"]`)) {
        const script = document.createElement('script');
        script.src = `https://allpree.com/js/${view}.js`;
        script.onload = () => {
          const initFn = `init_${view}`;
          if (typeof window[initFn] === 'function') {
            window[initFn]();
          }
        };
        document.body.appendChild(script);
      } else {
        const initFn = `init_${view}`;
        if (typeof window[initFn] === 'function') {
          window[initFn]();
        }
      }

      setPanelY(positions.mid);

    } catch (err) {
      contentDiv.innerHTML = "<p>Error loading content.</p>";
      console.error('Error loading content:', err);
    }
  }

  function startDrag(e) {
    // Don't drag if touching inside popup overlay
    const popup = document.getElementById('popup');
    if (popup && popup.contains(e.target)) return;
    
    if (content.scrollTop > 0) return;
    startY = e.touches ? e.touches[0].clientY : e.clientY;
    isDragging = true;
    panel.style.transition = "none";
  }

  function duringDrag(e) {
    if (!isDragging) return;
    currentY = e.touches ? e.touches[0].clientY : e.clientY;
    const delta = currentY - startY;
    const newY = Math.min(positions.collapsed, Math.max(0, panelY + delta));
    panel.style.transform = `translateY(${newY}px)`;
  }

  function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    const delta = currentY - startY;
    const newY = Math.max(0, panelY + delta);
    const snapTo = closestSnap(newY);
    setPanelY(snapTo);
  }

  ["touchstart", "mousedown"].forEach(evt =>
    panel.addEventListener(evt, startDrag, { passive: false })
  );
  ["touchmove", "mousemove"].forEach(evt =>
    panel.addEventListener(evt, duringDrag, { passive: false })
  );
  ["touchend", "mouseup"].forEach(evt =>
    panel.addEventListener(evt, endDrag)
  );

  const buttons = document.querySelectorAll('.menu-button[data-view]');
  buttons.forEach(button => {
    button.addEventListener('click', () => {
      const view = button.getAttribute('data-view');
      loadPanelContent(view);
    });
  });

  panelY = positions.collapsed;
  setPanelY(panelY, false);
})();
