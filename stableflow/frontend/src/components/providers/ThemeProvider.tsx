'use client';

import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/lib/store';
import { setTheme } from '@/lib/slices/uiSlice';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSelector((state: RootState) => state.ui.theme);
  const dispatch = useDispatch();

  useEffect(() => {
    // Initialize theme from localStorage on client side
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const initialTheme = savedTheme || systemTheme;

    dispatch(setTheme(initialTheme));

    // Apply theme to document
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');
  }, [dispatch]);

  useEffect(() => {
    // Update document class when theme changes
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <div className={`min-h-screen transition-colors duration-200 ${theme === 'dark'
        ? 'bg-gray-900 text-white'
        : 'bg-gray-50 text-gray-900'
      }`}>
      {children}
    </div>
  );
} 