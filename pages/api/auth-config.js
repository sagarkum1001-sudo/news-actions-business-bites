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
  const hostname = req?.headers?.host || '';
  const isOnDeploymentPlatform = !!process.env.VERCEL ||
                                 !!process.env.VERCEL_ENV ||
                                 hostname.includes('vercel.app') ||
                                 hostname.includes('sagars-projects') ||
                                 hostname.includes('netlify.app') ||
                                 !!process.env.NETLIFY ||
                                 !!process.env.NETLIFY_BUILD_ID ||
                                 !!process.env.CONTEXT ||
                                 !!process.env.SITE_NAME ||
                                 // Production environment indicators
                                 !!process.env.VERCEL_PROJECT_ID ||
                                 !!process.env.VERCEL_ORG_ID ||
                                 process.env.NODE_ENV === 'production'; // Fallback for any production env
  const ENVIRONMENT = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    VERCEL_ENV: process.env.VERCEL_ENV,
    isOnDeploymentPlatform: isOnDeploymentPlatform,
    // Google Auth: Any deployment platform (with GOOGLE_AUTH_ENABLED=true)
    useGoogleAuth: isOnDeploymentPlatform && process.env.GOOGLE_AUTH_ENABLED === 'true',
    // Demo Auth: Only local system (not on deployment platforms)
    useDemoAuth: !isOnDeploymentPlatform,
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
