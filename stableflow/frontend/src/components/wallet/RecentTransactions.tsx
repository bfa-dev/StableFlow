'use client';

import { motion } from 'framer-motion';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowRightLeftIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Transaction } from '@/lib/slices/walletSlice';

interface RecentTransactionsProps {
  transactions: Transaction[];
  loading: boolean;
}

export default function RecentTransactions({ transactions, loading }: RecentTransactionsProps) {
  const getTransactionIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'MINT':
        return ArrowDownIcon;
      case 'BURN':
        return ArrowUpIcon;
      case 'TRANSFER':
        return ArrowRightLeftIcon;
      default:
        return ArrowRightLeftIcon;
    }
  };

  const getStatusIcon = (status: Transaction['status']) => {
    switch (status) {
      case 'COMPLETED':
        return CheckCircleIcon;
      case 'FAILED':
        return XCircleIcon;
      case 'PENDING':
        return ClockIcon;
      default:
        return ClockIcon;
    }
  };

  const getStatusColor = (status: Transaction['status']) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-green-600 dark:text-green-400';
      case 'FAILED':
        return 'text-red-600 dark:text-red-400';
      case 'PENDING':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getTypeColor = (type: Transaction['type']) => {
    switch (type) {
      case 'MINT':
        return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
      case 'BURN':
        return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
      case 'TRANSFER':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <ArrowRightLeftIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No transactions yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Your transaction history will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {transactions.map((transaction, index) => {
          const TransactionIcon = getTransactionIcon(transaction.type);
          const StatusIcon = getStatusIcon(transaction.status);

          return (
            <motion.div
              key={transaction.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Transaction Type Icon */}
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    ${getTypeColor(transaction.type)}
                  `}>
                    <TransactionIcon className="w-5 h-5" />
                  </div>

                  {/* Transaction Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {transaction.type}
                      </p>
                      <StatusIcon className={`w-4 h-4 ${getStatusColor(transaction.status)}`} />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(transaction.createdAt)}
                    </p>
                    {transaction.fee && parseFloat(transaction.fee) > 0 && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Fee: {formatAmount(transaction.fee)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right">
                  <p className={`text-sm font-semibold ${transaction.type === 'MINT'
                      ? 'text-green-600 dark:text-green-400'
                      : transaction.type === 'BURN'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-900 dark:text-white'
                    }`}>
                    {transaction.type === 'MINT' ? '+' : transaction.type === 'BURN' ? '-' : ''}
                    {formatAmount(transaction.amount)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {transaction.status.toLowerCase()}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* View All Link */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/30">
        <button className="w-full text-center text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
          View all transactions
        </button>
      </div>
    </div>
  );
} 