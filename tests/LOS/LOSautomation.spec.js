require('dotenv').config();

const { test, expect } = require('@playwright/test');
const LoginPage = require('../../pages/LoginPage');
const LosCrawlerPage = require('../../pages/LosCrawlerPage');
const users = require('../../utils/users');

// Every LOS role - each one is logged into separately, and its sidebar menus/submenus
// are discovered live (not hardcoded), since different roles see different menus
// (e.g. Credit Underwriter has "Underwriting Module"/"Reports" instead of "Leads"/"Cases")
const ROLES = ['salesRM', 'salesSupervisor', 'creditUW', 'opsMaker', 'opsChecker', 'creditHead', 'itApplicationManager', 'itHead'];

test('LOS Complete Action Button Crawl - All Logins', {
    annotation: {
        type: 'description',
        description: 'Logs into LOS as every configured role (Sales RM, Sales Supervisor, Credit Underwriter, Ops Maker, Ops Checker, Credit Head, IT Application Manager, IT Head) one at a time. For each role, it opens the sidebar, discovers every top-level menu and submenu list page that role actually has, and on each one clicks the first row\'s Action control (an "anchor" icon menu, a "More" icon menu, or a row link) - registering Pass if the resulting API call(s) returned 200, Fail otherwise. Pages with no data rows are recorded as Pass ("nothing to test"). A role whose login fails or whose crawl hits an unrecoverable error is recorded as Fail and the run continues on to the next role.'
    }
}, async ({ page }, testInfo) => {

    test.setTimeout(20 * 60 * 1000);

    const loginPage = new LoginPage(page);
    const crawler = new LosCrawlerPage(page);

    try {
        for (const role of ROLES) {
            const user = users[role];
            const loginEntry = { field: `[${role}] Login`, value: user.username };

            try {
                // Start every role from a clean slate - a prior role's session must not
                // leak into this one
                await page.context().clearCookies();
                await loginPage.openLOS();
                await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} }).catch(() => {});
                await loginPage.openLOS();

                await loginPage.login(user.username, user.password);

                const loginFailed = await page.getByText('The ID or password is incorrect!').isVisible({ timeout: 5000 }).catch(() => false);
                if (loginFailed) {
                    throw new Error(`Login failed for role "${role}" (username: ${user.username}) - "The ID or password is incorrect!"`);
                }

                loginEntry.status = 'Pass';
                loginEntry.screenshotBase64 = await crawler.captureScreenshot();
                crawler.fieldReport.push(loginEntry);

                try {
                    await crawler.toggleSidebar();
                } catch {
                    // A single transient click failure right after login shouldn't sink
                    // this whole role's crawl - give it one retry before giving up
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
                    // render) must not cost every remaining item/menu for this role
                    for (const item of items) {
                        try {
                            await crawler.ensureMenuOpen(menu);
                            await crawler.openSubmenuItem(menu, item);
                            await crawler.testFirstRowAction(`[${role}] ${menu} > ${item}`);
                        } catch (err) {
                            crawler.fieldReport.push({
                                field: `[${role}] ${menu} > ${item}: Action Button`,
                                value: '', status: 'Fail', error: err.message,
                                screenshotBase64: await crawler.captureScreenshot()
                            });
                        }
                    }
                }

                await loginPage.logout().catch(() => {});
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
            }
        }
    } finally {
        await testInfo.attach('field-report', {
            body: JSON.stringify(crawler.fieldReport),
            contentType: 'application/json'
        });
    }

    // Every menu/item was deliberately isolated in its own try/catch above so one broken
    // login or action button doesn't cut the crawl short - but that means this test
    // function never throws on its own, and would otherwise always report as "passed"
    // even when dozens of individual action-button checks failed. Asserting here rolls
    // the real, granular results back up into Playwright's (and the Word report's) own
    // pass/fail status, instead of leaving it stuck on "no exception was thrown".
    const failures = crawler.fieldReport.filter(f => f.status === 'Fail');
    expect(failures, `${failures.length} of ${crawler.fieldReport.length} recorded step(s) failed:\n` +
        failures.map(f => `- ${f.field}${f.error ? ` (${f.error})` : ''}`).join('\n')
    ).toHaveLength(0);

});
