let deferredInstallPrompt = null;

function isAppInstalled() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function setInstallUiVisible(isVisible) {
  document.querySelectorAll("[data-install-app]").forEach((button) => {
    button.hidden = !isVisible;
  });

  document.querySelectorAll("[data-install-card]").forEach((card) => {
    card.hidden = !isVisible;
  });
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

function setupInstallButtons() {
  document.querySelectorAll("[data-install-app]").forEach((button) => {
    button.addEventListener("click", async () => {
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
    });
  });
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;

  if (!isAppInstalled()) {
    setInstallUiVisible(true);
  }
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  setInstallUiVisible(false);
});

document.addEventListener("DOMContentLoaded", () => {
  registerServiceWorker();
  setupInstallButtons();

  if (isAppInstalled()) {
    setInstallUiVisible(false);
    return;
  }

  setInstallUiVisible(true);
});
