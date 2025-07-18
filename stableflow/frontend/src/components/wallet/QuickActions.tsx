'use client';

import Link from 'next/link';
import {
  PaperAirplaneIcon,
  ArrowDownIcon,
  QrCodeIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

export default function QuickActions() {
  const actions = [
    {
      name: 'Send Money',
      href: '/send',
      icon: PaperAirplaneIcon,
      color: 'bg-blue-500 hover:bg-blue-600',
      description: 'Transfer funds to another user',
    },
    {
      name: 'Receive',
      href: '/receive',
      icon: QrCodeIcon,
      color: 'bg-green-500 hover:bg-green-600',
      description: 'Show QR code to receive funds',
    },
    {
      name: 'History',
      href: '/history',
      icon: ChartBarIcon,
      color: 'bg-purple-500 hover:bg-purple-600',
      description: 'View transaction history',
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.name}
            href={action.href}
            className={`
              inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg
              transition-colors duration-200 shadow-sm
              ${action.color}
            `}
            title={action.description}
          >
            <Icon className="w-4 h-4 mr-2" />
            {action.name}
          </Link>
        );
      })}
    </div>
  );
} 