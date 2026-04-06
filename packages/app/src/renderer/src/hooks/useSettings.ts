import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark';
export type FontSize = 'small' | 'medium' | 'large';
export type ContentWidth = 'narrow' | 'medium' | 'wide';

export interface ReaderSettings {
  theme: Theme;
  fontSize: FontSize;
  contentWidth: ContentWidth;
}

const STORAGE_KEY = 'english-studio-settings';

const DEFAULT_SETTINGS: ReaderSettings = {
  theme: 'light',
  fontSize: 'medium',
  contentWidth: 'medium'
};

function loadSettings(): ReaderSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<ReaderSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: ReaderSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function useSettings(): {
  settings: ReaderSettings;
  updateSettings: (patch: Partial<ReaderSettings>) => void;
  toggleTheme: () => void;
  cycleFontSize: () => void;
  cycleContentWidth: () => void;
} {
  const [settings, setSettings] = useState<ReaderSettings>(loadSettings);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  const updateSettings = useCallback((patch: Partial<ReaderSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    updateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' });
  }, [settings.theme, updateSettings]);

  const cycleFontSize = useCallback(() => {
    const order: FontSize[] = ['small', 'medium', 'large'];
    const idx = order.indexOf(settings.fontSize);
    updateSettings({ fontSize: order[(idx + 1) % order.length] });
  }, [settings.fontSize, updateSettings]);

  const cycleContentWidth = useCallback(() => {
    const order: ContentWidth[] = ['narrow', 'medium', 'wide'];
    const idx = order.indexOf(settings.contentWidth);
    updateSettings({ contentWidth: order[(idx + 1) % order.length] });
  }, [settings.contentWidth, updateSettings]);

  return { settings, updateSettings, toggleTheme, cycleFontSize, cycleContentWidth };
}
