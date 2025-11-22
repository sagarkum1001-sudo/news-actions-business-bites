// Vercel API Route: /api/auth-config
// Handles Google OAuth configuration requests

export default function handler(req, res) {
  console.log('🔧 Auth config API called - VERCEL VERSION');
  console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`🌍 VERCEL_ENV: ${process.env.VERCEL_ENV}`);
  console.log(`🔑 GOOGLE_AUTH_ENABLED: ${process.env.GOOGLE_AUTH_ENABLED}`);
  console.log(`🚀 VERCEL: ${process.env.VERCEL}`);
  console.log('✅ Vercel API route working!');

  // Environment detection
  const isOnVercel = !!process.env.VERCEL || !!process.env.VERCEL_ENV; // Check if running on Vercel
  const ENVIRONMENT = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    VERCEL_ENV: process.env.VERCEL_ENV,
    isOnVercel: isOnVercel,
    // Google Auth: Any Vercel deployment (with GOOGLE_AUTH_ENABLED=true)
    useGoogleAuth: isOnVercel && process.env.GOOGLE_AUTH_ENABLED === 'true',
    // Demo Auth: Only local system (not on Vercel)
    useDemoAuth: !isOnVercel,
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
