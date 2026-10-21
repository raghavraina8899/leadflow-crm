import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const KEY = 'leadflow:theme';
const ThemeContext = createContext(null);
const media = window.matchMedia('(prefers-color-scheme: dark)');

function readPreference() {
  try {
    return localStorage.getItem(KEY) || 'system';
  } catch {
    return 'system';
  }
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(readPreference);
  const [systemDark, setSystemDark] = useState(media.matches);

  useEffect(() => {
    const onChange = (e) => setSystemDark(e.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const resolved = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark');
  }, [resolved]);

  const value = useMemo(() => ({
    preference,
    resolved,
    setPreference: (next) => {
      setPreference(next);
      try {
        localStorage.setItem(KEY, next);
      } catch {}
    },
  }), [preference, resolved]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
