const logoSrc = "data:image/webp;base64,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";

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
      <a href="/" class="nav-brand" aria-label="PadelPaglu Home">
        <img
          src="${logoSrc}"
          alt=""
          class="nav-logo"
          style="width: 46px; height: 46px; object-fit: contain; display: block;"
        >
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
