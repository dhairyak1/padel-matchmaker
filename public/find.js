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

    const [startHour, startMinute] =
      startTime.split(":").map(Number);
  
    const [endHour, endMinute] =
      endTime.split(":").map(Number);
  
    let start =
      startHour * 60 + startMinute;
  
    let end =
      endHour * 60 + endMinute;
  
    if (end < start) {
      end += 24 * 60;
    }
  
    const duration =
      end - start;
  
    if (duration % 60 === 0) {
      return `${duration / 60} hr`;
    }
  
    return `${duration} mins`;
  
  }

  async function requireLogin() {

    const response =
      await fetch("/api/me");
  
    if (!response.ok) {
  
        document.getElementById(
            "loginModal"
          ).style.display = "flex";
          
          document.getElementById(
            "loginModalButton"
          ).onclick = () => {
          
            window.location.href =
              "/auth/google";
          
          };
          
          return false;
  
      return false;
  
    }
  
    return true;
  
  }

async function loadMatches() {

    const container =
      document.getElementById("matchesContainer");
  
    try {
  
        const url =
        userLat && userLng
          ? `/api/matches?lat=${userLat}&lng=${userLng}`
          : "/api/matches";
      
      const response =
        await fetch(url);
  
      const matches =
        await response.json();
  
        container.innerHTML = "";
        document.getElementById("emptyState").style.display = "none";

        if (matches.length === 0) {
            document.getElementById("emptyState").style.display = "block";
            return;
          }
  
      matches.forEach(match => {
  
        const card =
          document.createElement("div");
  
        card.className = "match-card";

        const duration =
  getDuration(
    match.start_time,
    match.end_time
  );
  
        card.innerHTML = `
        <h3>${escapeHTML(match.venue_name || "Unknown Venue")}
        </h3>

        <p>📍 ${escapeHTML(match.address || "")}
        </p>

${
  match.distance
  ? `<p>🚗 ${Number(match.distance).toFixed(1)} km away</p>`
  : ""
}
      
        <p>Date: ${new Date(match.match_date).toLocaleDateString()}</p>
      
        <p>Time: ${match.start_time.slice(0,5)} - ${match.end_time.slice(0,5)}</p>

        <p>
  Duration: ${duration}
</p>
      
        <p>Skill: ${escapeHTML(match.skill_level)}
        </p>
      
        <p>Players Needed: ${escapeHTML(match.players_needed)}
        </p>

        <p>Notes: ${escapeHTML(match.notes || "None")}</p>

        ${match.is_full
            ? "<p><strong>MATCH FULL</strong></p>"
            : ""
          }

          ${!match.is_full
            ? `
            <a
              href="https://wa.me/${match.host_phone.replace("+", "")}?text=${encodeURIComponent(
                `Hi ${escapeHTML(match.host_name)}, I saw your match on Padel Matchmaker and would like to join if a spot is available.`
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
  
    } catch (err) {
      console.error(err);
      container.innerHTML =
        "Failed to load matches";
    }
  
  }
  
  (async () => {

    const loggedIn =
      await requireLogin();
  
    if (!loggedIn) return;
  
    navigator.geolocation.getCurrentPosition(
  
      async (position) => {
  
        userLat = position.coords.latitude;
        userLng = position.coords.longitude;
  
  
        await loadMatches();
  
      },
  
      async () => {
  
        await loadMatches();
  
      }
  
    );
  
  })();