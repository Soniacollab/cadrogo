const themeBootScript = `
(function () {
  try {
    var key = "cadrogo-theme";
    var stored = localStorage.getItem(key);
    var theme = stored === "dark" ? "dark" : "light";
    var root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    root.setAttribute("data-theme", theme);
    root.style.colorScheme = theme;
  } catch (e) {
    document.documentElement.classList.add("light");
  }
})();
`;

export { themeBootScript };
