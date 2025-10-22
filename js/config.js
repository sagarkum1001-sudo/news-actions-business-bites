// Environment Detection and Configuration
// Unified UI Implementation - Phase 1B

const Environment = {
  // Core detection logic
  isProduction: () => {
    if (typeof window === 'undefined' || !window.location) return false;
    return window.location.hostname === 'news-actions-business-bites.vercel.app';
  },
  isLocal: () => {
    if (typeof window === 'undefined' || !window.location) return false;
    return ['localhost', '127.0.0.1'].includes(window.location.hostname);
  },
  isDevelopment: () => !Environment.isProduction(),

  // Mobile detection
  isMobile: () => {
    if (typeof window === 'undefined' || typeof window.innerWidth === 'undefined') return false;
    return window.innerWidth <= 768;
  },

  // Configuration based on environment
  getConfig: () => ({
    auth: {
      method: Environment.isProduction() ? 'google' : 'demo',
      allowAnonymous: Environment.isLocal(),
      requireAuthForAdvanced: Environment.isProduction(),
      googleClientId: Environment.isProduction()
        ? '774408186897-04827frfvgu2ccipure8p4tb977va77m.apps.googleusercontent.com'
        : '774408186897-04827frfvgu2ccipure8p4tb977va77m.apps.googleusercontent.com' // Same for demo
    },
    ui: {
      layout: 'sidebar', // Unified layout
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
      baseURL: Environment.isProduction()
        ? 'https://news-actions-business-bites.vercel.app'
        : 'http://localhost:3000',
      timeout: 10000
    }
  }),

  // Debug information
  getDebugInfo: () => ({
    hostname: (typeof window !== 'undefined' && window.location) ? window.location.hostname : 'unknown',
    isProduction: Environment.isProduction(),
    isLocal: Environment.isLocal(),
    isMobile: Environment.isMobile(),
    userAgent: (typeof navigator !== 'undefined') ? navigator.userAgent : 'unknown',
    timestamp: new Date().toISOString()
  })
};

// Global environment detection for debugging (only in browser)
if (typeof window !== 'undefined') {
  window.Environment = Environment;

  // Log environment detection on load (only in browser)
  console.log('🔍 Environment Detection:', Environment.getDebugInfo());
}

// Export for Node.js testing
module.exports = { Environment };
