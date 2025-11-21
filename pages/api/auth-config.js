// Vercel API Route: /api/auth-config
// Handles Google OAuth configuration requests

export default function handler(req, res) {
  console.log('🔧 Auth config API called - VERCEL VERSION');
  console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`🌍 VERCEL_ENV: ${process.env.VERCEL_ENV}`);
  console.log(`🔑 GOOGLE_AUTH_ENABLED: ${process.env.GOOGLE_AUTH_ENABLED}`);
  console.log('✅ Vercel API route working!');

  // Environment detection
  const ENVIRONMENT = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    VERCEL_ENV: process.env.VERCEL_ENV,
    isProduction: process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production',
    isLocal: process.env.NODE_ENV !== 'production' && process.env.VERCEL_ENV !== 'production',
    useGoogleAuth: process.env.GOOGLE_AUTH_ENABLED === 'true' && (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'),
    useDemoAuth: process.env.DEMO_MODE_ENABLED !== 'false' && (process.env.NODE_ENV !== 'production' && ENVIRONMENT.NODE_ENV !== 'production' && ENVIRONMENT.VERCEL_ENV !== 'production'),
    useSupabase: process.env.USE_SUPABASE === 'true' && !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
    useSQLite: !process.env.USE_SUPABASE
  };

  res.status(200).json({
    status: 'success',
    data: {
      useGoogleAuth: ENVIRONMENT.useGoogleAuth,
      useDemoAuth: ENVIRONMENT.useDemoAuth,
      googleClientId: process.env.GOOGLE_CLIENT_ID || null,
      authMode: ENVIRONMENT.useGoogleAuth ? 'google' : 'demo'
    },
    rawEnvVars: {
      GOOGLE_AUTH_ENABLED: process.env.GOOGLE_AUTH_ENABLED,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT_SET'
    },
    vercelApiRoute: true
  });
}
