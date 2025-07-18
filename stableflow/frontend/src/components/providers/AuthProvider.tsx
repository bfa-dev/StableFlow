'use client';

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import { getCurrentUserAsync, refreshTokenAsync } from '@/lib/slices/authSlice';
import { AppDispatch } from '@/lib/store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();
  const { token, isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // If we have a token but no user data, fetch current user
    if (token && isAuthenticated && !user) {
      dispatch(getCurrentUserAsync());
    }
  }, [dispatch, token, isAuthenticated, user]);

  useEffect(() => {
    // Set up automatic token refresh
    if (isAuthenticated && token) {
      // Refresh token every 50 minutes (tokens expire in 1 hour)
      const refreshInterval = setInterval(() => {
        dispatch(refreshTokenAsync());
      }, 50 * 60 * 1000);

      return () => clearInterval(refreshInterval);
    }
  }, [dispatch, isAuthenticated, token]);

  return <>{children}</>;
} 