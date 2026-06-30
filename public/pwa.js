let deferredInstallPrompt = null;
const INSTALL_DISMISSED_KEY = "padelpagluInstallDismissedAt";

function isAppInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function wasInstallRecentlyDismissed() {
  const dismissedAt = Number(localStorage.getItem(INSTALL_DISMISSED_KEY) || 0);
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  return dismissedAt && Date.now() - dismissedAt < sevenDays;
}

function canShowManualInstallHelp() {
  const userAgent = window.navigator.userAgent.toLowerCase();

  return /iphone|ipad|ipod|android/.test(userAgent);
}

function refreshInstallButtons() {
  const shouldShow = !isAppInstalled();

  document.querySelectorAll("[data-install-app]").forEach((button) => {
    if (!button.closest("#pwaInstallBanner")) {
      button.hidden = !shouldShow;
    }
  });

  document.querySelectorAll("[data-install-card]").forEach((card) => {
    card.hidden = !shouldShow;
  });
}

function setInstallUiVisible(isVisible) {
  const shouldShowBanner = Boolean(isVisible && !isAppInstalled());
  const banner = document.getElementById("pwaInstallBanner");

  if (banner) {
    banner.hidden = !shouldShowBanner;
  }

  refreshInstallButtons();
}

function getInstallInstructions() {
  const userAgent = window.navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(userAgent)) {
    return "On iPhone: tap the Share button in Safari, then choose Add to Home Screen.";
  }

  if (/android/.test(userAgent)) {
    return "On Android: open this website in Chrome, tap the 3-dot menu, then choose Install app or Add to Home screen.";
  }

  return "On desktop Chrome or Edge: use the install icon in the address bar, or open the browser menu and choose Install app.";
}

function createInstallHelpModal() {
  if (document.getElementById("pwaInstallHelpModal")) return;

  const modal = document.createElement("div");
  modal.id = "pwaInstallHelpModal";
  modal.className = "modal-overlay";
  modal.style.display = "none";
  modal.innerHTML = `
    <div class="modal-card">
      <h3>📲 Install PadelPaglu</h3>
      <p id="pwaInstallHelpMessage"></p>
      <button type="button" id="pwaInstallHelpButton">Continue</button>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("pwaInstallHelpButton").addEventListener("click", () => {
    modal.style.display = "none";
  });
}

function showInstallHelpModal() {
  createInstallHelpModal();

  const modal = document.getElementById("pwaInstallHelpModal");
  const message = document.getElementById("pwaInstallHelpMessage");

  message.textContent = getInstallInstructions();
  modal.style.display = "flex";
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
  localStorage.removeItem(INSTALL_DISMISSED_KEY);

  if (isAppInstalled()) {
    setInstallUiVisible(false);
    return;
  }

  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    const choiceResult = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;

    if (choiceResult.outcome === "accepted" || isAppInstalled()) {
      setInstallUiVisible(false);
      return;
    }

    setInstallUiVisible(false);
    refreshInstallButtons();
    return;
  }

  showInstallHelpModal();
  refreshInstallButtons();
}

function bindInstallButtons() {
  document.querySelectorAll("[data-install-app]").forEach((button) => {
    if (button.dataset.installListenerAdded === "true") return;

    button.dataset.installListenerAdded = "true";
    button.addEventListener("click", triggerInstall);
  });
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
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;

  bindInstallButtons();
  refreshInstallButtons();

  if (!wasInstallRecentlyDismissed()) {
    setInstallUiVisible(true);
  }
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  setInstallUiVisible(false);
  localStorage.removeItem(INSTALL_DISMISSED_KEY);
});

document.addEventListener("DOMContentLoaded", () => {
  registerServiceWorker();
  createInstallHelpModal();
  createInstallBanner();
  bindInstallButtons();
  refreshInstallButtons();

  if (isAppInstalled()) {
    setInstallUiVisible(false);
    return;
  }

  if (wasInstallRecentlyDismissed()) {
    setInstallUiVisible(false);
    return;
  }

  if (deferredInstallPrompt || canShowManualInstallHelp()) {
    setInstallUiVisible(true);
  }
});