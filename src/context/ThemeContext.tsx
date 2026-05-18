import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type ThemeMode = 'dark' | 'light';

interface ThemeContextValue {
    theme: ThemeMode;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const getInitialTheme = (): ThemeMode => {
    if (typeof window === 'undefined') return 'dark';
    const saved = window.localStorage.getItem('makina-ime-theme');
    return saved === 'light' ? 'light' : 'dark';
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

    useEffect(() => {
        document.documentElement.classList.toggle('theme-light', theme === 'light');
        window.localStorage.setItem('makina-ime-theme', theme);
    }, [theme]);

    const value = useMemo(() => ({
        theme,
        toggleTheme: () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
    }), [theme]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const value = useContext(ThemeContext);
    if (!value) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return value;
};
