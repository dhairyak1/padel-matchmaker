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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", closeFavoriteVenueModalAfterSave);
} else {
  closeFavoriteVenueModalAfterSave();
}