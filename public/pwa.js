let deferredInstallPrompt = null;
const INSTALL_DISMISSED_KEY = "padelpagluInstallDismissedAt";

function isAppInstalled() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function wasInstallRecentlyDismissed() {
  const dismissedAt = Number(localStorage.getItem(INSTALL_DISMISSED_KEY) || 0);
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  return dismissedAt && Date.now() - dismissedAt < sevenDays;
}

function setInstallUiVisible(isVisible) {
  document.querySelectorAll("[data-install-app]").forEach((button) => {
    button.hidden = !isVisible;
  });

  document.querySelectorAll("[data-install-card]").forEach((card) => {
    card.hidden = !isVisible;
  });

  const banner = document.getElementById("pwaInstallBanner");

  if (banner) {
    banner.hidden = !isVisible;
  }
}

function getInstallInstructions() {
  const userAgent = window.navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(userAgent)) {
    return "On iPhone: tap the Share button, then tap Add to Home Screen.";
  }

  if (/android/.test(userAgent)) {
    return "On Android Chrome: tap the 3-dot menu, then tap Install app or Add to Home screen.";
  }

  return "On desktop Chrome/Edge: use the install icon in the address bar, or open the browser menu and choose Install app.";
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  try {
    await navigator.serviceWorker.register("/sw.js");
  } catch (err) {
    console.error("Service worker registration failed", err);
  }
}

async function triggerInstall() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    const choiceResult = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;

    if (choiceResult.outcome === "accepted" || isAppInstalled()) {
      setInstallUiVisible(false);
    }

    return;
  }

  alert(getInstallInstructions());
}

function createInstallBanner() {
  if (document.getElementById("pwaInstallBanner")) return;

  const banner = document.createElement("aside");
  banner.id = "pwaInstallBanner";
  banner.className = "pwa-install-banner";
  banner.hidden = true;
  banner.innerHTML = `
    <div class="pwa-install-banner-content">
      <img src="/icon-192.png" alt="" aria-hidden="true" />
      <div>
        <strong>Install PadelPaglu</strong>
        <p>Open matches faster from your home screen.</p>
      </div>
    </div>
    <div class="pwa-install-actions">
      <button type="button" class="pwa-later-button" data-install-later>Later</button>
      <button type="button" data-install-app>Install</button>
    </div>
  `;

  document.body.appendChild(banner);

  banner.querySelector("[data-install-later]").addEventListener("click", () => {
    localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now()));
    setInstallUiVisible(false);
  });

  banner.querySelector("[data-install-app]").addEventListener("click", triggerInstall);
}

function setupInstallButtons() {
  document.querySelectorAll("[data-install-app]").forEach((button) => {
    button.addEventListener("click", triggerInstall);
  });
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;

  if (!isAppInstalled() && !wasInstallRecentlyDismissed()) {
    setInstallUiVisible(true);
  }
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  setInstallUiVisible(false);
});

document.addEventListener("DOMContentLoaded", () => {
  registerServiceWorker();
  createInstallBanner();
  setupInstallButtons();

  if (isAppInstalled() || wasInstallRecentlyDismissed()) {
    setInstallUiVisible(false);
    return;
  }

  setInstallUiVisible(true);
});
