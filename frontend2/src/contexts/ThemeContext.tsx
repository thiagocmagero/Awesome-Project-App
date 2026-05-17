import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark';
export type Chrome = 'default' | 'super-light';

interface ThemeState {
  theme: Theme;
  chrome: Chrome;
  setTheme: (t: Theme) => void;
  setChrome: (c: Chrome) => void;
  toggleTheme: () => void;
  toggleSuperLight: () => void;
}

const ThemeContext = createContext<ThemeState | null>(null);

function readTheme(): Theme {
  try {
    const v = localStorage.getItem('awp-theme');
    return v === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function readChrome(): Chrome {
  try {
    return localStorage.getItem('awp-chrome') === 'super-light' ? 'super-light' : 'default';
  } catch {
    return 'default';
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readTheme);
  const [chrome, setChromeState] = useState<Chrome>(readChrome);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const setChrome = useCallback((c: Chrome) => setChromeState(c), []);
  const toggleTheme = useCallback(() => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')), []);
  const toggleSuperLight = useCallback(
    () => setChromeState((c) => (c === 'super-light' ? 'default' : 'super-light')),
    [],
  );

  // Persist + apply data-theme.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('awp-theme', theme); } catch {}
  }, [theme]);

  // Persist + apply data-chrome (only meaningful when theme=light).
  useEffect(() => {
    if (theme === 'light' && chrome === 'super-light') {
      document.documentElement.setAttribute('data-chrome', 'super-light');
    } else {
      document.documentElement.removeAttribute('data-chrome');
    }
    try { localStorage.setItem('awp-chrome', chrome); } catch {}
  }, [theme, chrome]);

  // Switching to dark drops super-light (regra de app-dark.jsx:1934-1935).
  useEffect(() => {
    if (theme === 'dark' && chrome === 'super-light') setChromeState('default');
  }, [theme, chrome]);

  return (
    <ThemeContext.Provider value={{ theme, chrome, setTheme, setChrome, toggleTheme, toggleSuperLight }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
