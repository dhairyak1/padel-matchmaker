async function getCsrfToken() {
  const response =
    await fetch("/api/csrf-token");

  const data =
    await response.json();

  return data.csrfToken;
}

let allVenues = [];

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
  

  async function loadVenues() {

    const venueSearch =
      document.getElementById("venueSearch");
  
    const venueResults =
      document.getElementById("venueResults");
  
    const venueId =
      document.getElementById("venueId");
  
    if (!venueSearch) return;
  
    const response =
      await fetch("/api/venues");

      if (!response.ok) {
        return;
      }
  
    allVenues =
      await response.json();

      const allVenuesList =
  document.getElementById("allVenuesList");

const sortedVenues =
  [...allVenues].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

allVenuesList.innerHTML = "";

sortedVenues.forEach((venue) => {

  const item =
    document.createElement("div");

  item.className = "venue-result";

  item.textContent =
    venue.name;

  item.onclick = () => {

    venueSearch.value =
      venue.name;

    venueId.value =
      venue.id;

    venueResults.innerHTML = "";

    document.getElementById(
      "venuesModal"
    ).style.display = "none";

  };

  allVenuesList.appendChild(item);

});
  
    venueSearch.addEventListener(
      "input",
      function () {
  
        const search =
          venueSearch.value
            .toLowerCase()
            .trim();
  
        venueResults.innerHTML = "";
  
        if (search.length < 1) {
          return;
        }
  
        const matches =
          allVenues.filter(venue =>
            venue.name
              .toLowerCase()
              .includes(search)
          );
  
        matches.slice(0, 8).forEach(venue => {
  
          const item =
            document.createElement("div");
  
          item.className =
            "venue-result";
  
          item.textContent =
            venue.name;
  
          item.onclick = () => {
  
            venueSearch.value =
              venue.name;
  
            venueId.value =
              venue.id;
  
            venueResults.innerHTML =
              "";
  
          };
  
          venueResults.appendChild(item);
  
        });
  
      }
    );
  
  }
  
  (async () => {

    const loggedIn =
      await requireLogin();
  
    if (!loggedIn) return;
  
    await loadVenues();
  
  })();
  function loadTimeDropdowns() {

    const startTime =
      document.getElementById("startTime");
  
    if (!startTime) return;
  
    for (let hour = 0; hour < 24; hour++) {
  
      for (let minute = 0; minute < 60; minute += 30) {
  
        const time =
          String(hour).padStart(2, "0")
          + ":" +
          String(minute).padStart(2, "0");
  
        const option =
          document.createElement("option");
  
        option.value = time;
        option.textContent = time;
  
        startTime.appendChild(option);
  
      }
  
    }
  
  }
  
  loadTimeDropdowns();

  const hostForm =
  document.getElementById("hostForm");

if (hostForm) {
    function calculateEndTime(startTime, duration) {

        const [hours, minutes] =
          startTime.split(":").map(Number);
      
        let totalMinutes =
          (hours * 60) +
          minutes +
          Number(duration);
      
        totalMinutes =
          totalMinutes % (24 * 60);
      
        const endHours =
          Math.floor(totalMinutes / 60);
      
        const endMinutes =
          totalMinutes % 60;
      
        return (
          String(endHours).padStart(2, "0")
          + ":" +
          String(endMinutes).padStart(2, "0")
        );
      
      }

      const successButton =
      document.getElementById(
        "successModalButton"
      );
    
    if (successButton) {
    
      successButton.addEventListener(
        "click",
        () => {
    
          window.location =
            "/my-matches.html";
    
        }
      );
    
    }

    

    hostForm.addEventListener(
        "submit",
        async function (e) {

      e.preventDefault();

      const submitButton =
  hostForm.querySelector(
    'button[type="submit"]'
  );

submitButton.disabled = true;

submitButton.textContent =
  "Publishing...";

  

      const formData =
      new FormData(hostForm);
    
    const data =
      Object.fromEntries(
        formData.entries()
      );

      data.end_time =
  calculateEndTime(
    data.start_time,
    data.duration
  );
    
   
   const csrfToken =
  await getCsrfToken();

const response = await fetch(
  "/api/matches",
  {
    method: "POST",

    headers: {
      "Content-Type":
        "application/json",
      "X-CSRF-Token":
        csrfToken
    },

    body:
      JSON.stringify(data)
  }
);
      
      const result =
  await response.json();

if (response.ok) {

  document.getElementById(
    "successModal"
  ).style.display = "flex";

} else {

  submitButton.disabled = false;

  submitButton.textContent =
    "Publish Match";

  document.getElementById(
    "errorModalMessage"
  ).textContent =
    result.error ||
    "Something went wrong. Please try again.";

  document.getElementById(
    "errorModal"
  ).style.display = "flex";

}
    }
  );

}

const showVenuesBtn =
  document.getElementById("showVenuesBtn");

const venuesModal =
  document.getElementById("venuesModal");

const allVenuesList =
  document.getElementById("allVenuesList");

const closeVenuesModal =
  document.getElementById("closeVenuesModal");

if (showVenuesBtn) {

  showVenuesBtn.addEventListener(
    "click",
    () => {
  
      document.getElementById(
        "venuesModal"
      ).style.display = "flex";
  
    }
  );

}

if (closeVenuesModal) {

  closeVenuesModal.addEventListener("click", () => {

    venuesModal.style.display = "none";

  });

}

const errorModalButton =
  document.getElementById("errorModalButton");

if (errorModalButton) {

  errorModalButton.addEventListener(
    "click",
    () => {

      document.getElementById(
        "errorModal"
      ).style.display = "none";

    }
  );

}