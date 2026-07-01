(() => {
  const style = document.createElement("style");
  style.textContent = `
    .match-card {
      padding: 16px;
      border-radius: 20px;
      margin-bottom: 0;
    }

    .match-card-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
    }

    .match-card-title {
      min-width: 0;
    }

    .match-card-title h3 {
      margin: 0 0 6px;
      font-size: 1.05rem;
      line-height: 1.2;
    }

    .match-card .match-venue-link {
      display: inline;
      min-height: 0;
      margin: 0;
      padding: 0;
      border-radius: 0;
      background: transparent;
      color: var(--text);
      text-align: left;
      text-decoration: none;
      font-weight: 800;
    }

    .match-card .match-venue-link:hover {
      background: transparent;
      color: var(--accent);
    }

    .match-status-pill {
      flex: 0 0 auto;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(34, 197, 94, 0.14);
      color: #22c55e;
      font-size: 12px;
      font-weight: 800;
      white-space: nowrap;
    }

    .match-status-pill.full {
      background: rgba(239, 68, 68, 0.14);
      color: var(--danger);
    }

    .match-card .match-address-link,
    .match-card .match-address-text {
      display: inline;
      min-height: 0;
      margin: 0;
      padding: 0;
      border-radius: 0;
      background: transparent;
      color: var(--muted);
      text-align: left;
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
      line-height: 1.35;
    }

    .match-card .match-address-link:hover {
      background: transparent;
      color: var(--accent);
    }

    .match-chip-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 12px 0;
    }

    .match-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 7px 9px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--border);
      color: #e5e7eb;
      font-size: 12.5px;
      font-weight: 700;
      line-height: 1;
    }

    .match-detail-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-top: 10px;
    }

    .match-detail-item {
      padding: 9px 10px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.045);
      border: 1px solid rgba(255, 255, 255, 0.06);
      min-width: 0;
    }

    .match-detail-label {
      display: block;
      margin-bottom: 3px;
      color: var(--muted);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .match-detail-value {
      display: block;
      color: var(--text);
      font-size: 14px;
      font-weight: 750;
      overflow-wrap: anywhere;
    }

    .match-host-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-top: 10px;
      padding: 10px 12px;
      border-radius: 16px;
      background: rgba(217, 255, 63, 0.08);
      border: 1px solid rgba(217, 255, 63, 0.16);
    }

    .match-host-card span {
      display: block;
    }

    .match-host-label {
      color: var(--muted);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .match-host-value {
      color: var(--text);
      font-size: 14px;
      font-weight: 800;
      overflow-wrap: anywhere;
    }

    .match-card .match-phone-link {
      display: inline;
      min-height: 0;
      margin: 0;
      padding: 0;
      border-radius: 0;
      background: transparent;
      color: var(--accent);
      text-align: left;
      text-decoration: none;
      font-size: 13px;
      font-weight: 800;
      white-space: nowrap;
    }

    .match-card .match-phone-link:hover {
      background: transparent;
      color: var(--accent-hover);
    }

    .match-notes {
      margin-top: 10px;
      padding: 10px 12px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.045);
      border: 1px solid var(--border);
      color: var(--muted);
      font-size: 13px;
      line-height: 1.45;
    }

    .match-card .match-contact-button {
      margin-top: 12px;
      padding: 12px 14px;
      border-radius: 16px;
    }

    @media (max-width: 520px) {
      .match-detail-grid {
        grid-template-columns: 1fr;
        gap: 7px;
      }

      .match-host-card {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  `;
  document.head.appendChild(style);

  const venueDetailsById = new Map();
  let venueDetailsPromise = null;

  function escapeAttribute(value) {
    return escapeHTML(value).replaceAll("`", "&#096;");
  }

  function normalizeExternalUrl(value) {
    const url = String(value || "").trim();

    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;

    return `https://${url.replace(/^\/\//, "")}`;
  }

  function firstString(source, keys) {
    if (!source) return "";

    for (const key of keys) {
      const value = source[key];

      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }

    return "";
  }

  function getVenueDetails(match) {
    return (
      match.venue || venueDetailsById.get(String(match.venue_id || "")) || {}
    );
  }

  function getHudleUrl(match) {
    const venue = getVenueDetails(match);
    const rawUrl = firstString(venue, [
      "hudle_url",
      "hudle_link",
      "hudle_page",
      "hudle_page_url",
      "booking_url",
      "booking_link",
      "venue_url",
      "source_url",
      "url",
      "link",
    ]);

    return normalizeExternalUrl(rawUrl);
  }

  function getMapsUrl(match) {
    const venue = getVenueDetails(match);
    const directMapUrl = firstString(venue, [
      "maps_url",
      "map_url",
      "maps_link",
      "map_link",
      "google_maps_url",
      "google_maps_link",
      "google_map_url",
      "location_url",
      "location_link",
    ]);

    if (directMapUrl) {
      return normalizeExternalUrl(directMapUrl);
    }

    const latitude = venue.latitude || match.latitude;
    const longitude = venue.longitude || match.longitude;

    if (latitude && longitude) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${latitude},${longitude}`,
      )}`;
    }

    const query = [match.venue_name, match.address].filter(Boolean).join(", ");

    return query
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
      : "";
  }

  function getWhatsAppUrl(match) {
    const phone = String(match.host_phone || "").replace(/\D/g, "");

    if (!phone) return "";

    return `https://wa.me/${phone}?text=${encodeURIComponent(
      `Hi ${match.host_name || "there"}, I saw your match on PadelPaglu and would like to join if a spot is available.`,
    )}`;
  }

  async function loadVenueDetailsForCards() {
    if (venueDetailsPromise) return venueDetailsPromise;

    venueDetailsPromise = fetch("/api/venues")
      .then((response) => (response.ok ? response.json() : []))
      .then((venues) => {
        venues.forEach((venue) => {
          venueDetailsById.set(String(venue.id), venue);
        });

        return venues;
      })
      .catch((err) => {
        console.error("Failed to load venue details for match cards", err);
        return [];
      });

    return venueDetailsPromise;
  }

  getDuration = function getReadableDuration(startTime, endTime) {
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);

    let start = startHour * 60 + startMinute;
    let end = endHour * 60 + endMinute;

    if (end < start) {
      end += 24 * 60;
    }

    const duration = end - start;

    if (duration < 60) {
      return `${duration} mins`;
    }

    const hours = duration / 60;
    const label = Number.isInteger(hours)
      ? String(hours)
      : String(hours).replace(/\.0$/, "");

    return `${label} ${hours === 1 ? "hour" : "hours"}`;
  };

  loadMatches = async function loadMatchesWithVenueDetails() {
    const container = document.getElementById("matchesContainer");

    try {
      await loadVenueDetailsForCards();

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
  };

  renderMatches = function renderCompactMatches(matches) {
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

      card.className = "match-card match-card-compact";
      card.dataset.matchId = String(match.id || "");
      card.dataset.venueId = String(match.venue_id || "");
      card.dataset.venueName = String(match.venue_name || "");

      const duration = getDuration(match.start_time, match.end_time);
      const venueName = match.venue_name || "Unknown Venue";
      const address = match.address || "Mumbai";
      const hudleUrl = getHudleUrl(match);
      const mapsUrl = getMapsUrl(match);
      const whatsAppUrl = getWhatsAppUrl(match);
      const notes = String(match.notes || "").trim();
      const hostName = match.host_name || "Host";
      const hostPhone = match.host_phone || "Number unavailable";

      const venueTitle = hudleUrl
        ? `<a class="match-venue-link" href="${escapeAttribute(hudleUrl)}" target="_blank" rel="noopener noreferrer">${escapeHTML(venueName)}</a>`
        : escapeHTML(venueName);

      const addressLine = mapsUrl
        ? `<a class="match-address-link" href="${escapeAttribute(mapsUrl)}" target="_blank" rel="noopener noreferrer">📍 ${escapeHTML(address)}</a>`
        : `<span class="match-address-text">📍 ${escapeHTML(address)}</span>`;

      card.innerHTML = `
        <div class="match-card-header">
          <div class="match-card-title">
            <h3>${venueTitle}</h3>
            ${addressLine}
          </div>
          <span class="match-status-pill ${match.is_full ? "full" : ""}">${
            match.is_full ? "Full" : "Open"
          }</span>
        </div>

        <div class="match-chip-row">
          <span class="match-chip">📅 ${formatDate(match.match_date)}</span>
          <span class="match-chip">⏰ ${escapeHTML(match.start_time.slice(0, 5))} - ${escapeHTML(
            match.end_time.slice(0, 5),
          )}</span>
          <span class="match-chip">⏳ ${escapeHTML(duration)}</span>
          ${match.distance ? `<span class="match-chip">🚗 ${Number(match.distance).toFixed(1)} km</span>` : ""}
        </div>

        <div class="match-detail-grid">
          <div class="match-detail-item">
            <span class="match-detail-label">Skill</span>
            <span class="match-detail-value">${escapeHTML(match.skill_level)}</span>
          </div>
          <div class="match-detail-item">
            <span class="match-detail-label">Players Needed</span>
            <span class="match-detail-value">${escapeHTML(match.players_needed)}</span>
          </div>
        </div>

        <div class="match-host-card">
          <div>
            <span class="match-host-label">Host</span>
            <span class="match-host-value">${escapeHTML(hostName)}</span>
          </div>
          ${
            whatsAppUrl
              ? `<a class="match-phone-link" href="${escapeAttribute(whatsAppUrl)}" target="_blank" rel="noopener noreferrer">${escapeHTML(hostPhone)}</a>`
              : `<span class="match-host-value">${escapeHTML(hostPhone)}</span>`
          }
        </div>

        ${notes ? `<div class="match-notes">📝 ${escapeHTML(notes)}</div>` : ""}

        ${
          !match.is_full && whatsAppUrl
            ? `<a class="match-contact-button" href="${escapeAttribute(whatsAppUrl)}" target="_blank" rel="noopener noreferrer">Contact Host on WhatsApp</a>`
            : ""
        }
      `;

      container.appendChild(card);
    });
  };

  loadVenueDetailsForCards();
})();
