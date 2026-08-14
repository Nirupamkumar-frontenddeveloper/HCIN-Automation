const BasePage = require('./BasePage');

// Generic, role-agnostic crawler: discovers whatever top-level sidebar menus and submenu
// list pages the currently logged-in role actually has (different roles see different
// menus - e.g. Credit Underwriter has "Underwriting Module"/"Reports" instead of "Leads"/
// "Cases"), and for each list page clicks the first row's Action button (whatever form it
// takes - an "anchor" icon menu, a "More" icon menu, or a direct link), registering Pass/
// Fail based on whether the resulting API call(s) returned 200.
class LosCrawlerPage extends BasePage {

    // The sidebar has two <nav> landmarks - the top bar (notifications/logo) and the
    // actual menu list. Scoping to the second one excludes "toggle sidebar" and the topbar.
    sidebarNav() {
        return this.page.getByRole('navigation').nth(1);
    }

    // Returns the exact visible text of every expandable top-level menu (Dashboard and
    // Logout aren't real <button> elements in this app, so they're naturally excluded)
    async discoverTopMenus() {
        const buttons = await this.sidebarNav().getByRole('button').all();
        const names = [];
        for (const b of buttons) {
            const text = (await b.textContent() || '').trim();
            if (text) names.push(text);
        }
        return names;
    }

    // Re-locates the button for a given menu name by exact text match rather than
    // accessible-name substring match - "Onboarding" is otherwise a substring of the
    // "Leads" menu's icon-slug ("counterparty-onboarding Leads"), which previously caused
    // a strict-mode collision
    async findTopMenuButton(name) {
        const buttons = await this.sidebarNav().getByRole('button').all();
        for (const b of buttons) {
            const text = (await b.textContent() || '').trim();
            if (text === name) return b;
        }
        return null;
    }

    // Idempotent - clicking an already-expanded menu button toggles it closed, so this
    // only clicks if it isn't already expanded. Drilling into a row's "View" action can land
    // on a deep detail page that collapses the sidebar back to icon-only (and can even swap
    // the menu buttons out for plain non-button icons) on return, so this re-expands the
    // sidebar and re-locates the button fresh whenever it isn't found.
    async ensureMenuOpen(name) {
        await this.step(`Expand Menu: ${name}`, '', async () => {
            let btn = await this.findTopMenuButton(name);
            if (!btn) {
                await this.toggleSidebar();
                await this.page.waitForTimeout(500);
                btn = await this.findTopMenuButton(name);
            }
            if (!btn) {
                throw new Error(`Top-level menu "${name}" not found in sidebar even after re-expanding it`);
            }
            await btn.waitFor({ state: 'visible', timeout: 10000 });
            const expanded = await btn.getAttribute('aria-expanded');
            if (expanded !== 'true') {
                await btn.click();
                await this.page.waitForTimeout(400);
            }
        });
    }

    // Reads the actual submenu item labels for an already-open menu, instead of assuming
    // a fixed static list - different roles have different items under the same menu name
    async discoverSubmenuItems(name) {
        const region = this.page.getByLabel(name, { exact: true });
        const items = await region.locator('div.menu-item-child').allTextContents();
        return items.map(t => t.trim()).filter(Boolean);
    }

    // Scoped to the menu's labelled region - an unscoped text match is ambiguous
    // (a hidden CDK tooltip element duplicates the same text)
    async openSubmenuItem(menuLabel, itemText) {
        await this.step(`Open Submenu: ${itemText}`, '', () => this.page.getByLabel(menuLabel, { exact: true }).getByText(itemText, { exact: true }).click());
    }

    // Clicks the first data row's Action control (anchor-icon menu > View, a "More"
    // icon menu > View, or - if neither exists - a direct row link) and records
    // Pass/Fail based on whether any POST/PUT call triggered by that click returned 200.
    async testFirstRowAction(pageLabel) {
        const responses = [];
        const listener = (res) => {
            if (res.request().method() !== 'GET') {
                responses.push({ url: res.url(), status: res.status() });
            }
        };
        this.page.on('response', listener);

        const entry = { field: `${pageLabel}: Action Button`, value: '' };
        const startUrl = this.page.url();
        let navigatedAway = false;

        try {
            const rowCount = await this.page.getByRole('row').count();

            if (rowCount <= 1) {
                entry.value = 'No data rows - nothing to test';
                entry.status = 'Pass';
            } else {
                const row = this.page.getByRole('row').nth(1);
                const anchorIcon = row.getByRole('img', { name: 'anchor' });
                const moreBtn = row.getByTitle('More');
                const rowLink = row.locator('a').first();

                // The row itself can render before its Action cell finishes populating
                // (async change detection) - wait for whichever control shows up rather
                // than deciding "no control" off an instant, possibly-premature count()
                await Promise.race([
                    anchorIcon.waitFor({ state: 'attached', timeout: 5000 }),
                    moreBtn.waitFor({ state: 'attached', timeout: 5000 }),
                    rowLink.waitFor({ state: 'attached', timeout: 5000 })
                ]).catch(() => {});

                if (await anchorIcon.count() > 0) {
                    await anchorIcon.click();
                    await this.page.waitForTimeout(400);
                    const viewItem = this.page.getByRole('menuitem').filter({ hasText: 'View' });
                    if (await viewItem.count() > 0) {
                        await viewItem.first().click();
                        navigatedAway = true;
                    }
                } else if (await moreBtn.count() > 0) {
                    await moreBtn.click();
                    await this.page.waitForTimeout(400);
                    const viewItem = this.page.locator('div').filter({ hasText: /^View$/ });
                    if (await viewItem.count() > 0) {
                        await viewItem.first().click();
                        navigatedAway = true;
                    }
                } else {
                    const link = rowLink;
                    if (await link.count() > 0) {
                        await link.click();
                        navigatedAway = true;
                    } else {
                        entry.value = 'No Action control found in the first row';
                        entry.status = 'Fail';
                        entry.error = 'Expected an "anchor" icon, a "More" icon, or a row link in the Action column, found none';
                    }
                }

                if (entry.status !== 'Fail') {
                    await this.page.waitForTimeout(1500);
                    const has200 = responses.some(r => r.status === 200);
                    const hasError = responses.some(r => r.status >= 400);
                    entry.value = responses.length
                        ? responses.map(r => `${r.status} ${r.url}`).join(' | ')
                        : '(no API call captured after click)';
                    entry.status = (has200 && !hasError) ? 'Pass' : 'Fail';
                    if (!has200) {
                        entry.error = hasError
                            ? 'One or more calls returned an error status'
                            : 'No 200 response observed after clicking the Action control';
                    }
                }
            }
        } catch (err) {
            entry.status = 'Fail';
            entry.error = err.message;
        } finally {
            this.page.off('response', listener);
        }

        entry.screenshotBase64 = await this.captureScreenshot();
        this.fieldReport.push(entry);

        if (navigatedAway) {
            // A "View" click can drill into a deep multi-tab detail page - a single
            // goBack() isn't always enough to undo it, so retry until the URL matches
            // where we started, falling back to a direct goto as a last resort.
            for (let attempt = 0; attempt < 3 && this.page.url() !== startUrl; attempt++) {
                await this.page.goBack().catch(() => {});
                await this.page.waitForTimeout(800);
            }
            if (this.page.url() !== startUrl) {
                await this.page.goto(startUrl).catch(() => {});
                await this.page.waitForTimeout(800);
            }
        }
    }
}

module.exports = LosCrawlerPage;
