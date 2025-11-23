// Environment Detection and Configuration
// Fetching Auth Configuration from Server using GOOGLE_AUTH_ENABLED

const Environment = {
  // Local detection for API base URL
  isLocal: () => {
    if (typeof window === 'undefined' || !window.location) return true;
    return ['localhost', '127.0.0.1'].includes(window.location.hostname);
  },

  // Mobile detection
  isMobile: () => {
    if (typeof window === 'undefined' || typeof window.innerWidth === 'undefined') return false;
    return window.innerWidth <= 768;
  },

  // Fetch server environment configuration
  fetchAuthConfig: async () => {
    try {
      const baseURL = Environment.isLocal()
        ? 'http://localhost:3000'
        : `https://${window.location.hostname}`;

      console.log('📡 Fetching auth config from:', baseURL);
      const response = await fetch(`${baseURL}/api/auth-config`);
      const data = await response.json();

      if (data.status === 'success' && data.data) {
        console.log('✅ Server auth config received:', data.data);
        return data.data;
      } else {
        console.error('❌ Invalid auth config response:', data);
        throw new Error('Invalid auth config response');
      }
    } catch (error) {
      console.error('❌ Failed to fetch auth config:', error);
      // Fallback to hostname-based detection
      const isLocal = Environment.isLocal();
      return {
        useGoogleAuth: !isLocal,
        googleClientId: '774408186897-04827frfvgu2ccipure8p4tb977va77m.apps.googleusercontent.com',
        authMode: isLocal ? 'demo' : 'google'
      };
    }
  },

  // Get configuration with server-side auth decision
  getConfig: async () => {
    const authConfig = await Environment.fetchAuthConfig();
    const authMethod = authConfig.useGoogleAuth ? 'google' : 'demo';
    const isLocal = Environment.isLocal();

    console.log('🔐 Final auth method (from server env):', {
      serverAuthConfig: authConfig,
      authMethod,
      isLocal,
      googleAuthEnabled: authConfig.useGoogleAuth
    });

    return {
      auth: {
        method: authMethod,
        allowAnonymous: isLocal && !authConfig.useGoogleAuth,
        requireAuthForAdvanced: authConfig.useGoogleAuth,
        googleClientId: authConfig.googleClientId || '774408186897-04827frfvgu2ccipure8p4tb977va77m.apps.googleusercontent.com'
      },
      ui: {
        layout: 'sidebar',
        sidebarPosition: Environment.isMobile() ? 'bottom' : 'left',
        icons: Environment.isLocal() ? 'lucide' : 'emoji'
      },
      features: {
        sidebar: true,
        search: true,
        readLater: true,
        watchlist: true,
        alerts: true,
        analysis: true
      },
      api: {
        baseURL: Environment.isLocal()
          ? 'http://localhost:3000'
          : `https://${window.location.hostname}`,
        timeout: 10000
      }
    };
  },

  // Simple debug information
  getDebugInfo: () => ({
    hostname: (typeof window !== 'undefined' && window.location) ? window.location.hostname : 'unknown',
    isLocal: Environment.isLocal(),
    isMobile: Environment.isMobile(),
    userAgent: (typeof navigator !== 'undefined') ? navigator.userAgent : 'unknown',
    timestamp: new Date().toISOString(),
    deploymentTime: '2025-11-19T13:10:00.000Z'
  })
};

// Global environment detection for debugging (only in browser)
if (typeof window !== 'undefined') {
  window.Environment = Environment;

  // Log environment detection on load (only in browser)
  console.log('🔍 Environment Detection:', Environment.getDebugInfo());
}

// Export for Node.js testing
// Export for Node.js testing
