// Environment Detection and Configuration
// Fetching Auth Configuration from Server for Exact GOOGLE_AUTH_ENABLED Usage

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
        return data.data; // { useGoogleAuth, googleClientId, authMode }
      } else {
        console.error('❌ Invalid auth config response:', data);
        throw new Error('Invalid auth config response');
      }
    } catch (error) {
      console.error('❌ Failed to fetch auth config:', error);
      // Fallback to local detection
      const isLocal = Environment.isLocal();
      return {
        useGoogleAuth: !isLocal, // Production = Google, Local = Demo
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

    console.log('🔐 Final auth method:', {
      serverAuthConfig: authConfig,
      authMethod,
      isLocal,
      googleAuthEnabled: authConfig.useGoogleAuth
    });

    return {
      auth: {
        method: authMethod,
        allowAnonymous: isLocal && !authConfig.useGoogleAuth, // Only allow anonymous in local demo
        requireAuthForAdvanced: authConfig.useGoogleAuth, // Always require auth for Google auth
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

  // Get config without async (for basic operations)
  getConfigSync: () => {
    const isLocal = Environment.isLocal();
    return {
      api: {
        baseURL: isLocal ? 'http://localhost:3000' : `https://${window.location.hostname}`,
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
    deploymentTime: '2025-11-19T13:05:00.000Z',
    fetchingServerAuthConfig: false
  }),

  // Cached config for sync access after async fetch
  _cachedConfig: null,

  // Get cached config if available, otherwise fetch
  getCachedConfig: () => {
    return Environment._cachedConfig || Environment.getConfigSync();
  }
};

// Global environment detection for debugging (only in browser)
if (typeof window !== 'undefined') {
  window.Environment = Environment;

  // Log environment detection on load (only in browser)
  console.log('🔍 Environment Detection:', Environment.getDebugInfo());
}

// Export for Node.js testing
module.exports = { Environment };
