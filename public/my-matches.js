function escapeHTML(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
  
    }
  
    return true;
  
  }

async function loadMyMatches() {

    const container =
      document.getElementById("myMatchesContainer");
  
    try {
  
      const response =
        await fetch("/api/my-matches");
  
      const matches =
        await response.json();
  
      container.innerHTML = "";
  
      if (matches.length === 0) {
  
        container.innerHTML =
          "<p>No matches hosted yet.</p>";
  
        return;
  
      }
  
      matches.forEach(match => {
  
        const card =
          document.createElement("div");
  
        card.className = "match-card";
  
        card.innerHTML = `
          <h3>${escapeHTML(match.venue_name)}</h3>
  
          <p>
            ${new Date(match.match_date).toLocaleDateString()}
          </p>
  
          <p>
            ${match.start_time.slice(0,5)}
            -
            ${match.end_time.slice(0,5)}
          </p>
  
          <p>
            Status:
            ${match.is_full ? "FULL" : "OPEN"}
          </p>
  
          ${
            !match.is_full
            ? `
            <button
              onclick="markFull(${match.id})"
            >
              Mark Full
            </button>
            `
            : `
            <button
              onclick="reopenMatch(${match.id})"
            >
              Reopen Match
            </button>
            `
          }
          
          <button
            onclick="deleteMatch(${match.id})"
          >
            Delete Match
          </button>
        `;
  
        container.appendChild(card);
  
      });
  
    } catch (err) {
  
      console.error(err);
  
      container.innerHTML =
        "Failed to load matches";
  
    }
  
  }
  
  async function markFull(matchId) {
  
    try {
  
      await fetch(
        `/api/matches/${matchId}/full`,
        {
          method: "POST"
        }
      );
  
      loadMyMatches();
  
    } catch (err) {
  
      console.error(err);
  
    }
  
  }

  async function reopenMatch(matchId) {

    try {
  
      await fetch(
        `/api/matches/${matchId}/reopen`,
        {
          method: "POST"
        }
      );
  
      loadMyMatches();
  
    } catch (err) {
  
      console.error(err);
  
    }
  
  }

  async function deleteMatch(matchId) {

    const confirmed =
      confirm(
        "Delete this match?"
      );
  
    if (!confirmed) return;
  
    try {
  
      const response =
        await fetch(
          `/api/matches/${matchId}`,
          {
            method: "DELETE"
          }
        );
  
      const result =
        await response.json();
  
  
      loadMyMatches();
  
    } catch (err) {
  
      console.error(err);
  
    }
  
  }
  
  (async () => {

    const loggedIn =
      await requireLogin();
  
    if (!loggedIn) return;
  
    loadMyMatches();
  
  })();