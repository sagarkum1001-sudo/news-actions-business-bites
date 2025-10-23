// Constants and Lookup Tables
// Unified UI Implementation - Phase 4D

const Constants = {
  // UI Constants
  Z_INDEX: {
    SIDEBAR: 1000,
    MODAL_BASE: 10000,
    MODAL_HIGH: 10001,
    TOOLTIP: 10500,
    DROPDOWN: 10200
  },

  COLORS: {
    PRIMARY: '#667eea',
    SECONDARY: '#764ba2',
    SUCCESS: '#28a745',
    WARNING: '#ffc107',
    DANGER: '#dc3545',
    INFO: '#17a2b8',
    LIGHT: '#f8f9fa',
    DARK: '#343a40',
    GRAY: '#6c757d',
    MUTED: '#6c757d'
  },

  DIMENSIONS: {
    SIDEBAR_WIDTH: '250px',
    SIDEBAR_COLLAPSED_WIDTH: '60px',
    MODAL_MAX_WIDTH: '900px',
    CARD_MIN_WIDTH: '350px',
    BORDER_RADIUS: '10px',
    BORDER_RADIUS_LARGE: '15px'
  },

  ANIMATION: {
    TRANSITION_FAST: '0.2s ease',
    TRANSITION_NORMAL: '0.3s ease',
    TRANSITION_SLOW: '0.5s ease'
  },

  // API Constants
  API: {
    TIMEOUT: 10000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000
  },

  // Storage Keys
  STORAGE: {
    USER_SESSION: 'user_session',
    USER_PROFILE: 'user_profile',
    USER_LOGGED_IN: 'user_logged_in',
    WATCHLIST: 'user_watchlist',
    READ_LATER: 'user_read_later',
    PREFERENCES: 'user_preferences'
  },

  // Default Settings
  DEFAULTS: {
    ALERTS: {
      price: false,
      news: true,
      volume: false
    },
    PREFERENCES: {
      theme: 'light',
      language: 'en',
      notifications: true,
      autoRefresh: false
    }
  }
};

// Lookup Tables
const LookupTables = {
  // Company data for watchlist (in production, this would come from an API)
  COMPANIES: {
    'AAPL': {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      sector: 'Technology',
      market: 'NASDAQ',
      exchange: 'NASDAQ'
    },
    'TSLA': {
      symbol: 'TSLA',
      name: 'Tesla Inc.',
      sector: 'Automotive',
      market: 'NASDAQ',
      exchange: 'NASDAQ'
    },
    'GOOGL': {
      symbol: 'GOOGL',
      name: 'Alphabet Inc.',
      sector: 'Technology',
      market: 'NASDAQ',
      exchange: 'NASDAQ'
    },
    'MSFT': {
      symbol: 'MSFT',
      name: 'Microsoft Corporation',
      sector: 'Technology',
      market: 'NASDAQ',
      exchange: 'NASDAQ'
    },
    'AMZN': {
      symbol: 'AMZN',
      name: 'Amazon.com Inc.',
      sector: 'Retail',
      market: 'NASDAQ',
      exchange: 'NASDAQ'
    },
    'NVDA': {
      symbol: 'NVDA',
      name: 'NVIDIA Corporation',
      sector: 'Technology',
      market: 'NASDAQ',
      exchange: 'NASDAQ'
    },
    'META': {
      symbol: 'META',
      name: 'Meta Platforms Inc.',
      sector: 'Technology',
      market: 'NASDAQ',
      exchange: 'NASDAQ'
    },
    'NFLX': {
      symbol: 'NFLX',
      name: 'Netflix Inc.',
      sector: 'Entertainment',
      market: 'NASDAQ',
      exchange: 'NASDAQ'
    }
  },

  // Market data
  MARKETS: {
    'US': {
      name: 'United States',
      flag: '🇺🇸',
      currency: 'USD',
      timezone: 'America/New_York'
    },
    'EU': {
      name: 'European Union',
      flag: '🇪🇺',
      currency: 'EUR',
      timezone: 'Europe/London'
    },
    'China': {
      name: 'China',
      flag: '🇨🇳',
      currency: 'CNY',
      timezone: 'Asia/Shanghai'
    },
    'India': {
      name: 'India',
      flag: '🇮🇳',
      currency: 'INR',
      timezone: 'Asia/Kolkata'
    },
    'Japan': {
      name: 'Japan',
      flag: '🇯🇵',
      currency: 'JPY',
      timezone: 'Asia/Tokyo'
    },
    'Crypto': {
      name: 'Cryptocurrency',
      flag: '₿',
      currency: 'BTC',
      timezone: 'UTC'
    },
    'Brazil': {
      name: 'Brazil',
      flag: '🇧🇷',
      currency: 'BRL',
      timezone: 'America/Sao_Paulo'
    },
    'Mexico': {
      name: 'Mexico',
      flag: '🇲🇽',
      currency: 'MXN',
      timezone: 'America/Mexico_City'
    },
    'Indonesia': {
      name: 'Indonesia',
      flag: '🇮🇩',
      currency: 'IDR',
      timezone: 'Asia/Jakarta'
    },
    'Thailand': {
      name: 'Thailand',
      flag: '🇹🇭',
      currency: 'THB',
      timezone: 'Asia/Bangkok'
    }
  },

  // Sector classifications
  SECTORS: {
    'Technology': {
      color: '#667eea',
      icon: '💻'
    },
    'Finance': {
      color: '#28a745',
      icon: '💰'
    },
    'Healthcare': {
      color: '#dc3545',
      icon: '🏥'
    },
    'Energy': {
      color: '#ffc107',
      icon: '⚡'
    },
    'Retail': {
      color: '#17a2b8',
      icon: '🛒'
    },
    'Automotive': {
      color: '#6c757d',
      icon: '🚗'
    },
    'Entertainment': {
      color: '#e83e8c',
      icon: '🎬'
    },
    'General': {
      color: '#6c757d',
      icon: '📊'
    }
  },

  // Sentiment mappings
  SENTIMENT: {
    'positive': {
      color: '#28a745',
      label: 'Positive',
      icon: '📈'
    },
    'negative': {
      color: '#dc3545',
      label: 'Negative',
      icon: '📉'
    },
    'neutral': {
      color: '#ffc107',
      label: 'Neutral',
      icon: '➡️'
    }
  },

  // Impact score ranges
  IMPACT_RANGES: {
    CRITICAL: { min: 9.0, max: 10.0, color: '#dc3545', label: 'Critical' },
    HIGH: { min: 8.0, max: 8.9, color: '#fd7e14', label: 'High' },
    MEDIUM_HIGH: { min: 7.0, max: 7.9, color: '#ffc107', label: 'Medium-High' },
    MEDIUM: { min: 6.0, max: 6.9, color: '#17a2b8', label: 'Medium' },
    LOW_MEDIUM: { min: 5.0, max: 5.9, color: '#28a745', label: 'Low-Medium' },
    LOW: { min: 0.0, max: 4.9, color: '#6c757d', label: 'Low' }
  },

  // Modal configurations
  MODALS: {
    WATCHLIST: {
      id: 'watchlist-modal',
      zIndex: Constants.Z_INDEX.MODAL_BASE,
      maxWidth: '800px'
    },
    READ_LATER: {
      id: 'read-later-modal',
      zIndex: Constants.Z_INDEX.MODAL_BASE,
      maxWidth: '900px'
    },
    SEARCH: {
      id: 'search-modal',
      zIndex: Constants.Z_INDEX.MODAL_BASE,
      maxWidth: '600px'
    },
    LOGIN: {
      id: 'login-modal',
      zIndex: Constants.Z_INDEX.MODAL_BASE,
      maxWidth: '400px'
    }
  },

  // Button styles
  BUTTON_STYLES: {
    PRIMARY: {
      background: `linear-gradient(135deg, ${Constants.COLORS.PRIMARY} 0%, ${Constants.COLORS.SECONDARY} 100%)`,
      color: 'white',
      border: 'none',
      borderRadius: Constants.DIMENSIONS.BORDER_RADIUS,
      cursor: 'pointer',
      transition: Constants.ANIMATION.TRANSITION_FAST
    },
    SECONDARY: {
      background: Constants.COLORS.LIGHT,
      color: Constants.COLORS.PRIMARY,
      border: `1px solid ${Constants.COLORS.PRIMARY}`,
      borderRadius: Constants.DIMENSIONS.BORDER_RADIUS,
      cursor: 'pointer',
      transition: Constants.ANIMATION.TRANSITION_FAST
    },
    DANGER: {
      background: '#f8d7da',
      color: '#721c24',
      border: '1px solid #f5c6cb',
      borderRadius: '4px',
      cursor: 'pointer',
      transition: Constants.ANIMATION.TRANSITION_FAST
    }
  }
};

// Utility functions for lookup tables
const LookupUtils = {
  getCompanyBySymbol: (symbol) => {
    return LookupTables.COMPANIES[symbol.toUpperCase()] || null;
  },

  getMarketByCode: (code) => {
    return LookupTables.MARKETS[code] || null;
  },

  getSectorInfo: (sector) => {
    return LookupTables.SECTORS[sector] || LookupTables.SECTORS['General'];
  },

  getSentimentInfo: (sentiment) => {
    if (!sentiment) return LookupTables.SENTIMENT['neutral'];
    return LookupTables.SENTIMENT[sentiment.toLowerCase()] || LookupTables.SENTIMENT['neutral'];
  },

  getImpactRange: (score) => {
    for (const [key, range] of Object.entries(LookupTables.IMPACT_RANGES)) {
      if (score >= range.min && score <= range.max) {
        return range;
      }
    }
    return LookupTables.IMPACT_RANGES.LOW;
  },

  getModalConfig: (modalName) => {
    return LookupTables.MODALS[modalName.toUpperCase()] || null;
  },

  getButtonStyle: (styleName) => {
    return LookupTables.BUTTON_STYLES[styleName.toUpperCase()] || LookupTables.BUTTON_STYLES.PRIMARY;
  }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Constants, LookupTables, LookupUtils };
}

// Make available globally in browser
if (typeof window !== 'undefined') {
  window.Constants = Constants;
  window.LookupTables = LookupTables;
  window.LookupUtils = LookupUtils;
}
