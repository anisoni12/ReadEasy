import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'sepia';
export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';

export const FONT_SCALE_MAP: Record<FontSize, number> = {
  small: 0.8,
  medium: 1.0,
  large: 1.2,
  xlarge: 1.5,
};

function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'sepia';
  const saved = localStorage.getItem('readeasy:theme') as Theme | null;
  if (saved === 'light' || saved === 'dark' || saved === 'sepia') return saved;
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'sepia'; // Calmer default than 'light' for a reading app
}

function readInitialFontSize(): FontSize {
  if (typeof window === 'undefined') return 'medium';
  const saved = localStorage.getItem('readeasy:fontsize') as FontSize | null;
  if (saved === 'small' || saved === 'medium' || saved === 'large' || saved === 'xlarge') {
    return saved;
  }
  return 'medium';
}

export function useTheme() {
  // Lazy initial state avoids a flash of the wrong theme on mount.
  const [theme, setTheme] = useState<Theme>(readInitialTheme);
  const [fontSize, setFontSize] = useState<FontSize>(readInitialFontSize);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
    root.removeAttribute('data-theme');

    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'sepia') {
      root.setAttribute('data-theme', 'sepia');
    }

    localStorage.setItem('readeasy:theme', theme);
  }, [theme]);

  const cycleTheme = () => {
    setTheme(prev => {
      if (prev === 'light') return 'sepia';
      if (prev === 'sepia') return 'dark';
      return 'light';
    });
  };

  const changeFontSize = (size: FontSize) => {
    setFontSize(size);
    localStorage.setItem('readeasy:fontsize', size);
  };

  return { theme, cycleTheme, fontSize, changeFontSize };
}