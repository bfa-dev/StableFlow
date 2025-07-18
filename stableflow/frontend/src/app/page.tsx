'use client';

import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { RootState, AppDispatch } from '@/lib/store';
import { getWalletAsync, getTransactionHistoryAsync } from '@/lib/slices/walletSlice';
import { addNotification } from '@/lib/slices/uiSlice';

// Components
import DashboardLayout from '@/components/layout/DashboardLayout';
import BalanceCard from '@/components/wallet/BalanceCard';
import QuickActions from '@/components/wallet/QuickActions';
import RecentTransactions from '@/components/wallet/RecentTransactions';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function Dashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();

  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const { wallet, transactions, isLoading, balanceLoading } = useSelector((state: RootState) => state.wallet);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    // Load wallet and transaction data
    if (user) {
      dispatch(getWalletAsync());
      dispatch(getTransactionHistoryAsync({ page: 1, limit: 10 }));
    }
  }, [dispatch, isAuthenticated, user, router]);

  useEffect(() => {
    // Welcome notification for new users
    if (user && wallet) {
      dispatch(addNotification({
        type: 'success',
        title: 'Welcome to StableFlow!',
        message: `Hello ${user.email}! Your wallet is ready for transactions.`,
        duration: 5000,
      }));
    }
  }, [dispatch, user, wallet]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Welcome back, {user?.email}
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <QuickActions />
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Balance Card - Takes 2 columns on large screens */}
          <div className="lg:col-span-2">
            <BalanceCard
              wallet={wallet}
              loading={balanceLoading}
            />
          </div>

          {/* Quick Stats */}
          <div className="space-y-4">
            {/* Transaction Count */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Transactions
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {transactions.length}
                  </p>
                </div>
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* User Role */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Account Type
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {user?.role}
                  </p>
                </div>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${user?.role === 'SUPER_ADMIN'
                    ? 'bg-purple-100 dark:bg-purple-900/30'
                    : user?.role === 'ADMIN'
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                  <svg className={`w-4 h-4 ${user?.role === 'SUPER_ADMIN'
                      ? 'text-purple-600 dark:text-purple-400'
                      : user?.role === 'ADMIN'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Transactions
            </h2>
          </div>
          <RecentTransactions
            transactions={transactions.slice(0, 5)}
            loading={isLoading}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
