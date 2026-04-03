/**
 * Splash Screen Animation Module
 * Handles splash screen loading animation and fade out
 */

(function() {
  // Letter animation
  const loadingText = "Loading...";
  const container = document.getElementById("loadingText");

  if (container) {
    loadingText.split("").forEach((char, i) => {
      const span = document.createElement("span");
      span.textContent = char;
      span.style.animationDelay = `${i * 0.4}s`;
      container.appendChild(span);
    });
  }

  // Fade out splash after 4.5 seconds
  setTimeout(() => {
    const splash = document.getElementById("splash-screen");
    if (splash) {
      splash.style.transition = "opacity 1s ease";
      splash.style.opacity = 0;
      setTimeout(() => {
        splash.style.display = "none";
        const mainApp = document.getElementById("main-app");
        if (mainApp) {
          mainApp.style.display = "block";
        }
      }, 1000); // wait for fade out
    }
  }, 4500);
})();