// Authentication Manager
// Unified UI Implementation - Phase 2A

class AuthManager {
  constructor() {
    this.config = null; // Will be set async in initialize()
    this.currentUser = null;
    this.isInitialized = false;

    // Demo user configuration
    this.demoUser = {
      id: 'demo_user_123',
      email: 'demo@example.com',
      name: 'Demo User',
      picture: null,
      login_method: 'demo'
    };
  }

  async initialize() {
    if (this.isInitialized) return;

    console.log('🔐 Initializing authentication system...');

    // Fetch config from server first
    console.log('🔄 Calling Environment.getConfig()...');
    this.config = await Environment.getConfig();
    console.log('📋 Auth config received:', this.config);
    console.log('🔧 Environment details:', {
      auth: this.config?.auth,
      useDemo: this.config?.auth?.method === 'demo',
      useGoogle: this.config?.auth?.method === 'google'
    });

    // HARD OVERRIDE FOR VERCEL TESTING - Force Google auth temporarily
    if (true || this.config?.auth?.method === 'demo') { // Always Google for testing
      console.log('🚨 FORCED GOOGLE AUTH: Overriding config for Vercel testing');
      await this.initializeGoogleAuth();
    } else {
      if (this.config.auth.method === 'demo') {
        await this.initializeDemoAuth();
      } else {
        await this.initializeGoogleAuth();
      }
    }

    this.isInitialized = true;
    console.log('✅ Authentication system initialized');
  }

  async initializeDemoAuth() {
    console.log('🎭 Setting up demo authentication...');

    // Simulate login delay for realistic UX
    await new Promise(resolve => setTimeout(resolve, 500));

    // Auto-login demo user
    const mockResponse = {
      credential: btoa(JSON.stringify(this.demoUser))
    };

    return this.handleDemoSignIn(mockResponse);
  }

  async initializeGoogleAuth() {
    console.log('🔑 Setting up Google authentication...');

    // Check if Google Identity Services is loaded
    if (typeof google !== 'undefined' && google.accounts) {
      google.accounts.id.initialize({
        client_id: this.config.auth.googleClientId || '206000589951-mb85oe06h8ei51bjbdudk2r6ptaa6mup.apps.googleusercontent.com',
        callback: this.handleGoogleSignIn.bind(this)
      });

      console.log('✅ Google Identity Services initialized');

      // Wait for DOM element and render button
      this.renderGoogleButton();
    } else {
      console.log('⏳ Waiting for Google Identity Services to load...');
      // Retry after a short delay
      setTimeout(() => this.initializeGoogleAuth(), 100);
    }
  }

  renderGoogleButton() {
    const buttonElement = document.getElementById('gsi-button');
    if (buttonElement) {
      console.log('🎯 Found gsi-button element, rendering Google button...');

      // Clear any existing content
      buttonElement.innerHTML = '';

      // Render Google's official button
      google.accounts.id.renderButton(
        buttonElement,
        {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          shape: 'rectangular',
          text: 'signin_with',
          logo_alignment: 'left'
        }
      );

      console.log('✅ Google Identity Services button rendered');
    } else {
      console.log('⏳ gsi-button element not found, retrying...');
      // Retry after a short delay
      setTimeout(() => this.renderGoogleButton(), 200);
    }
  }

  async handleDemoSignIn(response) {
    console.log('🎭 Processing demo sign-in...');

    if (response.credential) {
      // Decode the JWT token to get user info
      const payload = JSON.parse(atob(response.credential.split('.')[1]));
      console.log('👤 Demo user info:', payload);

      // Create session with demo user data
      await this.createSessionWithUserData(payload);
    } else {
      console.error('❌ No credential in demo response');
      throw new Error('Demo authentication failed');
    }
  }

  async handleGoogleSignIn(response) {
    console.log('🔐 Processing Google sign-in...');

    if (response.credential) {
      // Decode the JWT token to get user info
      const payload = JSON.parse(atob(response.credential.split('.')[1]));
      console.log('👤 Google user info:', payload);

      // Create session with Google user data
      await this.createSessionWithUserData(payload);
    } else {
      console.error('❌ No credential in Google response');
      throw new Error('Google authentication failed');
    }
  }

  async createSessionWithUserData(userData) {
    try {
      console.log('🔐 Creating session with user data:', userData);

      const requestPayload = {
        user_type: 'free',
        login_method: userData.login_method || 'google',
        google_user: {
          id: userData.sub,
          email: userData.email,
          name: userData.name,
          picture: userData.picture
        }
      };

      console.log('📤 Sending session request:', requestPayload);

      const sessionResponse = await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload)
      });

      console.log('📥 Session response status:', sessionResponse.status);

      const sessionData = await sessionResponse.json();
      console.log('📥 Session response data:', sessionData);

      if (!sessionResponse.ok) {
        console.error('❌ Session creation failed with status:', sessionResponse.status);
        throw new Error(sessionData.error || `Session creation failed with status ${sessionResponse.status}`);
      }

      console.log('✅ Session created successfully:', sessionData);

      // Store user data and session
      this.setCurrentUser(userData, sessionData);

      // Trigger UI updates
      this.notifyAuthSuccess();

    } catch (error) {
      console.error('❌ Session creation error:', error);
      throw error;
    }
  }

  setCurrentUser(userData, sessionData = null) {
    this.currentUser = {
      ...userData,
      session: sessionData,
      loginTime: Date.now()
    };

    // Store in localStorage for persistence
    localStorage.setItem('user_logged_in', 'true');
    localStorage.setItem('user_profile', JSON.stringify(userData));

    if (sessionData) {
      localStorage.setItem('user_session', JSON.stringify(sessionData));
    }

    console.log('👤 Current user set:', this.currentUser);
  }

  notifyAuthSuccess() {
    // Dispatch custom event for UI updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth-success', {
        detail: { user: this.currentUser }
      }));
    }

    // Execute any pending login callbacks
    if (window.loginCallback) {
      window.loginCallback();
      window.loginCallback = null;
    }
  }

  isAuthenticated() {
    if (this.config.auth.allowAnonymous) {
      return true; // Always authenticated in demo mode
    }
    return localStorage.getItem('user_logged_in') === 'true';
  }

  getCurrentUser() {
    return this.currentUser || JSON.parse(localStorage.getItem('user_profile') || 'null');
  }

  async logout() {
    console.log('🚪 Logging out user...');

    // Clear local storage
    localStorage.removeItem('user_logged_in');
    localStorage.removeItem('user_session');
    localStorage.removeItem('user_profile');

    // Clear current user
    this.currentUser = null;

    // Dispatch logout event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth-logout'));
    }

    console.log('✅ User logged out successfully');
  }

  // Demo-specific methods
  persistDemoUser() {
    const demoData = {
      ...this.demoUser,
      preferences: this.loadUserPreferences(),
      readLater: this.loadReadLater(),
      watchlist: this.loadWatchlist(),
      loginTime: Date.now()
    };

    localStorage.setItem('demo_user_persistent', JSON.stringify(demoData));
  }

  loadUserPreferences() {
    return JSON.parse(localStorage.getItem('demo_user_preferences') || '{}');
  }

  loadReadLater() {
    return JSON.parse(localStorage.getItem('demo_read_later') || '[]');
  }

  loadWatchlist() {
    return JSON.parse(localStorage.getItem('demo_watchlist') || '[]');
  }

  // Utility methods
  getUserId() {
    const user = this.getCurrentUser();
    return user ? user.id : null;
  }

  getLoginMethod() {
    const user = this.getCurrentUser();
    return user ? (user.login_method || 'unknown') : 'none';
  }
}

// Global instance for easy access
const authManager = new AuthManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AuthManager, authManager };
}

// Make available globally in browser
if (typeof window !== 'undefined') {
  window.AuthManager = AuthManager;
  window.authManager = authManager;
}
