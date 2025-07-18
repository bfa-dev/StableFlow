'use client';

import { motion } from 'framer-motion';
import { EyeIcon, EyeSlashIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Wallet } from '@/lib/slices/walletSlice';

interface BalanceCardProps {
  wallet: Wallet | null;
  loading: boolean;
}

export default function BalanceCard({ wallet, loading }: BalanceCardProps) {
  const [showBalance, setShowBalance] = useState(true);

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    }).format(num);
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-lg p-6 text-white shadow-lg"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <CurrencyDollarIcon className="w-6 h-6" />
          <h3 className="text-lg font-semibold">My Wallet</h3>
        </div>
        <button
          onClick={() => setShowBalance(!showBalance)}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          {showBalance ? (
            <EyeSlashIcon className="w-5 h-5" />
          ) : (
            <EyeIcon className="w-5 h-5" />
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" className="text-white" />
        </div>
      ) : wallet ? (
        <div className="space-y-4">
          {/* Balance */}
          <div>
            <p className="text-blue-100 text-sm font-medium mb-1">Available Balance</p>
            <div className="flex items-baseline space-x-2">
              {showBalance ? (
                <motion.span
                  key="balance-visible"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-3xl font-bold"
                >
                  {formatBalance(wallet.balance)}
                </motion.span>
              ) : (
                <motion.span
                  key="balance-hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-3xl font-bold"
                >
                  ••••••••
                </motion.span>
              )}
              <span className="text-blue-200 text-lg font-medium">
                {wallet.currency || 'USDT'}
              </span>
            </div>
          </div>

          {/* Frozen Balance */}
          {parseFloat(wallet.frozenBalance) > 0 && (
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">Frozen Balance</p>
              <span className="text-xl font-semibold text-yellow-200">
                {showBalance ? formatBalance(wallet.frozenBalance) : '••••••••'}
              </span>
            </div>
          )}

          {/* Wallet Info */}
          <div className="pt-4 border-t border-blue-400/30">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-blue-100 text-xs font-medium mb-1">Wallet Address</p>
                <p className="text-sm font-mono">{formatAddress(wallet.address)}</p>
              </div>
              <div>
                <p className="text-blue-100 text-xs font-medium mb-1">Status</p>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${wallet.status === 'ACTIVE'
                    ? 'bg-green-100 text-green-800'
                    : wallet.status === 'FROZEN'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                  {wallet.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-blue-100">No wallet data available</p>
          <p className="text-sm text-blue-200 mt-1">Please contact support if this persists</p>
        </div>
      )}
    </motion.div>
  );
} 