import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

// theme preference: 'light' | 'dark' | 'system'
const ThemeContext = createContext({ preference: 'dark', theme: 'dark', setPreference: () => {}, toggle: () => {} });

const STORAGE_KEY = 'pm-theme';
const media = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

const readPreference = () => {
    try {
        return localStorage.getItem(STORAGE_KEY) || 'dark';
    } catch {
        return 'dark';
    }
};

// SocketSoft default is dark; 'system' follows the OS.
const resolve = (pref) => (pref === 'system' ? (media?.matches ? 'dark' : 'light') : pref);

export const ThemeProvider = ({ children }) => {
    const [preference, setPreferenceState] = useState(readPreference);
    const [theme, setTheme] = useState(() => resolve(readPreference()));

    useEffect(() => {
        const apply = () => {
            const t = resolve(preference);
            setTheme(t);
            document.documentElement.setAttribute('data-theme', t);
        };
        apply();
        if (preference === 'system' && media) {
            media.addEventListener('change', apply);
            return () => media.removeEventListener('change', apply);
        }
        return undefined;
    }, [preference]);

    const setPreference = useCallback((pref) => {
        setPreferenceState(pref);
        try {
            localStorage.setItem(STORAGE_KEY, pref);
        } catch {
            /* storage unavailable — keep in memory only */
        }
    }, []);

    const toggle = useCallback(() => setPreference(theme === 'dark' ? 'light' : 'dark'), [theme, setPreference]);

    return (
        <ThemeContext.Provider value={{ preference, theme, setPreference, toggle }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
