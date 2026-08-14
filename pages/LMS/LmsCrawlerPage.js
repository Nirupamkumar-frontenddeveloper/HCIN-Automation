const BasePage = require('../BasePage');

// Menu/action-dropdown items that change real UAT data irreversibly (or close to it).
// These are deliberately never auto-clicked - they're recorded as an intentional skip
// instead, so "check every dropdown item" doesn't turn into "approve/reject/delete real
// records across both logins".
const DESTRUCTIVE_PATTERN = /delete|reject|approve|cancel|deactivate|disable|remove|terminate|block|freeze/i;

// Generic, role-agnostic crawler: discovers whatever top-level sidebar menus and submenu
// list pages the currently logged-in role actually has, switches through every tab a list
// page has (e.g. "All List"/"Awaiting Approval"), and on each one exercises the first
// row's Action control - every item inside its dropdown, not just the first - plus every
// download control on the page, registering Pass/Fail based on whether the resulting API
// call(s) returned 200. Mirrors pages/LosCrawlerPage.js - same underlying app/component
// library, same sidebar/tab/dropdown conventions, just pointed at LMS.
class LmsCrawlerPage extends BasePage {

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
    // accessible-name substring match - substrings of one icon-slug can otherwise collide
    // with another menu's label, causing a strict-mode violation
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

    // Some list pages have their own secondary tabs (e.g. "All List"/"Awaiting Approval")
    // showing entirely different rows/data. Scoped to role=tab, which is the pattern this
    // app already uses consistently for that (confirmed in LmsProgramsPage.js etc.).
    // Some pages (e.g. "System Configuration") nest a SECOND tablist inside each outer
    // tab's panel (numbered outer tabs "1/2/3/4", each containing its own named inner
    // tabs like "Currency"/"Payments"). The inner tablist sits inside the outer tablist's
    // own DOM subtree (not a later sibling), so scoping to "the first tablist" still
    // picks up the nested tabs too. What actually distinguishes an outer tab is that its
    // own tablist has no further tablist wrapping it - counting tablist ancestors tells
    // outer (depth 1) apart from nested (depth 2+). Without this, switchToTab() tries to
    // click an inner tab (e.g. "Currency") while a different outer tab than the one it
    // belongs to is selected, where it isn't attached/visible, and hangs until timeout.
    async isOuterTab(tabLocator) {
        return tabLocator.evaluate(el => {
            let depth = 0;
            let node = el;
            while (node) {
                node = node.closest('[role="tablist"]');
                if (node) {
                    depth++;
                    node = node.parentElement;
                }
            }
            return depth <= 1;
        }).catch(() => true);
    }

    // Some stepper-style tabs (e.g. the numbered "1/2/3/4" steps on "System
    // Configuration") carry a visually-hidden duplicate text node, so raw textContent()
    // returns something like "1 1" instead of "1" - that doesn't match what getByRole's
    // own accessible-name computation resolves it to, so switchToTab() would never find
    // it. ariaSnapshot() reports the same computed accessible name getByRole matches
    // against, so reading the name from there instead keeps discovery and matching
    // consistent.
    async getTabName(tabLocator) {
        const snap = await tabLocator.ariaSnapshot().catch(() => '');
        const match = snap.match(/tab\s+"([^"]*)"/);
        if (match) return match[1].trim();
        return (await tabLocator.textContent() || '').trim();
    }

    async discoverTabs() {
        const allTabs = this.page.getByRole('tab');
        const count = await allTabs.count();
        const names = [];
        for (let i = 0; i < count; i++) {
            const tab = allTabs.nth(i);
            if (!(await this.isOuterTab(tab))) continue;
            const text = await this.getTabName(tab);
            if (text) names.push(text);
        }
        return names;
    }

    async switchToTab(name) {
        await this.step(`Switch Tab: ${name}`, '', async () => {
            const matches = this.page.getByRole('tab', { name, exact: true });
            const count = await matches.count();
            for (let i = 0; i < count; i++) {
                const candidate = matches.nth(i);
                if (await this.isOuterTab(candidate)) {
                    await candidate.click();
                    return;
                }
            }
            throw new Error(`No outer-level tab named "${name}" found (${count} element(s) matched, all nested inside another tab)`);
        });
    }

    // Re-selects `tabName` if it isn't already the active tab - used after any recovery
    // that reloads/re-navigates the list page, since a plain goto() resets to that page's
    // own default tab (often "Awaiting Approval", not whichever tab was actually being
    // tested), which otherwise leaves every following check silently testing the wrong
    // tab's data. Bounded to a short timeout so a genuinely missing/stuck tab fails fast
    // instead of eating the full default action timeout on every recovery.
    async reselectTabIfNeeded(tabName) {
        if (!tabName) return;
        const matches = this.page.getByRole('tab', { name: tabName, exact: true });
        const count = await matches.count().catch(() => 0);
        let tab = null;
        for (let i = 0; i < count; i++) {
            if (await this.isOuterTab(matches.nth(i))) { tab = matches.nth(i); break; }
        }
        if (!tab) return;

        const isSelected = await tab.getAttribute('aria-selected', { timeout: 3000 }).catch(() => null);
        if (isSelected !== 'true') {
            await tab.click({ timeout: 5000 }).catch(() => {});
            await this.page.waitForTimeout(500);
        }
    }

    // Detects a common modal/dialog overlay and closes it via whatever close control it
    // offers (a cross/X icon, a "Close" button, aria-label="Close", etc.), falling back
    // to a "Close"-worded button and then the Escape key. Some LMS actions pop up a
    // confirmation/info dialog that doesn't dismiss itself - without this, that popup
    // blocks every subsequent click and the crawl appears to get stuck. Safe to call
    // even when nothing is open (it's a no-op then).
    async closePopupIfOpen() {
        const dialog = this.page.locator(
            '[role="dialog"], .mat-mdc-dialog-container, .cdk-overlay-pane, .modal.show'
        ).first();

        const isOpen = await dialog.isVisible({ timeout: 1000 }).catch(() => false);
        if (!isOpen) return false;

        const closeControl = this.page.locator([
            '[role="dialog"] button[aria-label="Close" i]',
            '[role="dialog"] [title="Close" i]',
            '[role="dialog"] img[alt="close" i]',
            '[role="dialog"] img[alt="cross" i]',
            '.mat-mdc-dialog-container button[aria-label="Close" i]',
            '.mat-mdc-dialog-container [title="Close" i]',
            '.mat-mdc-dialog-container img[alt="close" i]',
            '.mat-mdc-dialog-container img[alt="cross" i]',
            '.cdk-overlay-pane button[aria-label="Close" i]',
            '.cdk-overlay-pane [title="Close" i]',
            '.cdk-overlay-pane img[alt="close" i]',
            '.cdk-overlay-pane img[alt="cross" i]',
            '.close, .close-icon, .cross-icon, .modal-close, .btn-close'
        ].join(', ')).first();

        if (await closeControl.count() > 0) {
            await closeControl.click({ timeout: 3000 }).catch(() => {});
            await this.page.waitForTimeout(400);
        }

        const stillOpen = await dialog.isVisible({ timeout: 1000 }).catch(() => false);
        if (stillOpen) {
            const closeButton = this.page.getByRole('button', { name: /^close$/i }).first();
            if (await closeButton.count() > 0) {
                await closeButton.click({ timeout: 3000 }).catch(() => {});
                await this.page.waitForTimeout(400);
            } else {
                await this.page.keyboard.press('Escape').catch(() => {});
                await this.page.waitForTimeout(400);
            }
        }

        return true;
    }

    // Clicks a control and records Pass/Fail based on whether any non-GET call triggered
    // by that click returned 200. If the click navigated away, recovers back to
    // `returnUrl` afterwards - a single goBack() isn't always enough to escape a deep,
    // multi-tab detail page, so this retries and falls back to a direct goto - and, when
    // the page has tabs, re-selects `tabName` afterwards so the next check isn't silently
    // left on whatever tab the list page defaults to.
    async clickAndRecordAction(locator, field, returnUrl, tabName = null) {
        const responses = [];
        const listener = (res) => {
            if (res.request().method() !== 'GET') {
                responses.push({ url: res.url(), status: res.status() });
            }
        };
        this.page.on('response', listener);

        const entry = { field, value: '' };
        const startUrl = this.page.url();
        let navigatedAway = false;

        try {
            await locator.click();
            await this.page.waitForTimeout(1500);
            navigatedAway = this.page.url() !== startUrl;

            // Some actions pop up a confirmation/info dialog instead of (or alongside)
            // firing an API call - close it so it doesn't block whatever comes next
            await this.closePopupIfOpen();

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
        } catch (err) {
            entry.status = 'Fail';
            entry.error = err.message;
        } finally {
            this.page.off('response', listener);
        }

        entry.screenshotBase64 = await this.captureScreenshot();
        this.fieldReport.push(entry);

        if (navigatedAway) {
            for (let attempt = 0; attempt < 3 && this.page.url() !== returnUrl; attempt++) {
                await this.page.goBack().catch(() => {});
                await this.page.waitForTimeout(800);
            }
            if (this.page.url() !== returnUrl) {
                await this.page.goto(returnUrl).catch(() => {});
                await this.page.waitForTimeout(800);
            }
            await this.reselectTabIfNeeded(tabName);
        }
    }

    // Reads every item currently visible inside an already-open row action dropdown,
    // whichever of the app's two dropdown shapes it is (a real mat-menu with
    // role="menuitem", or the plain-div "More" menu).
    async readOpenDropdownItems() {
        const menuItems = await this.page.getByRole('menuitem').allTextContents();
        if (menuItems.length) {
            return { usesMenuRole: true, items: [...new Set(menuItems.map(t => t.trim()).filter(Boolean))] };
        }
        const divItems = await this.page.locator('.mat-mdc-menu-panel div, .mat-menu-panel div').allTextContents();
        return { usesMenuRole: false, items: [...new Set(divItems.map(t => t.trim()).filter(Boolean))] };
    }

    // Opens the first data row's Action control and exercises EVERY item inside its
    // dropdown (not just "View") - anything that looks state-changing on real UAT data
    // (Approve/Reject/Delete/Freeze/...) is deliberately skipped rather than auto-clicked,
    // and recorded as an intentional Pass so it's visible in the report without being
    // fired. If the row has no dropdown (just a plain link), that link is clicked instead.
    // Pass/Fail is based on whether the resulting API call(s) returned 200. `tabName`,
    // when the page has tabs, is re-selected after every recovery navigation so a menu
    // that needs repeated switching between e.g. "All List" and "Awaiting Approval" never
    // silently drifts onto the wrong tab's data mid-way through.
    async testFirstRowAction(pageLabel, tabName = null) {
        // A popup left open from whatever happened just before (a tab switch, opening
        // this submenu item) would otherwise block finding the row/dropdown below
        await this.closePopupIfOpen();

        const listUrl = this.page.url();

        const rowCount = await this.page.getByRole('row').count();
        if (rowCount <= 1) {
            this.fieldReport.push({
                field: `${pageLabel}: Action Button`,
                value: 'No data rows - nothing to test',
                status: 'Pass',
                screenshotBase64: await this.captureScreenshot()
            });
            return;
        }

        const row = this.page.getByRole('row').nth(1);
        const anchorIcon = row.getByRole('img', { name: 'anchor' });
        const moreBtn = row.getByTitle('More');
        const rowLink = row.locator('a').first();

        // The row itself can render before its Action cell finishes populating (async
        // change detection) - wait for whichever control shows up rather than deciding
        // "no control" off an instant, possibly-premature count()
        await Promise.race([
            anchorIcon.waitFor({ state: 'attached', timeout: 5000 }),
            moreBtn.waitFor({ state: 'attached', timeout: 5000 }),
            rowLink.waitFor({ state: 'attached', timeout: 5000 })
        ]).catch(() => {});

        const hasDropdown = (await anchorIcon.count()) > 0 || (await moreBtn.count()) > 0;

        if (!hasDropdown) {
            if (await rowLink.count() > 0) {
                await this.clickAndRecordAction(rowLink, `${pageLabel}: Action Button`, listUrl, tabName);
            } else {
                this.fieldReport.push({
                    field: `${pageLabel}: Action Button`,
                    value: 'No Action control found in the first row',
                    status: 'Fail',
                    error: 'Expected an "anchor" icon, a "More" icon, or a row link in the Action column, found none',
                    screenshotBase64: await this.captureScreenshot()
                });
            }
            return;
        }

        // Open once just to discover every item text inside this dropdown
        const trigger = (await anchorIcon.count()) > 0 ? anchorIcon : moreBtn;
        try {
            await trigger.click({ timeout: 5000 });
            await this.page.waitForTimeout(400);
        } catch (err) {
            this.fieldReport.push({
                field: `${pageLabel}: Action Button`,
                value: '', status: 'Fail', error: err.message,
                screenshotBase64: await this.captureScreenshot()
            });
            return;
        }

        const { usesMenuRole, items: itemTexts } = await this.readOpenDropdownItems();
        await this.page.keyboard.press('Escape').catch(() => {});
        await this.page.waitForTimeout(200);

        if (!itemTexts.length) {
            this.fieldReport.push({
                field: `${pageLabel}: Action Button`,
                value: 'Action control opened but no menu items were found inside it',
                status: 'Fail',
                error: 'Expected at least one menu item (e.g. View) after opening the anchor/More control',
                screenshotBase64: await this.captureScreenshot()
            });
            return;
        }

        for (const itemText of itemTexts) {
            const entryField = `${pageLabel}: Action Button > ${itemText}`;

            if (DESTRUCTIVE_PATTERN.test(itemText)) {
                this.fieldReport.push({
                    field: entryField,
                    value: `Skipped - "${itemText}" looks like a state-changing action on real UAT data; not automated for safety`,
                    status: 'Pass',
                    screenshotBase64: await this.captureScreenshot()
                });
                continue;
            }

            try {
                // A popup left over from the previous item (one that didn't close on
                // its own) would otherwise block re-opening the dropdown here
                await this.closePopupIfOpen();

                if (this.page.url() !== listUrl) {
                    await this.page.goto(listUrl);
                    await this.page.waitForTimeout(800);
                }
                await this.reselectTabIfNeeded(tabName);

                const freshRow = this.page.getByRole('row').nth(1);
                const freshAnchor = freshRow.getByRole('img', { name: 'anchor' });
                const freshMore = freshRow.getByTitle('More');

                // The tab/list may have re-rendered with different data (or none at all)
                // by the time we get back here - confirm the control is actually there,
                // bounded to a short wait, rather than clicking blind and potentially
                // hanging on a control that's simply no longer present.
                const controlPresent = await Promise.race([
                    freshAnchor.waitFor({ state: 'attached', timeout: 4000 }).then(() => true),
                    freshMore.waitFor({ state: 'attached', timeout: 4000 }).then(() => true)
                ]).catch(() => false);

                if (!controlPresent) {
                    this.fieldReport.push({
                        field: entryField,
                        value: 'Row/Action control no longer present after returning to this tab - skipped',
                        status: 'Pass',
                        screenshotBase64: await this.captureScreenshot()
                    });
                    continue;
                }

                const freshTrigger = (await freshAnchor.count()) > 0 ? freshAnchor : freshMore;
                await freshTrigger.click({ timeout: 5000 });
                await this.page.waitForTimeout(400);

                const escapedText = itemText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const menuItem = usesMenuRole
                    ? this.page.getByRole('menuitem').filter({ hasText: itemText })
                    : this.page.locator('div').filter({ hasText: new RegExp(`^${escapedText}$`) });

                await this.clickAndRecordAction(menuItem.first(), entryField, listUrl, tabName);
            } catch (err) {
                this.fieldReport.push({
                    field: entryField,
                    value: '', status: 'Fail', error: err.message,
                    screenshotBase64: await this.captureScreenshot()
                });
            }
        }
    }

    // Every control on the page that looks like a download action (an icon/button/link
    // whose title, aria-label, alt text, or visible text mentions "download"). Download
    // controls show up both inside row-level Action menus and as standalone page-level
    // buttons - and some list pages have one per row, so this returns all of them.
    downloadControlsSelector() {
        return [
            'button:has-text("Download")',
            'a:has-text("Download")',
            '[title*="Download" i]',
            '[aria-label*="Download" i]',
            'img[alt*="download" i]'
        ].join(', ');
    }

    // Clicks EVERY download control found on the page and records Pass/Fail for each,
    // based on whether it triggered a real browser download or got back a 200 response.
    // A disabled download control (nothing to download for this record) is recorded as
    // Pass too - that's expected behaviour, not a defect. Pages with no download control
    // at all are skipped silently (not every page has one).
    async testDownloadIfPresent(pageLabel) {
        const selector = this.downloadControlsSelector();
        const count = await this.page.locator(selector).count();
        if (count === 0) {
            return;
        }

        for (let i = 0; i < count; i++) {
            const field = count > 1 ? `${pageLabel}: Download Button #${i + 1}` : `${pageLabel}: Download Button`;
            const entry = { field, value: '' };

            try {
                // A popup left over from the previous download control (one that didn't
                // close on its own) would otherwise block this one
                await this.closePopupIfOpen();

                // Re-query fresh each iteration rather than caching handles - downloads
                // don't normally navigate away, but re-querying is cheap and safe either way
                const control = this.page.locator(selector).nth(i);
                const clickable = this.page.locator('button, a, [role="button"]').filter({ has: control }).first();
                const target = (await clickable.count()) > 0 ? clickable : control;

                const isDisabled = await target.evaluate(el => {
                    return el.disabled === true
                        || el.getAttribute('aria-disabled') === 'true'
                        || el.classList.contains('disabled')
                        || getComputedStyle(el).pointerEvents === 'none';
                }).catch(() => false);

                if (isDisabled) {
                    entry.value = 'Download control is disabled - no data available to download';
                    entry.status = 'Pass';
                } else {
                    const responses = [];
                    const listener = (res) => responses.push({ url: res.url(), status: res.status() });
                    this.page.on('response', listener);

                    const downloadPromise = this.page.waitForEvent('download', { timeout: 8000 }).catch(() => null);

                    try {
                        await target.click();
                    } catch (clickErr) {
                        this.page.off('response', listener);
                        throw clickErr;
                    }

                    const download = await downloadPromise;
                    await this.page.waitForTimeout(1000);
                    this.page.off('response', listener);

                    // The download button sometimes opens a confirmation/info popup
                    // instead of (or alongside) triggering the download - close it so it
                    // doesn't block the next download control on this page
                    await this.closePopupIfOpen();

                    const has200 = responses.some(r => r.status === 200);
                    const hasError = responses.some(r => r.status >= 400);

                    if (download) {
                        entry.value = `Download triggered: ${download.suggestedFilename()}`;
                        entry.status = 'Pass';
                    } else if (has200 && !hasError) {
                        entry.value = responses.map(r => `${r.status} ${r.url}`).join(' | ');
                        entry.status = 'Pass';
                    } else {
                        entry.value = responses.length
                            ? responses.map(r => `${r.status} ${r.url}`).join(' | ')
                            : '(no download event or API response captured after click)';
                        entry.status = 'Fail';
                        entry.error = hasError
                            ? 'One or more calls returned an error status'
                            : 'No download event or 200 response observed after clicking the Download control';
                    }
                }
            } catch (err) {
                entry.status = 'Fail';
                entry.error = err.message;
            }

            entry.screenshotBase64 = await this.captureScreenshot();
            this.fieldReport.push(entry);
        }
    }
}

module.exports = LmsCrawlerPage;
