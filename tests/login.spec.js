require('dotenv').config();


const fs = require('fs');
const path = require('path');

// Playwright test utilities
const { test, expect } = require('@playwright/test');
const LoginPage = require('../pages/LoginPage');
const users = require('../utils/users');

// Folder used to store screenshots captured during test execution
const screenshotsDir = path.join(__dirname, '../screenshots');

// Create screenshots directory if it does not already exist
if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Helper to capture screenshots and attach them to the Playwright report
async function takeScreenshot(page, testInfo, name) {
    const safeTitle = testInfo.title.replace(/[^a-zA-Z0-9-_]+/g, '_').replace(/_+/g, '_');
    const filePath = path.join(screenshotsDir, `${safeTitle}_${name}.png`);

    await page.screenshot({
        path: filePath,
        fullPage: true
    });

    await testInfo.attach(name, {
        path: filePath,
        contentType: 'image/png'
    });

    return filePath;
}

// Capture a failure screenshot whenever a test does not pass as expected
test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
        await takeScreenshot(page, testInfo, 'failure');
    }
});

// Test case: login and logout flow
test('Login and Logout', async ({ page }, testInfo) => {

    const loginPage = new LoginPage(page);

    await loginPage.openLOS();

    await loginPage.login(
        users.salesRM.username,
        users.salesRM.password
    );

    await expect(
        page.locator('h6:has-text("Sales Dashboard")')
    ).toBeVisible();

    await takeScreenshot(page, testInfo, 'login-success');

    await loginPage.logout();

    await takeScreenshot(page, testInfo, 'after-logout');

});