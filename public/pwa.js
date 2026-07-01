let deferredInstallPrompt = null;

function isAppInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function canShowManualInstallHelp() {
  const userAgent = window.navigator.userAgent.toLowerCase();

  return /iphone|ipad|ipod|android/.test(userAgent);
}

function refreshInstallButtons() {
  const shouldShow = !isAppInstalled();

  document.querySelectorAll("[data-install-app]").forEach((button) => {
    button.hidden = !shouldShow;
  });

  document.querySelectorAll("[data-install-card]").forEach((card) => {
    card.hidden = !shouldShow;
  });
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

  document
    .getElementById("pwaInstallHelpButton")
    .addEventListener("click", () => {
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
  if (isAppInstalled()) {
    refreshInstallButtons();
    return;
  }

  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    const choiceResult = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;

    if (choiceResult.outcome === "accepted" || isAppInstalled()) {
      refreshInstallButtons();
      return;
    }

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

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;

  bindInstallButtons();
  refreshInstallButtons();
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  refreshInstallButtons();
});

document.addEventListener("DOMContentLoaded", () => {
  registerServiceWorker();
  createInstallHelpModal();
  bindInstallButtons();
  refreshInstallButtons();

  if (!canShowManualInstallHelp() && !deferredInstallPrompt) {
    refreshInstallButtons();
  }
});
