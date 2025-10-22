#!/usr/bin/env node

// Basic Test Runner for Unified UI Implementation
// Phase 1D: Testing Phase 1

const fs = require('fs');
const path = require('path');

class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.results = [];
  }

  // Load and run all test files
  async run() {
    console.log('🧪 Starting Unified UI Test Suite');
    console.log('=' .repeat(50));

    const testDir = path.join(__dirname);
    const testFiles = fs.readdirSync(testDir)
      .filter(file => file.endsWith('.test.js'))
      .sort();

    for (const testFile of testFiles) {
      await this.runTestFile(path.join(testDir, testFile));
    }

    this.printSummary();
  }

  async runTestFile(testFilePath) {
    const testName = path.basename(testFilePath, '.test.js');
    console.log(`\n📋 Running ${testName} tests...`);

    try {
      // Clear require cache for fresh imports
      delete require.cache[require.resolve(testFilePath)];

      const testModule = require(testFilePath);

      if (typeof testModule.run === 'function') {
        const result = await testModule.run();
        this.handleTestResult(testName, result);
      } else {
        console.log(`⚠️  No run function found in ${testName}`);
      }
    } catch (error) {
      console.log(`❌ Error running ${testName}:`, error.message);
      this.failed++;
    }
  }

  handleTestResult(testName, result) {
    if (result && result.passed !== undefined) {
      this.passed += result.passed;
      this.failed += result.failed || 0;

      console.log(`✅ ${testName}: ${result.passed} passed${result.failed ? `, ${result.failed} failed` : ''}`);

      if (result.details) {
        result.details.forEach(detail => {
          console.log(`   ${detail.passed ? '✅' : '❌'} ${detail.message}`);
        });
      }
    } else {
      console.log(`✅ ${testName}: Completed`);
      this.passed++;
    }
  }

  printSummary() {
    console.log('\n' + '=' .repeat(50));
    console.log('📊 Test Summary');
    console.log('=' .repeat(50));
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`📈 Total:  ${this.passed + this.failed}`);

    if (this.failed === 0) {
      console.log('🎉 All tests passed!');
      process.exit(0);
    } else {
      console.log('⚠️  Some tests failed. Check output above.');
      process.exit(1);
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const runner = new TestRunner();
  runner.run().catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = TestRunner;
