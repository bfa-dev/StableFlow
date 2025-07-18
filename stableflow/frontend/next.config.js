/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features
  experimental: {
    turbo: {
      rules: {
        // Add any custom webpack rules here
      },
    },
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    NEXT_PUBLIC_APP_NAME: 'StableFlow',
    NEXT_PUBLIC_APP_DESCRIPTION: 'Enterprise Stablecoin Platform',
  },

  // Image optimization
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // PWA Configuration (will be enabled when PWA package is properly configured)
  ...(process.env.NODE_ENV === 'production' && {
    // Add PWA config here when ready for production
  }),
};

module.exports = nextConfig; 