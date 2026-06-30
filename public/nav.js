const logoSrc = "/logo.png";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Find Match", href: "/find.html" },
  { label: "Host Match", href: "/host.html" },
  { label: "Request Marker", href: "/marker.html" },
  { label: "My Matches", href: "/my-matches.html" },
  { label: "Profile", href: "/profile.html" },
];

function renderNavbar() {
  const currentPath = window.location.pathname;
  const nav = document.getElementById("siteNavbar");

  if (!nav) return;

  nav.innerHTML = `
    <div class="nav-top">
      <a href="/" class="nav-brand" aria-label="PadelPaglu Home">
        <img
          src="${logoSrc}"
          alt="PadelPaglu Logo"
          class="nav-logo"
          style="width: 58px; height: 58px; object-fit: contain; display: block; filter: drop-shadow(0 0 12px rgba(217, 255, 63, 0.28));"
        >

        <span
          class="nav-brand-text"
          style="font-family: Inter, system-ui, sans-serif; font-size: 24px; font-weight: 900; letter-spacing: -0.06em; line-height: 1;"
        >
          <span style="color: #ffffff;">Padel</span><span style="color: var(--accent);">Paglu</span>
        </span>
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

      <button type="button" class="pwa-install-button" data-install-app hidden>
        Install App
      </button>
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
