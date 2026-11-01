export type ThemeMode = "light" | "dark" | "contrast";

export const THEME_STORAGE_KEY = "maestro-theme";

// Runs before hydration so the saved theme is applied without a flash of the light theme.
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}"),c=document.documentElement.classList;if(t==="dark")c.add("dark");else if(t==="contrast")c.add("theme-high-contrast")}catch(e){}`;

const listeners = new Set<() => void>();

export function getStoredTheme(): ThemeMode {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === "dark" || value === "contrast" ? value : "light";
  } catch {
    return "light";
  }
}

export function getServerTheme(): ThemeMode {
  return "light";
}

export function subscribeTheme(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  root.classList.remove("dark", "theme-high-contrast");
  if (theme === "dark") root.classList.add("dark");
  if (theme === "contrast") root.classList.add("theme-high-contrast");
}

export function setStoredTheme(theme: ThemeMode) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage can be unavailable (private mode); the theme still applies for this page view.
  }
  applyTheme(theme);
  listeners.forEach((listener) => listener());
}
