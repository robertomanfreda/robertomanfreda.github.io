const header = document.querySelector(".site-header");
const year = document.querySelector("#year");
const followersSignal = document.querySelector("#signal-followers");

if (year) {
  year.textContent = String(new Date().getFullYear());
}

const syncHeader = () => {
  if (!header) return;
  header.classList.toggle("is-scrolled", document.body.classList.contains("project-page") || window.scrollY > 24);
};

syncHeader();
window.addEventListener("scroll", syncHeader, { passive: true });

window.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) {
    window.lucide.createIcons();
  }
});

fetch("https://api.github.com/users/robertomanfreda", {
  headers: { Accept: "application/vnd.github+json" },
})
  .then((response) => (response.ok ? response.json() : null))
  .then((profile) => {
    if (!profile) return;
    if (followersSignal && Number.isFinite(profile.followers)) {
      const label = profile.followers === 1 ? "GitHub follower" : "GitHub followers";
      followersSignal.textContent = `${profile.followers} ${label}`;
    }
  })
  .catch(() => {});
