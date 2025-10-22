// Authentication Tests
// Phase 2D: Testing Phase 2

// Mock browser environment for Node.js testing
global.window = {
  location: { hostname: 'localhost' },
  innerWidth: 1200,
  localStorage: {
    data: {},
    setItem: function(key, value) { this.data[key] = value; },
    getItem: function(key) { return this.data[key] || null; },
    removeItem: function(key) { delete this.data[key]; }
  },
  dispatchEvent: () => {},
  navigator: { userAgent: 'Node.js Test' }
};

global.console = {
  log: () => {},
  error: () => {},
  warn: () => {}
};

// Mock fetch for testing
global.fetch = async (url, options) => {
  if (url.includes('/api/auth/session')) {
    const body = JSON.parse(options.body);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        session_id: `test_${body.login_method}_${Date.now()}`,
        user_id: body.google_user?.id || 'test_user',
        user_type: body.user_type,
        login_method: body.login_method,
        permissions: body.login_method === 'demo' ? ['read', 'write', 'admin'] : ['read'],
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
    };
  }
  throw new Error('Network error');
};

// Import the modules
let Environment, AuthManager;

try {
  const config = require('../js/config.js');
  const auth = require('../js/auth.js');
  Environment = config.Environment;
  AuthManager = auth.AuthManager;
} catch (error) {
  console.error('Failed to load modules:', error.message);
  process.exit(1);
}

async function run() {
  console.log('🔐 Testing Authentication System');

  const results = {
    passed: 0,
    failed: 0,
    details: []
  };

  // Test 1: Environment-based auth configuration
  function testEnvironmentConfig() {
    // Test local environment
    global.window.location.hostname = 'localhost';
    const localConfig = Environment.getConfig();

    const localAuthValid = localConfig.auth.method === 'demo' &&
                          localConfig.auth.allowAnonymous === true;

    // Test production environment
    global.window.location.hostname = 'news-actions-business-bites.vercel.app';
    const prodConfig = Environment.getConfig();

    const prodAuthValid = prodConfig.auth.method === 'google' &&
                         prodConfig.auth.allowAnonymous === false;

    const passed = localAuthValid && prodAuthValid;
    results.details.push({
      passed,
      message: `Environment auth config: ${passed ? 'PASS' : 'FAIL'}`
    });

    if (passed) results.passed++;
    else results.failed++;
  }

  // Test 2: Demo authentication initialization
  async function testDemoAuth() {
    try {
      // Reset environment to local
      global.window.location.hostname = 'localhost';

      const authManager = new AuthManager();

      // Should initialize demo auth automatically
      await authManager.initialize();

      const isAuthenticated = authManager.isAuthenticated();
      const currentUser = authManager.getCurrentUser();
      const loginMethod = authManager.getLoginMethod();

      const passed = isAuthenticated === true &&
                    currentUser?.id === 'demo_user_123' &&
                    loginMethod === 'demo';

      results.details.push({
        passed,
        message: `Demo authentication: ${passed ? 'PASS' : 'FAIL'} (auth: ${isAuthenticated}, user: ${currentUser?.id}, method: ${loginMethod})`
      });

      if (passed) results.passed++;
      else results.failed++;

    } catch (error) {
      results.details.push({
        passed: false,
        message: `Demo authentication: FAIL - ${error.message}`
      });
      results.failed++;
    }
  }

  // Test 3: Google authentication setup (mock)
  async function testGoogleAuthSetup() {
    try {
      // Reset environment to production
      global.window.location.hostname = 'news-actions-business-bites.vercel.app';

      const authManager = new AuthManager();

      // Mock Google Identity Services
      global.google = {
        accounts: {
          id: {
            initialize: () => {},
            prompt: () => {}
          }
        }
      };

      await authManager.initialize();

      // In production, should not be authenticated initially
      const isAuthenticated = authManager.isAuthenticated();

      const passed = isAuthenticated === false;
      results.details.push({
        passed,
        message: `Google auth setup: ${passed ? 'PASS' : 'FAIL'} (initial auth: ${isAuthenticated})`
      });

      if (passed) results.passed++;
      else results.failed++;

    } catch (error) {
      results.details.push({
        passed: false,
        message: `Google auth setup: FAIL - ${error.message}`
      });
      results.failed++;
    }
  }

  // Test 4: Session creation and management
  async function testSessionManagement() {
    try {
      const authManager = new AuthManager();

      // Test logout (should clear everything)
      await authManager.logout();

      const isAuthenticatedAfterLogout = authManager.isAuthenticated();
      const currentUserAfterLogout = authManager.getCurrentUser();

      const passed = isAuthenticatedAfterLogout === false &&
                    currentUserAfterLogout === null;

      results.details.push({
        passed,
        message: `Session management: ${passed ? 'PASS' : 'FAIL'} (post-logout auth: ${isAuthenticatedAfterLogout})`
      });

      if (passed) results.passed++;
      else results.failed++;

    } catch (error) {
      results.details.push({
        passed: false,
        message: `Session management: FAIL - ${error.message}`
      });
      results.failed++;
    }
  }

  // Test 5: User permissions based on auth method
  function testPermissions() {
    // Test demo user permissions
    global.window.location.hostname = 'localhost';
    const demoConfig = Environment.getConfig();

    // Test production user permissions
    global.window.location.hostname = 'news-actions-business-bites.vercel.app';
    const prodConfig = Environment.getConfig();

    const demoHasAdvancedAccess = demoConfig.auth.allowAnonymous;
    const prodRequiresAuth = prodConfig.auth.requireAuthForAdvanced;

    const passed = demoHasAdvancedAccess === true && prodRequiresAuth === true;
    results.details.push({
      passed,
      message: `User permissions: ${passed ? 'PASS' : 'FAIL'} (demo access: ${demoHasAdvancedAccess}, prod requires auth: ${prodRequiresAuth})`
    });

    if (passed) results.passed++;
    else results.failed++;
  }

  // Run all tests
  testEnvironmentConfig();
  await testDemoAuth();
  await testGoogleAuthSetup();
  await testSessionManagement();
  testPermissions();

  console.log(`Authentication tests completed: ${results.passed} passed, ${results.failed} failed`);

  return results;
}

module.exports = { run };
