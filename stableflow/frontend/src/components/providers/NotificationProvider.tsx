'use client';

import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/lib/store';
import { removeNotification } from '@/lib/slices/uiSlice';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const iconMap = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon,
};

const colorMap = {
  success: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200',
  error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200',
  info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200',
};

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const notifications = useSelector((state: RootState) => state.ui.notifications);
  const dispatch = useDispatch();

  useEffect(() => {
    notifications.forEach((notification) => {
      if (notification.duration && notification.duration > 0) {
        const timer = setTimeout(() => {
          dispatch(removeNotification(notification.id));
        }, notification.duration);

        return () => clearTimeout(timer);
      }
    });
  }, [notifications, dispatch]);

  return (
    <>
      {children}

      {/* Notification Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md w-full pointer-events-none">
        <AnimatePresence>
          {notifications.map((notification) => {
            const Icon = iconMap[notification.type];

            return (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: 300, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 300, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={`
                  pointer-events-auto rounded-lg border p-4 shadow-lg backdrop-blur-sm
                  ${colorMap[notification.type]}
                `}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium">
                      {notification.title}
                    </h3>
                    <p className="mt-1 text-sm opacity-90">
                      {notification.message}
                    </p>
                  </div>
                  <div className="ml-4 flex flex-shrink-0">
                    <button
                      className="inline-flex rounded-md p-1.5 hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2"
                      onClick={() => dispatch(removeNotification(notification.id))}
                    >
                      <span className="sr-only">Dismiss</span>
                      <XMarkIcon className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </>
  );
} 