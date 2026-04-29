import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'sepia';
export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';

export const FONT_SCALE_MAP: Record<FontSize, number> = {
  small: 0.8,
  medium: 1.0,
  large: 1.2,
  xlarge: 1.5,
};

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light');
  const [fontSize, setFontSize] = useState<FontSize>('medium');

  useEffect(() => {
    const savedTheme = localStorage.getItem('readeasy:theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }

    const savedFontSize = localStorage.getItem('readeasy:fontsize') as FontSize;
    if (savedFontSize) {
      setFontSize(savedFontSize);
    }
  }, []);

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