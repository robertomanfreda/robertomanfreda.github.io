import "../styles/base.css";
import "../styles/prose.css";
import "./core";

// 404: say which path was not there.
document.querySelectorAll<HTMLElement>("[data-missing-path]").forEach((element) => {
  element.textContent = decodeURIComponent(location.pathname).slice(0, 120);
});
