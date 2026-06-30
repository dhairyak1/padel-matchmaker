function closeFavoriteVenueModalAfterSave() {
  const modal = document.getElementById("favoriteVenuesModal");
  const saveButton = document.getElementById("saveFavoriteVenuesButton");

  if (!modal || !saveButton) return;
  if (saveButton.dataset.extraCloseListener === "true") return;

  saveButton.dataset.extraCloseListener = "true";

  saveButton.addEventListener("click", () => {
    const closeWhenSaved = setInterval(() => {
      if (saveButton.textContent.includes("Saved")) {
        modal.style.display = "none";
        clearInterval(closeWhenSaved);
      }

      if (saveButton.textContent.includes("Could not save")) {
        clearInterval(closeWhenSaved);
      }
    }, 100);

    setTimeout(() => clearInterval(closeWhenSaved), 5000);
  });
}

function focusNotificationMatchCard() {
  const params = new URLSearchParams(window.location.search);
  const matchId = params.get("match");
  const venueId = params.get("venueId");
  const venueName = params.get("venue");

  if (!matchId && !venueId && !venueName) return;

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;

    const cards = Array.from(document.querySelectorAll(".match-card"));
    let targetCard = null;

    if (matchId) {
      targetCard = cards.find((card) => card.dataset.matchId === String(matchId));
    }

    if (!targetCard && venueId) {
      targetCard = cards.find((card) => card.dataset.venueId === String(venueId));
    }

    if (!targetCard && venueName) {
      const wantedVenue = String(venueName).toLowerCase().trim();
      targetCard = cards.find((card) => {
        const cardVenue = String(card.dataset.venueName || card.querySelector("h3")?.textContent || "")
          .toLowerCase()
          .trim();

        return cardVenue.includes(wantedVenue) || wantedVenue.includes(cardVenue);
      });
    }

    if (targetCard) {
      clearInterval(timer);
      targetCard.scrollIntoView({ behavior: "smooth", block: "center" });
      targetCard.classList.add("notification-highlight-match");

      setTimeout(() => {
        targetCard.classList.remove("notification-highlight-match");
      }, 4500);
    }

    if (attempts >= 40) {
      clearInterval(timer);
    }
  }, 250);
}

function initFavoriteVenueFixes() {
  closeFavoriteVenueModalAfterSave();
  focusNotificationMatchCard();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initFavoriteVenueFixes);
} else {
  initFavoriteVenueFixes();
}