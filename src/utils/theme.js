import { useState, useEffect } from 'react';

const STORAGE_KEY = 'nepl_theme';

export function getInitialTheme() {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch (e) {
    console.warn('Failed to access localStorage for theme', e);
  }
  return 'dark';
}

export function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const body = document.body;
  
  if (theme === 'light') {
    root.classList.remove('dark');
    root.classList.add('light');
    body.classList.remove('dark');
    body.classList.add('light');
    root.style.colorScheme = 'light';
  } else {
    root.classList.remove('light');
    root.classList.add('dark');
    body.classList.remove('light');
    body.classList.add('dark');
    root.style.colorScheme = 'dark';
  }

  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch (e) {
    console.warn('Failed to save theme to localStorage', e);
  }

  window.dispatchEvent(new CustomEvent('nepl_theme_change', { detail: { theme } }));
}

export function useTheme() {
  const [theme, setThemeState] = useState(() => getInitialTheme());

  useEffect(() => {
    applyTheme(theme);

    const handleThemeChange = (e) => {
      if (e.detail?.theme && e.detail.theme !== theme) {
        setThemeState(e.detail.theme);
      }
    };

    window.addEventListener('nepl_theme_change', handleThemeChange);
    return () => window.removeEventListener('nepl_theme_change', handleThemeChange);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setThemeState(nextTheme);
    applyTheme(nextTheme);
  };

  const setTheme = (newTheme) => {
    if (newTheme === 'dark' || newTheme === 'light') {
      setThemeState(newTheme);
      applyTheme(newTheme);
    }
  };

  return {
    theme,
    toggleTheme,
    setTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
  };
}
