require('dotenv').config();

const { test } = require('@playwright/test');
const { runLmsRoleCrawl } = require('../../pages/LMS/lmsCrawlRunner');

test('LMS Complete Action Button Crawl - Ops Maker', {
    annotation: {
        type: 'description',
        description: 'Logs into LMS as Ops Maker, discovers every top-level menu and submenu list page this role has, switches through every tab a list page has (e.g. "All List"/"Awaiting Approval"), and on each page/tab opens the first row\'s Action control and exercises EVERY item inside its dropdown (not just "View") - registering Pass if the resulting API call(s) returned 200, Fail otherwise; state-changing items (Approve/Reject/Delete/Freeze/...) are deliberately skipped rather than auto-clicked. Every download icon/button found is also clicked and checked. Any popup that pops up without closing on its own is dismissed automatically (via its close/cross control) so it never blocks the crawl.'
    }
}, async ({ page }, testInfo) => {
    test.setTimeout(20 * 60 * 1000);
    await runLmsRoleCrawl(page, testInfo, 'lmsOpsMaker');
});
