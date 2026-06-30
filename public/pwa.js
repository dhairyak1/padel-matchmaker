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
      if (!deferredInstallPrompt) return;

      deferredInstallPrompt.prompt();
      const choiceResult = await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;

      if (choiceResult.outcome === "accepted" || isAppInstalled()) {
        setInstallUiVisible(false);
      }
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
  }
});
