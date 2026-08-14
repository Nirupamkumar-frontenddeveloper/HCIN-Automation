const { expect } = require('@playwright/test');
const LmsLoginPage = require('./LmsLoginPage');
const LmsCrawlerPage = require('./LmsCrawlerPage');
const users = require('../../utils/users');

// Logs in and confirms the result, retrying a few times on a transient dev-environment
// error. The dev backend sometimes 502s on login for a given account and shows "Error -
// Something went wrong. Please try again later." instead of the login form failing
// cleanly - if left unhandled, the crawl would barrel ahead assuming the login
// succeeded (since that text isn't "The ID or password is incorrect!") and get stuck
// interacting with a broken page. A wrong-credentials error is NOT retried - only the
// generic server error is, since that one is plausibly just backend flakiness.
async function attemptLmsLogin(page, loginPage, user) {
    const MAX_ATTEMPTS = 3;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        if (attempt > 1) {
            await page.waitForTimeout(2000 * attempt);
            await loginPage.openLMS();
        }

        await loginPage.login(user.username, user.password);

        const incorrectCreds = await page.getByText('The ID or password is incorrect!').isVisible({ timeout: 5000 }).catch(() => false);
        if (incorrectCreds) {
            throw new Error(`Login failed for username "${user.username}" - "The ID or password is incorrect!"`);
        }

        const serverError = await page.getByText(/something went wrong/i).isVisible({ timeout: 3000 }).catch(() => false);
        if (!serverError) {
            return;
        }

        if (attempt === MAX_ATTEMPTS) {
            throw new Error(`Login failed for username "${user.username}" after ${MAX_ATTEMPTS} attempts - the LMS server returned an error ("Something went wrong. Please try again later.")`);
        }
    }
}

// Shared crawl logic for a single LMS role/login - each tests/LMS/LMSautomation.<role>.spec.js
// file just logs in as its own role and calls this. Kept as one function (rather than
// duplicated per file) so a fix here doesn't need to be repeated across every file.
//
// Logs in, discovers every top-level menu and submenu list page the role actually has,
// switches through every tab a list page has (e.g. "All List"/"Awaiting Approval"),
// and on each one exercises the first row's Action control (every item inside its
// dropdown, not just "View") plus every download control on the page. Every step is
// isolated in its own try/catch so one broken button/tab/popup never costs the rest of
// the crawl, and the final assertion rolls the real pass/fail count back up into this
// test's own status.
async function runLmsRoleCrawl(page, testInfo, role) {
    const loginPage = new LmsLoginPage(page);
    const crawler = new LmsCrawlerPage(page);
    const user = users[role];
    const loginEntry = { field: `[${role}] Login`, value: user.username };

    try {
        // Start from a clean slate - no leftover session from a previous run
        await page.context().clearCookies();
        await loginPage.openLMS();
        await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} }).catch(() => {});
        await loginPage.openLMS();

        await attemptLmsLogin(page, loginPage, user);

        loginEntry.status = 'Pass';
        loginEntry.screenshotBase64 = await crawler.captureScreenshot();
        crawler.fieldReport.push(loginEntry);

        try {
            await crawler.toggleSidebar();
        } catch {
            // A single transient click failure right after login shouldn't sink the
            // whole crawl - give it one retry before giving up
            await crawler.wait(2000);
            await crawler.toggleSidebar();
        }

        const menus = await crawler.discoverTopMenus();

        for (const menu of menus) {
            let items;
            try {
                await crawler.ensureMenuOpen(menu);
                items = await crawler.discoverSubmenuItems(menu);
            } catch (err) {
                crawler.fieldReport.push({
                    field: `[${role}] ${menu}: Discover Submenu Items`,
                    value: '', status: 'Fail', error: err.message,
                    screenshotBase64: await crawler.captureScreenshot()
                });
                continue;
            }

            // Each item is isolated - one item's failure (a stale locator, a slow
            // render) must not cost every remaining item/menu
            for (const item of items) {
                let landedOnList = false;
                try {
                    await crawler.ensureMenuOpen(menu);
                    await crawler.openSubmenuItem(menu, item);
                    landedOnList = true;
                } catch (err) {
                    crawler.fieldReport.push({
                        field: `[${role}] ${menu} > ${item}: Open Page`,
                        value: '', status: 'Fail', error: err.message,
                        screenshotBase64: await crawler.captureScreenshot()
                    });
                }

                if (!landedOnList) continue;

                // Some list pages have their own secondary tabs (e.g. "All List"/
                // "Awaiting Approval") showing entirely different rows - every tab
                // found gets its own full pass of the same checks below. Pages with no
                // tabs just get a single pass (tab = null).
                let tabs = [];
                try {
                    tabs = await crawler.discoverTabs();
                } catch {
                    tabs = [];
                }
                const tabsToVisit = tabs.length ? tabs : [null];

                for (const tab of tabsToVisit) {
                    const label = tab ? `[${role}] ${menu} > ${item} > ${tab}` : `[${role}] ${menu} > ${item}`;

                    if (tab) {
                        try {
                            await crawler.switchToTab(tab);
                        } catch (err) {
                            crawler.fieldReport.push({
                                field: `${label}: Switch Tab`,
                                value: '', status: 'Fail', error: err.message,
                                screenshotBase64: await crawler.captureScreenshot()
                            });
                            continue;
                        }
                    }

                    // Exercises the first row's Action control - every item inside its
                    // dropdown (View/Edit/... , not just the first one found). Any
                    // leftover popup that didn't close on its own is handled internally.
                    try {
                        await crawler.testFirstRowAction(label, tab);
                    } catch (err) {
                        crawler.fieldReport.push({
                            field: `${label}: Action Button`,
                            value: '', status: 'Fail', error: err.message,
                            screenshotBase64: await crawler.captureScreenshot()
                        });
                    }

                    // Wherever download icons/buttons appear on this page/tab (row-level
                    // or page-level), exercise every one of them too - disabled (no
                    // data) counts as Pass, a 200 response or a real download event
                    // counts as Pass, anything else is a Fail
                    try {
                        await crawler.testDownloadIfPresent(label);
                    } catch (err) {
                        crawler.fieldReport.push({
                            field: `${label}: Download Button`,
                            value: '', status: 'Fail', error: err.message,
                            screenshotBase64: await crawler.captureScreenshot()
                        });
                    }
                }
            }
        }

        await crawler.logout().catch(() => {});
    } catch (err) {
        if (!loginEntry.status) {
            loginEntry.status = 'Fail';
            loginEntry.error = err.message;
            loginEntry.screenshotBase64 = await crawler.captureScreenshot();
            crawler.fieldReport.push(loginEntry);
        } else {
            crawler.fieldReport.push({
                field: `[${role}] Crawl`,
                value: '',
                status: 'Fail',
                error: err.message,
                screenshotBase64: await crawler.captureScreenshot()
            });
        }
    } finally {
        await testInfo.attach('field-report', {
            body: JSON.stringify(crawler.fieldReport),
            contentType: 'application/json'
        });
    }

    // Every menu/item was deliberately isolated in its own try/catch above so one broken
    // button/tab/popup doesn't cut the crawl short - but that means this function never
    // throws on its own, and the test would otherwise always report as "passed" even
    // when several individual action-button checks failed. Asserting here rolls the
    // real, granular results back up into Playwright's (and the Word report's) own
    // pass/fail status, instead of leaving it stuck on "no exception was thrown".
    const failures = crawler.fieldReport.filter(f => f.status === 'Fail');
    expect(failures, `${failures.length} of ${crawler.fieldReport.length} recorded step(s) failed:\n` +
        failures.map(f => `- ${f.field}${f.error ? ` (${f.error})` : ''}`).join('\n')
    ).toHaveLength(0);
}

module.exports = { runLmsRoleCrawl };
