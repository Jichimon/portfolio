// The two valid theme values. Anything else — including whatever localStorage happens to
// hold — is treated as absent rather than applied.
const LIGHT = 'light';
const DARK = 'dark';
const VALID_THEMES = [LIGHT, DARK];

export const DEFAULT_THEME_STORAGE_KEY = 'theme';

export function isValidTheme(value) {
  return VALID_THEMES.includes(value);
}

// What should be shown: a valid stored value wins outright; anything else — missing, or
// junk that isn't one of the two theme values — falls back to what the system prefers.
export function resolveTheme(storedTheme, systemPrefersDark) {
  if (isValidTheme(storedTheme)) {
    return storedTheme;
  }
  return systemPrefersDark ? DARK : LIGHT;
}

// Storage access that cannot throw outward. A private window, blocked site data, or a
// browser that refuses storage entirely all raise on access rather than returning null,
// and a page whose resolution throws is a page that renders wrong.
export function readStoredTheme(storage, storageKey = DEFAULT_THEME_STORAGE_KEY) {
  try {
    return storage.getItem(storageKey);
  } catch {
    return null;
  }
}

export function writeStoredTheme(storage, theme, storageKey = DEFAULT_THEME_STORAGE_KEY) {
  try {
    storage.setItem(storageKey, theme);
    return true;
  } catch {
    return false;
  }
}

// The one call a caller needs at load time: read what's stored (or fail closed to
// nothing), then resolve it against the system preference.
export function resolveInitialTheme({ storage, systemPrefersDark, storageKey = DEFAULT_THEME_STORAGE_KEY }) {
  return resolveTheme(readStoredTheme(storage, storageKey), systemPrefersDark);
}

// The thin applier. Whatever holds the theme decides how it renders; this only sets the
// attribute the stylesheet already keys its whole palette off of.
export function applyTheme(rootElement, theme) {
  rootElement.setAttribute('data-theme', theme);
}

// The theme a toggle click would land on, given the one currently applied. A caller uses
// this twice: once beforehand, to name the destination on the label — a switch that names
// where it is leaves the reader guessing what it does — and once on click, to know what to
// apply and store.
export function themeToggleDestination(currentTheme) {
  return currentTheme === DARK ? LIGHT : DARK;
}
