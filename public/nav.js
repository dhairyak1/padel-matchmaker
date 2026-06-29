const navItems = [
  { label: "Home", href: "/" },
  { label: "Find", href: "/find.html" },
  { label: "Host", href: "/host.html" },
  { label: "Marker", href: "/marker.html" },
  { label: "My Matches", href: "/my-matches.html" },
  { label: "Profile", href: "/profile.html" },
];

function renderNavbar() {
  const currentPath = window.location.pathname;
  const nav = document.getElementById("siteNavbar");

  if (!nav) return;

  nav.innerHTML = `
    <div class="nav-top">
      <a href="/" class="nav-brand">
        <span class="nav-brand-icon">🎾</span>
        <span class="nav-brand-text">PadelPaglu</span>
      </a>

      <button
        type="button"
        class="nav-toggle"
        id="navToggle"
        aria-label="Open menu"
        aria-expanded="false"
      >
        ☰
      </button>
    </div>

    <div class="nav-links" id="navLinks">
      ${navItems
        .map((item) => {
          const isActive =
            currentPath === item.href ||
            (item.href !== "/" && currentPath.includes(item.href));

          return `
            <a href="${item.href}" class="${isActive ? "active" : ""}">
              ${item.label}
            </a>
          `;
        })
        .join("")}
    </div>
  `;

  const toggle = document.getElementById("navToggle");
  const links = document.getElementById("navLinks");

  toggle.addEventListener("click", () => {
    const isOpen = links.classList.toggle("show");

    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.textContent = isOpen ? "✕" : "☰";
  });
}

renderNavbar();
