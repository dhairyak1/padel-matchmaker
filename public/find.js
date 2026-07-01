let allMatches = [];
let allFavoriteVenues = [];
let selectedFavoriteVenueIds = new Set();
let notificationConfig = {
  pushEnabled: false,
  vapidPublicKey: "",
};
let notificationTargetHandled = false;

function escapeHTML(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
}

let userLat = null;
let userLng = null;

function getDuration(startTime, endTime) {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);

  let start = startHour * 60 + startMinute;
  let end = endHour * 60 + endMinute;

  if (end < start) {
    end += 24 * 60;
  }

  const duration = end - start;

  if (duration % 60 === 0) {
    return `${duration / 60} hr`;
  }

  return `${duration} mins`;
}

function getMatchEndDate(match) {
  const matchDate = new Date(match.match_date);
  const [startHour, startMinute] = match.start_time.split(":").map(Number);
  const [endHour, endMinute] = match.end_time.split(":").map(Number);

  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  const endDate = new Date(
    matchDate.getFullYear(),
    matchDate.getMonth(),
    matchDate.getDate(),
    endHour,
    endMinute,
  );

  if (endMinutes <= startMinutes) {
    endDate.setDate(endDate.getDate() + 1);
  }

  return endDate;
}

function isMatchActive(match) {
  return getMatchEndDate(match) > new Date();
}

function getActiveMatches(matches) {
  return matches.filter(isMatchActive);
}

function getDeviceNotificationInstructions() {
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  if (/android/.test(userAgent)) {
    return isStandalone
      ? "Android PWA: long-press the app icon or open Android Settings > Apps > PadelPaglu > Notifications, then allow notifications."
      : "Android Chrome: tap the lock icon near the URL, open Permissions/Site settings, and allow Notifications.";
  }

  if (/iphone|ipad|ipod/.test(userAgent)) {
    return isStandalone
      ? "iPhone PWA: open iPhone Settings > Notifications > PadelPaglu and allow notifications."
      : "iPhone: add PadelPaglu to Home Screen first, then open the installed app and allow notifications there.";
  }

  return "Desktop: click the lock icon near the address bar, open Site settings, and allow Notifications.";
}

function getLocationHelpText(error) {
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  let instructions =
    "Enable location permission to automatically see the closest matches first.";

  if (/android/.test(userAgent)) {
    instructions = isStandalone
      ? "Enable location permission in Android Settings > Apps > PadelPaglu > Permissions > Location."
      : "Enable location from the lock icon in Chrome's address bar, or Android Settings > Apps > Chrome > Permissions > Location.";
  } else if (/iphone|ipad|ipod/.test(userAgent)) {
    instructions = isStandalone
      ? "Enable location in iPhone Settings > Privacy & Security > Location Services, then allow it for this web app."
      : "Enable location in iPhone Settings > Privacy & Security > Location Services > Safari Websites.";
  } else {
    instructions =
      "Enable location from your browser's site settings, usually from the lock icon near the address bar.";
  }

  if (error?.code === error?.PERMISSION_DENIED) {
    return `📍 Location permission is blocked. ${instructions}`;
  }

  if (error?.code === error?.POSITION_UNAVAILABLE) {
    return "📍 Your location could not be detected right now. Enable location/GPS and try again to see closest matches first.";
  }

  if (error?.code === error?.TIMEOUT) {
    return "📍 Location request timed out. Enable location/GPS and refresh to see closest matches first.";
  }

  return `📍 ${instructions}`;
}

async function getCsrfToken() {
  const response = await fetch("/api/csrf-token");
  const data = await response.json();

  return data.csrfToken;
}

async function requireLogin() {
  const response = await fetch("/api/me");

  if (!response.ok) {
    document.getElementById("loginModal").style.display = "flex";

    document.getElementById("loginModalButton").onclick = () => {
      window.location.href = "/auth/google";
    };

    return false;
  }

  return true;
}

async function loadMatches() {
  const container = document.getElementById("matchesContainer");

  try {
    const url =
      userLat && userLng
        ? `/api/matches?lat=${userLat}&lng=${userLng}`
        : "/api/matches";

    const response = await fetch(url);

    allMatches = getActiveMatches(await response.json());

    renderMatches(allMatches);
    handleNotificationDeepLink();
  } catch (err) {
    console.error(err);

    container.innerHTML = "Failed to load matches";
  }
}

function renderMatches(matches) {
  const container = document.getElementById("matchesContainer");
  const activeMatches = getActiveMatches(matches);

  container.innerHTML = "";

  document.getElementById("emptyState").style.display = "none";

  if (activeMatches.length === 0) {
    document.getElementById("emptyState").style.display = "block";

    return;
  }

  activeMatches.forEach((match) => {
    const card = document.createElement("div");

    card.className = "match-card";
    card.dataset.matchId = String(match.id || "");
    card.dataset.venueId = String(match.venue_id || "");
    card.dataset.venueName = String(match.venue_name || "");

    const duration = getDuration(match.start_time, match.end_time);

    card.innerHTML = `
      <h3>${escapeHTML(match.venue_name || "Unknown Venue")}</h3>

      <p>📍 ${escapeHTML(match.address || "")}</p>

      ${
        match.distance
          ? `<p>🚗 ${Number(match.distance).toFixed(1)} km away</p>`
          : ""
      }

      <p>Date: ${formatDate(match.match_date)}</p>

      <p>Time: ${match.start_time.slice(0, 5)} - ${match.end_time.slice(0, 5)}</p>

      <p>Duration: ${duration}</p>

      <p>Skill: ${escapeHTML(match.skill_level)}</p>

      <p>Players Needed: ${escapeHTML(match.players_needed)}</p>

      <p>Notes: ${escapeHTML(match.notes || "None")}</p>

      ${match.is_full ? "<p><strong>MATCH FULL</strong></p>" : ""}

      ${
        !match.is_full
          ? `
          <a
            href="https://wa.me/${match.host_phone.replace("+", "")}?text=${encodeURIComponent(
              `Hi ${match.host_name}, I saw your match on Padel Matchmaker and would like to join if a spot is available.`,
            )}"
            target="_blank"
          >
            Contact Host
          </a>
          `
          : ""
      }
    `;

    container.appendChild(card);
  });
}

function highlightMatchCard(card) {
  if (!card) return;

  setTimeout(() => {
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.classList.add("notification-highlight-match");

    setTimeout(() => {
      card.classList.remove("notification-highlight-match");
    }, 3500);
  }, 250);
}

function handleNotificationDeepLink() {
  if (notificationTargetHandled) return;

  const params = new URLSearchParams(window.location.search);
  const matchId = params.get("match") || params.get("matchId") || params.get("id");
  const venueId = params.get("venueId");
  const venueName = params.get("venue");

  if (!matchId && !venueId && !venueName) return;

  let targetCard = null;

  if (matchId) {
    targetCard = document.querySelector(`[data-match-id="${CSS.escape(String(matchId))}"]`);
  }

  if (!targetCard && venueId) {
    targetCard = document.querySelector(`[data-venue-id="${CSS.escape(String(venueId))}"]`);
  }

  if (!targetCard && venueName) {
    const normalizedVenue = venueName.toLowerCase().trim();

    const filtered = allMatches.filter((match) =>
      String(match.venue_name || "").toLowerCase().includes(normalizedVenue),
    );

    if (filtered.length > 0) {
      document.getElementById("venueFilter").value = venueName;
      renderMatches(filtered);
      targetCard = document.querySelector(".match-card");
    }
  }

  if (!targetCard) {
    console.warn("Notification deep link target not found", {
      matchId,
      venueId,
      venueName,
    });

    return;
  }

  notificationTargetHandled = true;
  highlightMatchCard(targetCard);
}

function applyVenueFilter() {
  const search = document
    .getElementById("venueFilter")
    .value.toLowerCase()
    .trim();

  allMatches = getActiveMatches(allMatches);

  if (!search) {
    renderMatches(allMatches);
    return;
  }

  const filtered = allMatches.filter((match) =>
    `${match.venue_name || ""} ${match.address || ""}`
      .toLowerCase()
      .includes(search),
  );

  renderMatches(filtered);
}

function requestLocationAndLoadMatches() {
  const locationStatus = document.getElementById("locationStatus");

  if (!navigator.geolocation) {
    locationStatus.textContent =
      "📍 Location is not supported by this browser. Showing all available matches.";
    loadMatches();
    return;
  }

  locationStatus.textContent = "📍 Checking location permission...";

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      userLat = position.coords.latitude;
      userLng = position.coords.longitude;
      locationStatus.textContent =
        "📍 Showing matches nearest to your current location.";

      await loadMatches();
    },

    async (error) => {
      locationStatus.textContent = getLocationHelpText(error);
      await loadMatches();
    },

    {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 5 * 60 * 1000,
    },
  );
}

async function setupLocationAndLoadMatches() {
  const locationStatus = document.getElementById("locationStatus");

  try {
    if (navigator.permissions?.query) {
      const permission = await navigator.permissions.query({ name: "geolocation" });

      if (permission.state === "denied") {
        locationStatus.textContent = getLocationHelpText({
          code: 1,
          PERMISSION_DENIED: 1,
        });
        await loadMatches();
        return;
      }
    }
  } catch (err) {
    console.error(err);
  }

  requestLocationAndLoadMatches();
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

function updateFavoriteSelectedCount() {
  const count = selectedFavoriteVenueIds.size;
  document.getElementById("favoriteVenueSelectedCount").textContent =
    `${count} ${count === 1 ? "venue" : "venues"} selected`;
}

function renderFavoriteVenues() {
  const list = document.getElementById("favoriteVenueList");
  const search = document
    .getElementById("favoriteVenueSearch")
    .value.toLowerCase()
    .trim();

  const venues = allFavoriteVenues.filter((venue) =>
    `${venue.name || ""} ${venue.address || ""}`.toLowerCase().includes(search),
  );

  list.innerHTML = "";

  if (venues.length === 0) {
    list.innerHTML = `<p class="helper-text">No venues found.</p>`;
    updateFavoriteSelectedCount();
    return;
  }

  venues.forEach((venue) => {
    const venueId = String(venue.id);
    const item = document.createElement("label");
    item.className = "favorite-venue-option";

    item.innerHTML = `
      <input type="checkbox" value="${escapeHTML(venueId)}" ${
        selectedFavoriteVenueIds.has(venueId) ? "checked" : ""
      } />
      <span>
        <strong>${escapeHTML(venue.name)}</strong>
        <small>${escapeHTML(venue.address || "Mumbai")}</small>
      </span>
    `;

    item.querySelector("input").addEventListener("change", (event) => {
      if (event.target.checked) {
        selectedFavoriteVenueIds.add(venueId);
      } else {
        selectedFavoriteVenueIds.delete(venueId);
      }

      updateFavoriteSelectedCount();
    });

    list.appendChild(item);
  });

  updateFavoriteSelectedCount();
}

function updateNotificationStatus() {
  const status = document.getElementById("favoriteNotificationStatus");
  const help = document.getElementById("favoriteNotificationHelp");
  const button = document.getElementById("enableFavoriteNotificationsButton");
  const troubleshooting = document.getElementById("favoriteTroubleshootingText");

  troubleshooting.textContent = getDeviceNotificationInstructions();

  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    status.textContent = "Notifications are not supported here";
    help.textContent = "Use Android Chrome, desktop Chrome/Edge, or an installed supported PWA for push notifications.";
    button.hidden = true;
    return;
  }

  if (!notificationConfig.pushEnabled) {
    status.textContent = "Notifications need server setup";
    help.textContent = "Favourite venues will still save. To send real push alerts, add VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT in hosting env variables.";
    button.hidden = true;
    return;
  }

  if (Notification.permission === "granted") {
    status.textContent = "Notifications are enabled ✅";
    help.textContent = "This browser will receive alerts for the currently logged-in account's selected venues.";
    button.hidden = true;
    return;
  }

  if (Notification.permission === "denied") {
    status.textContent = "Notifications are blocked";
    help.textContent = getDeviceNotificationInstructions();
    button.hidden = true;
    return;
  }

  status.textContent = "Notifications are not enabled yet";
  help.textContent = "Tap Enable Notifications so PadelPaglu can alert you when matches open at your favourite venues.";
  button.hidden = false;
}

async function loadNotificationConfig() {
  try {
    const response = await fetch("/api/notification-config");

    notificationConfig = response.ok
      ? await response.json()
      : { pushEnabled: false, vapidPublicKey: "" };
  } catch (err) {
    console.error(err);
    notificationConfig = { pushEnabled: false, vapidPublicKey: "" };
  }
}

async function saveSubscriptionForCurrentUser(subscription) {
  if (!subscription) return false;

  const csrfToken = await getCsrfToken();
  const response = await fetch("/api/push-subscription", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
    },
    body: JSON.stringify({ subscription }),
  });

  if (!response.ok) {
    throw new Error("Failed to save notification subscription");
  }

  return true;
}

async function getOrCreateFavoriteNotificationSubscription() {
  if (!notificationConfig.pushEnabled) return null;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  if (Notification.permission !== "granted") return null;

  const registration = await navigator.serviceWorker.ready;
  const existingSubscription = await registration.pushManager.getSubscription();

  if (existingSubscription) {
    return existingSubscription;
  }

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(notificationConfig.vapidPublicKey),
  });
}

async function syncFavoriteNotificationSubscription() {
  const subscription = await getOrCreateFavoriteNotificationSubscription();

  if (!subscription) return false;

  return saveSubscriptionForCurrentUser(subscription);
}

async function autoRelinkNotificationSubscription() {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  await loadNotificationConfig();

  if (!notificationConfig.pushEnabled) return;

  try {
    await syncFavoriteNotificationSubscription();
  } catch (err) {
    console.error("Failed to relink notification subscription", err);
  }
}

async function enableFavoriteNotifications() {
  try {
    if (!("Notification" in window)) return;

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      updateNotificationStatus();
      return;
    }

    await syncFavoriteNotificationSubscription();
    updateNotificationStatus();
  } catch (err) {
    console.error(err);
    document.getElementById("favoriteNotificationStatus").textContent =
      "Could not enable notifications";
    document.getElementById("favoriteNotificationHelp").textContent =
      getDeviceNotificationInstructions();
  }
}

async function loadFavoriteVenueSettings() {
  try {
    const [venuesResponse, favoritesResponse] = await Promise.all([
      fetch("/api/venues"),
      fetch("/api/favorite-venues"),
    ]);

    allFavoriteVenues = await venuesResponse.json();
    const favorites = favoritesResponse.ok ? await favoritesResponse.json() : { venueIds: [] };

    await loadNotificationConfig();

    selectedFavoriteVenueIds = new Set((favorites.venueIds || []).map(String));

    renderFavoriteVenues();
    updateNotificationStatus();

    if (Notification.permission === "granted" && notificationConfig.pushEnabled) {
      await syncFavoriteNotificationSubscription();
    }
  } catch (err) {
    console.error(err);
    document.getElementById("favoriteVenueList").innerHTML =
      `<p class="helper-text">Could not load venues right now.</p>`;
  }
}

async function saveFavoriteVenues() {
  const saveButton = document.getElementById("saveFavoriteVenuesButton");

  try {
    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    if (Notification.permission === "granted" && notificationConfig.pushEnabled) {
      await syncFavoriteNotificationSubscription();
    }

    const csrfToken = await getCsrfToken();
    const response = await fetch("/api/favorite-venues", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({
        venueIds: Array.from(selectedFavoriteVenueIds),
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to save favourite venues");
    }

    saveButton.textContent = "Saved ✅";

    setTimeout(() => {
      saveButton.textContent = "Save Favourite Venues";
      saveButton.disabled = false;
      closeFavoriteVenuesModal();
    }, 450);
  } catch (err) {
    console.error(err);
    saveButton.textContent = "Could not save. Try again.";
    saveButton.disabled = false;
  }
}

function openFavoriteVenuesModal() {
  document.getElementById("favoriteVenuesModal").style.display = "flex";
  loadFavoriteVenueSettings();
}

function closeFavoriteVenuesModal() {
  document.getElementById("favoriteVenuesModal").style.display = "none";
}

document
  .getElementById("venueFilter")
  .addEventListener("input", applyVenueFilter);

document
  .getElementById("favoriteVenuesButton")
  .addEventListener("click", openFavoriteVenuesModal);

document
  .getElementById("closeFavoriteVenuesModal")
  .addEventListener("click", closeFavoriteVenuesModal);

document
  .getElementById("favoriteVenuesModal")
  .addEventListener("click", (event) => {
    if (event.target.id === "favoriteVenuesModal") {
      closeFavoriteVenuesModal();
    }
  });

document
  .getElementById("favoriteVenueSearch")
  .addEventListener("input", renderFavoriteVenues);

document
  .getElementById("enableFavoriteNotificationsButton")
  .addEventListener("click", enableFavoriteNotifications);

document
  .getElementById("saveFavoriteVenuesButton")
  .addEventListener("click", saveFavoriteVenues);

setInterval(applyVenueFilter, 60 * 1000);

(async () => {
  const loggedIn = await requireLogin();

  if (!loggedIn) return;

  await setupLocationAndLoadMatches();
  await autoRelinkNotificationSubscription();
})();
