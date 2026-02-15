'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Theme = 'light' | 'dark';

const THEME_KEY = 'strotas-theme';

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
}

interface ThemeToggleProps {
  className?: string;
  fixedPosition?: boolean;
}

export function ThemeToggle({ className, fixedPosition = true }: ThemeToggleProps) {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const persistedTheme = localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
    setTheme(persistedTheme);
    applyTheme(persistedTheme);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    applyTheme(theme);
  }, [mounted, theme]);

  const handleToggle = () => {
    const nextTheme: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem(THEME_KEY, nextTheme);
  };

  const isDark = theme === 'dark';

  if (!mounted) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleToggle}
      className={`
        border-primary/40 bg-background/85 backdrop-blur font-display text-xs uppercase tracking-wider text-primary hover:bg-primary/10
        ${fixedPosition ? 'fixed bottom-4 right-4 z-[70]' : ''}
        ${className || ''}
      `}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {isDark ? 'Light' : 'Dark'}
    </Button>
  );
}
