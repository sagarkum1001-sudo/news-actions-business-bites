/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for ES modules
  experimental: {
    esmExternals: true,
  },

  // Configure output for Vercel serverless functions
  output: 'standalone',

  // Headers for API routes
  async headers() {
    return [
      {
        // Apply to API routes
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,POST,PUT,DELETE,OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },

  // Environment variables
  env: {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_AUTH_ENABLED: process.env.GOOGLE_AUTH_ENABLED,
  },
};

module.exports = nextConfig;
