import { writable } from 'svelte/store';

export type ThemeName = 'superhome' | 'nord';

const THEME_KEY = 'superhome-theme';

function applyTheme(value: ThemeName): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = value;
}

function readInitialTheme(): ThemeName {
  if (typeof window === 'undefined') return 'superhome';

  try {
    const saved = window.localStorage.getItem(THEME_KEY) as ThemeName | null;
    if (saved === 'superhome' || saved === 'nord') {
      return saved;
    }
  } catch {
    // ignore storage errors and fall through to prefers-color-scheme
  }

  try {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'nord';
    }
  } catch {
    // ignore matchMedia errors
  }

  return 'superhome';
}

function createThemeStore() {
  const { subscribe, set, update } = writable<ThemeName>('superhome');

  const init = (): void => {
    const initial = readInitialTheme();
    set(initial);
    applyTheme(initial);
  };

  const setTheme = (value: ThemeName): void => {
    set(value);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(THEME_KEY, value);
      } catch {
        // ignore storage errors
      }
    }
    applyTheme(value);
  };

  const toggle = (): void => {
    update((current) => {
      const next: ThemeName = current === 'superhome' ? 'nord' : 'superhome';
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(THEME_KEY, next);
        } catch {
          // ignore storage errors
        }
      }
      applyTheme(next);
      return next;
    });
  };

  return { subscribe, init, setTheme, toggle };
}

export const themeStore = createThemeStore();
