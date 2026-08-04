// Load environment variables from .env file
require('dotenv').config();


// Import Playwright configuration helper 1
const { defineConfig } = require('@playwright/test');


// Export Playwright configuration
module.exports = defineConfig({

    // Folder where all test files (.spec.js) are stored
    testDir: './tests',

    // Maximum time allowed for each test case
    timeout: 60000,

    // Maximum time for each expect() assertion
    expect: {
        timeout: 1000000
    },

    // Run test files sequentially
    // (Can be changed to true for parallel execution later)
    fullyParallel: false,

    // Stop execution after first failure
    // Change to 0 if you want to execute all tests
    maxFailures: 1,

    // Retry failed test cases
    retries: 0,

    // Number of workers
    // 1 = Execute one test at a time
    workers: 1,

    // Reporter Configuration
    reporter: [

        // Shows execution logs in terminal
        ['list'],

        // Generates HTML Report
        ['html', {
            outputFolder: 'playwright-report',
            open: 'always'
        }],

        // Generates a downloadable Word (.docx) report with test descriptions
        ['./reporters/wordReporter.js']

    ],

    // Common browser settings
    use: {

        // Run browser in headed/headless mode
        headless: process.env.HEADLESS === 'true',

        // Browser window size
        viewport: {
            width: 1536,
            height: 864
        },

        // Ignore HTTPS certificate issues
        ignoreHTTPSErrors: true,

        // Capture screenshot only if test fails
        screenshot: 'only-on-failure',

        // Record video only if test fails
        video: 'retain-on-failure',

        // Capture trace only if test fails
        trace: 'retain-on-failure',

        // Maximum action timeout
        actionTimeout: 30000,

        // Maximum page load timeout
        navigationTimeout: 60000

    }

});