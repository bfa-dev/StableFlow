'use client';

import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store } from '@/lib/store';
import { ThemeProvider } from './ThemeProvider';
import { NotificationProvider } from './NotificationProvider';
import { AuthProvider } from './AuthProvider';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: (failureCount, error: any) => {
              // Don't retry on 4xx errors
              if (error?.status >= 400 && error?.status < 500) {
                return false;
              }
              return failureCount < 3;
            },
          },
          mutations: {
            retry: false,
          },
        },
      })
  );

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <NotificationProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </NotificationProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>
  );
} 