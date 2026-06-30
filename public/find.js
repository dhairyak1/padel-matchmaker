let allMatches = [];

function escapeHTML(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

    const duration = getDuration(match.start_time, match.end_time);

    card.innerHTML = `
      <h3>${escapeHTML(match.venue_name || "Unknown Venue")}</h3>

      <p>📍 ${escapeHTML(match.address || "")}</p>

      ${
        match.distance
          ? `<p>🚗 ${Number(match.distance).toFixed(1)} km away</p>`
          : ""
      }

      <p>Date: ${new Date(match.match_date).toLocaleDateString()}</p>

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

document
  .getElementById("venueFilter")
  .addEventListener("input", applyVenueFilter);

setInterval(applyVenueFilter, 60 * 1000);

(async () => {
  const loggedIn = await requireLogin();

  if (!loggedIn) return;

  await setupLocationAndLoadMatches();
})();