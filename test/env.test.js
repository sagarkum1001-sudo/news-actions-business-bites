// Environment Detection Tests
// Phase 1D: Testing Phase 1

// Mock browser environment for Node.js testing
global.window = {
  location: { hostname: 'localhost' },
  innerWidth: 1200,
  navigator: { userAgent: 'Node.js Test' }
};

global.console = {
  log: () => {},
  error: () => {},
  warn: () => {}
};

// Import the config module
const configPath = '../js/config.js';
let Environment;

try {
  Environment = require(configPath).Environment;
} catch (error) {
  console.error('Failed to load config module:', error.message);
  process.exit(1);
}

async function run() {
  console.log('🔍 Testing Environment Detection');

  const results = {
    passed: 0,
    failed: 0,
    details: []
  };

  // Test 1: Local environment detection
  function testLocalEnvironment() {
    // Mock localhost
    global.window.location.hostname = 'localhost';
    const isLocal = Environment.isLocal();
    const isProduction = Environment.isProduction();

    const passed = isLocal === true && isProduction === false;
    results.details.push({
      passed,
      message: `Local environment detection: ${passed ? 'PASS' : 'FAIL'} (isLocal: ${isLocal}, isProduction: ${isProduction})`
    });

    if (passed) results.passed++;
    else results.failed++;
  }

  // Test 2: Production environment detection
  function testProductionEnvironment() {
    // Mock Vercel production
    global.window.location.hostname = 'news-actions-business-bites.vercel.app';
    const isLocal = Environment.isLocal();
    const isProduction = Environment.isProduction();

    const passed = isLocal === false && isProduction === true;
    results.details.push({
      passed,
      message: `Production environment detection: ${passed ? 'PASS' : 'FAIL'} (isLocal: ${isLocal}, isProduction: ${isProduction})`
    });

    if (passed) results.passed++;
    else results.failed++;
  }

  // Test 3: Mobile detection
  function testMobileDetection() {
    // Test desktop width
    global.window.innerWidth = 1200;
    const isMobileDesktop = Environment.isMobile();

    // Test mobile width
    global.window.innerWidth = 600;
    const isMobileMobile = Environment.isMobile();

    const passed = isMobileDesktop === false && isMobileMobile === true;
    results.details.push({
      passed,
      message: `Mobile detection: ${passed ? 'PASS' : 'FAIL'} (desktop: ${isMobileDesktop}, mobile: ${isMobileMobile})`
    });

    if (passed) results.passed++;
    else results.failed++;
  }

  // Test 4: Configuration generation
  function testConfiguration() {
    // Test local config
    global.window.location.hostname = 'localhost';
    global.window.innerWidth = 1200;
    const localConfig = Environment.getConfig();

    const localConfigValid = localConfig.auth.method === 'demo' &&
                            localConfig.auth.allowAnonymous === true &&
                            localConfig.ui.layout === 'sidebar';

    // Test production config
    global.window.location.hostname = 'news-actions-business-bites.vercel.app';
    const prodConfig = Environment.getConfig();

    const prodConfigValid = prodConfig.auth.method === 'google' &&
                           prodConfig.auth.allowAnonymous === false &&
                           prodConfig.ui.layout === 'sidebar';

    const passed = localConfigValid && prodConfigValid;
    results.details.push({
      passed,
      message: `Configuration generation: ${passed ? 'PASS' : 'FAIL'}`
    });

    if (passed) results.passed++;
    else results.failed++;
  }

  // Test 5: Debug information
  function testDebugInfo() {
    const debugInfo = Environment.getDebugInfo();

    const hasRequiredFields = debugInfo.hostname &&
                             typeof debugInfo.isProduction === 'boolean' &&
                             typeof debugInfo.isLocal === 'boolean' &&
                             debugInfo.timestamp;

    const passed = hasRequiredFields;
    results.details.push({
      passed,
      message: `Debug information: ${passed ? 'PASS' : 'FAIL'}`
    });

    if (passed) results.passed++;
    else results.failed++;
  }

  // Run all tests
  testLocalEnvironment();
  testProductionEnvironment();
  testMobileDetection();
  testConfiguration();
  testDebugInfo();

  console.log(`Environment tests completed: ${results.passed} passed, ${results.failed} failed`);

  return results;
}

module.exports = { run };
