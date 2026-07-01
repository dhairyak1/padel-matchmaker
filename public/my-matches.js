async function getCsrfToken() {
  const response = await fetch("/api/csrf-token");

  const data = await response.json();

  return data.csrfToken;
}

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

let matchIdPendingDelete = null;

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

function isMatchExpired(match) {
  return getMatchEndDate(match) <= new Date();
}

function sortMatchesActiveFirst(matches) {
  return [...matches].sort((a, b) => {
    const aExpired = isMatchExpired(a);
    const bExpired = isMatchExpired(b);

    if (aExpired !== bExpired) {
      return aExpired ? 1 : -1;
    }

    const aEndDate = getMatchEndDate(a);
    const bEndDate = getMatchEndDate(b);

    if (aExpired) {
      return bEndDate - aEndDate;
    }

    return aEndDate - bEndDate;
  });
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

function getStatusMarkup(match, expired) {
  if (expired) {
    return `<span class="expired-badge">ENDED</span>`;
  }

  return match.is_full
    ? `<span class="status-full">FULL</span>`
    : `<span class="status-open">OPEN</span>`;
}

function getActionMarkup(match, expired) {
  if (expired) {
    return "";
  }

  const availabilityButton = !match.is_full
    ? `
      <button onclick="markFull(${match.id})">
        Mark Full
      </button>
    `
    : `
      <button onclick="reopenMatch(${match.id})">
        Reopen Match
      </button>
    `;

  return `
    <div class="match-actions">
      ${availabilityButton}

      <button class="danger-btn" onclick="openDeleteModal(${match.id})">
        Delete Match
      </button>
    </div>
  `;
}

async function loadMyMatches() {
  const container = document.getElementById("myMatchesContainer");

  try {
    const response = await fetch("/api/my-matches");

    const matches = sortMatchesActiveFirst(await response.json());

    container.innerHTML = "";

    if (matches.length === 0) {
      container.innerHTML = "<p>No matches hosted yet.</p>";

      return;
    }

    matches.forEach((match) => {
      const expired = isMatchExpired(match);
      const card = document.createElement("div");

      card.className = expired ? "match-card expired-match" : "match-card";

      card.innerHTML = `
        <h3>${escapeHTML(match.venue_name)}</h3>

        <p>
          ${formatDate(match.match_date)}
        </p>

        <p>
          ${match.start_time.slice(0, 5)}
          -
          ${match.end_time.slice(0, 5)}
        </p>

        <p>
          Status:
          ${getStatusMarkup(match, expired)}
        </p>

        ${getActionMarkup(match, expired)}
      `;

      container.appendChild(card);
    });
  } catch (err) {
    console.error(err);

    container.innerHTML = "Failed to load matches";
  }
}

async function markFull(matchId) {
  try {
    const csrfToken = await getCsrfToken();

    await fetch(`/api/matches/${matchId}/full`, {
      method: "POST",
      headers: {
        "X-CSRF-Token": csrfToken,
      },
    });

    loadMyMatches();
  } catch (err) {
    console.error(err);
  }
}

async function reopenMatch(matchId) {
  try {
    const csrfToken = await getCsrfToken();

    await fetch(`/api/matches/${matchId}/reopen`, {
      method: "POST",
      headers: {
        "X-CSRF-Token": csrfToken,
      },
    });

    loadMyMatches();
  } catch (err) {
    console.error(err);
  }
}

function openDeleteModal(matchId) {
  matchIdPendingDelete = matchId;
  document.getElementById("deleteConfirmModal").style.display = "flex";
}

function closeDeleteModal() {
  matchIdPendingDelete = null;
  document.getElementById("deleteConfirmModal").style.display = "none";
}

async function confirmDeleteMatch() {
  if (!matchIdPendingDelete) return;

  const matchId = matchIdPendingDelete;

  try {
    const csrfToken = await getCsrfToken();

    await fetch(`/api/matches/${matchId}`, {
      method: "DELETE",
      headers: {
        "X-CSRF-Token": csrfToken,
      },
    });

    closeDeleteModal();
    loadMyMatches();
  } catch (err) {
    console.error(err);
  }
}

document
  .getElementById("cancelDeleteButton")
  .addEventListener("click", closeDeleteModal);

document
  .getElementById("confirmDeleteButton")
  .addEventListener("click", confirmDeleteMatch);

document
  .getElementById("deleteConfirmModal")
  .addEventListener("click", (event) => {
    if (event.target.id === "deleteConfirmModal") {
      closeDeleteModal();
    }
  });

setInterval(loadMyMatches, 60 * 1000);

(async () => {
  const loggedIn = await requireLogin();

  if (!loggedIn) return;

  loadMyMatches();
})();
