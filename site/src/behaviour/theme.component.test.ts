import { describe, it, expect } from 'vitest';
import {
  resolveTheme,
  readStoredTheme,
  writeStoredTheme,
  resolveInitialTheme,
  applyTheme,
  themeToggleDestination,
  DEFAULT_THEME_STORAGE_KEY,
} from './theme.mjs';

function throwingStorage(errorMessage: string) {
  return {
    getItem() {
      throw new Error(errorMessage);
    },
    setItem() {
      throw new Error(errorMessage);
    },
  };
}

function memoryStorage(initial: Record<string, string> = {}) {
  const values: Record<string, string> = { ...initial };
  return {
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null;
    },
    setItem(key: string, value: string) {
      values[key] = value;
    },
    read: () => values,
  };
}

describe('resolve', () => {
  it('a valid stored value wins regardless of system preference', () => {
    expect(resolveTheme('dark', false)).toBe('dark');
    expect(resolveTheme('light', true)).toBe('light');
  });

  it('no stored value: the system preference decides', () => {
    expect(resolveTheme(null, true)).toBe('dark');
    expect(resolveTheme(null, false)).toBe('light');
  });

  it('a junk stored value is ignored, not applied — the system preference decides', () => {
    expect(resolveTheme('solarized', true)).toBe('dark');
    expect(resolveTheme('solarized', false)).toBe('light');
  });

  it('storage that throws on read is treated as nothing stored, falling back to the system preference', () => {
    const storage = throwingStorage('blocked site data');
    const theme = resolveInitialTheme({ storage, systemPrefersDark: true });
    expect(theme).toBe('dark');
  });

  it('resolveInitialTheme reads what is actually stored when storage does not throw', () => {
    const storage = memoryStorage({ [DEFAULT_THEME_STORAGE_KEY]: 'dark' });
    const theme = resolveInitialTheme({ storage, systemPrefersDark: false });
    expect(theme).toBe('dark');
  });

  it('applies the resolved theme to the given root element as data-theme', () => {
    const root = document.createElement('html');
    applyTheme(root, 'dark');
    expect(root.getAttribute('data-theme')).toBe('dark');
    applyTheme(root, 'light');
    expect(root.getAttribute('data-theme')).toBe('light');
  });
});

describe('persist', () => {
  it('a write that throws does not escape the caller', () => {
    const storage = throwingStorage('storage refused');
    expect(() => writeStoredTheme(storage, 'dark')).not.toThrow();
  });

  it('a successful write is later read back through readStoredTheme', () => {
    const storage = memoryStorage();
    writeStoredTheme(storage, 'dark');
    expect(readStoredTheme(storage)).toBe('dark');
  });

  it('names the destination, not the current state: showing dark while light, light while dark', () => {
    expect(themeToggleDestination('light')).toBe('dark');
    expect(themeToggleDestination('dark')).toBe('light');
  });
});
