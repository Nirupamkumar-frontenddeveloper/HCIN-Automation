require('dotenv').config();

const { test } = require('@playwright/test');
const { runLosRoleCrawl } = require('../../pages/losCrawlRunner');

test('LOS Complete Action Button Crawl - IT Application Manager', {
    annotation: {
        type: 'description',
        description: 'Logs into LOS as IT Application Manager, discovers every top-level menu and submenu list page this role has (the "API Configuration" menu is intentionally skipped for this role), switches through every tab a list page has, and on each page/tab opens the first row\'s Action control and exercises EVERY item inside its dropdown (not just "View") - registering Pass if the resulting API call(s) returned 200, Fail otherwise; state-changing items (Approve/Reject/Delete/...) are deliberately skipped rather than auto-clicked. Every download icon/button found is also clicked and checked: Pass on a 200 response or a real download, Pass if disabled (no data), Fail otherwise.'
    }
}, async ({ page }, testInfo) => {
    test.setTimeout(20 * 60 * 1000);
    await runLosRoleCrawl(page, testInfo, 'itApplicationManager');
});
