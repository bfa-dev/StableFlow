'use client';

import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/lib/store';
import { toggleSidebar, toggleMobileMenu, toggleTheme } from '@/lib/slices/uiSlice';
import { logout } from '@/lib/slices/authSlice';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  CreditCardIcon,
  ArrowRightLeftIcon,
  ChartBarIcon,
  CogIcon,
  UserGroupIcon,
  DocumentTextIcon,
  SunIcon,
  MoonIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon, current: true },
  { name: 'My Wallet', href: '/wallet', icon: CreditCardIcon, current: false },
  { name: 'Transactions', href: '/transactions', icon: ArrowRightLeftIcon, current: false },
  { name: 'Send Money', href: '/send', icon: ArrowRightLeftIcon, current: false },
  { name: 'History', href: '/history', icon: DocumentTextIcon, current: false },
];

const adminNavigation = [
  { name: 'Admin Panel', href: '/admin', icon: ChartBarIcon, current: false },
  { name: 'User Management', href: '/admin/users', icon: UserGroupIcon, current: false },
  { name: 'Reports', href: '/admin/reports', icon: DocumentTextIcon, current: false },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const dispatch = useDispatch();
  const router = useRouter();
  const pathname = usePathname();

  const { sidebarOpen, mobileMenuOpen, theme } = useSelector((state: RootState) => state.ui);
  const { user } = useSelector((state: RootState) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    router.push('/auth/login');
  };

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const allNavigation = isAdmin ? [...navigation, ...adminNavigation] : navigation;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
              onClick={() => dispatch(toggleMobileMenu())}
            />

            {/* Mobile sidebar */}
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-xl lg:hidden"
            >
              <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
                <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  StableFlow
                </h1>
                <button
                  onClick={() => dispatch(toggleMobileMenu())}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 px-4 py-4 space-y-1">
                {allNavigation.map((item) => {
                  const current = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`
                        group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors
                        ${current
                          ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                        }
                      `}
                      onClick={() => dispatch(toggleMobileMenu())}
                    >
                      <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col ${sidebarOpen ? 'lg:translate-x-0' : 'lg:-translate-x-full'
        } transition-transform duration-300 ease-in-out`}>
        <div className="flex grow flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="flex h-16 shrink-0 items-center px-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">
              StableFlow
            </h1>
          </div>
          <nav className="flex flex-1 flex-col px-4 py-4">
            <ul className="space-y-1">
              {allNavigation.map((item) => {
                const current = pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={`
                        group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors
                        ${current
                          ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                        }
                      `}
                    >
                      <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className={`${sidebarOpen ? 'lg:pl-64' : 'lg:pl-0'} transition-all duration-300 ease-in-out`}>
        {/* Header */}
        <div className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <button
                onClick={() => dispatch(toggleSidebar())}
                className="hidden lg:inline-flex p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Bars3Icon className="w-5 h-5" />
              </button>

              <button
                onClick={() => dispatch(toggleMobileMenu())}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Bars3Icon className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center space-x-4">
              {/* Theme Toggle */}
              <button
                onClick={() => dispatch(toggleTheme())}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {theme === 'dark' ? (
                  <SunIcon className="w-5 h-5" />
                ) : (
                  <MoonIcon className="w-5 h-5" />
                )}
              </button>

              {/* User Menu */}
              <div className="flex items-center space-x-3">
                <div className="text-sm text-right">
                  <p className="text-gray-900 dark:text-white font-medium">
                    {user?.email}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">
                    {user?.role}
                  </p>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Logout"
                >
                  <ArrowRightOnRectangleIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 