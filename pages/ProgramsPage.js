const BasePage = require('./BasePage');

// Page object for the Programs module - view a program's detail sections and
// edit another through its full step wizard, a pure navigation flow (no new data created)
class ProgramsPage extends BasePage {

    async openProgramsMenu() {
        await this.step('Open Programs Menu', '', () => this.page.getByRole('button', { name: 'programs Programs' }).click());
    }

    async openAllPrograms() {
        await this.step('Open All Programs', '', () => this.page.getByLabel('Programs').locator('div').filter({ hasText: /^All Programs$/ }).click());
    }

    // Same "All Programs" entry, but for screens where it isn't scoped under a
    // labelled Programs region (e.g. the Credit Underwriter's sidebar)
    async openAllProgramsMenu() {
        await this.step('Open All Programs', '', () => this.page.locator('div').filter({ hasText: /^All Programs$/ }).nth(3).click());
    }

    // Same "All Programs" entry again, but for the Sales Supervisor role - their
    // Programs submenu only has this one item (no "Add Programs"), which changes the
    // surrounding DOM enough that openAllPrograms()'s locator matches an extra
    // wrapping ancestor and becomes ambiguous
    async openAllProgramsForSupervisor() {
        await this.step('Open All Programs', '', () => this.page.locator('div.menu-item-child').filter({ hasText: /^All Programs$/ }).click());
    }

    async openAllListTab() {
        await this.step('Open All List Tab', '', () => this.page.getByRole('tab', { name: 'All List' }).click());
    }

    async openProgramRow(rowName) {
        await this.step('Open Program Row', rowName, () => this.page.getByRole('row', { name: rowName }).locator('a').click());
    }

    async clickView() {
        await this.step('View Program', '', () => this.page.locator('div').filter({ hasText: /^View$/ }).click());
    }

    // View via the row's context menu (as opposed to clickView's direct View button) -
    // needed when the row opens a dropdown where "View" text also appears in several
    // wrapping overlay elements, making the plain div-text locator ambiguous
    async clickViewMenuItem() {
        await this.step('View Program (menu)', '', () => this.page.getByRole('menuitem').locator('div').filter({ hasText: 'View' }).click());
    }

    async openStructureStep() {
        await this.step('Open Structure Step', '', () => this.page.getByText('2 Structure').click());
    }

    // Same Structure step, but for view-only screens where it's plain text without
    // the wizard step number (e.g. the Credit Underwriter's program view)
    async openStructureTab() {
        await this.step('Open Structure Tab', '', () => this.page.getByText('Structure').click());
    }

    async openFinancingTab() {
        await this.step('Open Financing Tab', '', () => this.page.getByText('Financing', { exact: true }).click());
    }

    async openOtherTab() {
        await this.step('Open Other Tab', '', () => this.page.getByRole('tab', { name: 'Other' }).click());
    }

    // Same Other tab, but for screens where it's plain text rather than a tab role
    // (e.g. the Credit Underwriter's program view)
    async openOtherTabText() {
        await this.step('Open Other Tab', '', () => this.page.getByText('Other').click());
    }

    async clickBackButton() {
        await this.step('Back', '', () => this.page.getByRole('button', { name: 'Back' }).click());
    }

    async clickEditFromList() {
        await this.step('Edit Program (from list)', '', () => this.page.locator('div').filter({ hasText: /^Edit$/ }).click());
    }

    async clickNext() {
        await this.step('Next', '', () => this.page.getByRole('button', { name: 'Next' }).click());
    }

    async clickSubmit() {
        await this.step('Submit', '', () => this.page.getByRole('button', { name: 'Submit' }).click());
    }

    // Clicks "Next" through the whole edit wizard before the final Submit
    async goThroughWizard(steps) {
        for (let i = 0; i < steps; i++) {
            await this.clickNext();
        }
    }

    // ---------------------------------------------------------------------------
    // Create Program (Basic > Financing tabs). "Next"/"Submit" above are reused as-is.
    // ---------------------------------------------------------------------------

    // The create-form's own top-level tabs (distinct from openFinancingTab()/
    // openOtherTab() above, which target a different, view/edit-program screen)
    async switchToBasicTab() {
        await this.step('Switch to Basic Tab', '', () => this.page.getByRole('tab', { name: 'Basic' }).click());
    }

    async switchToFinancingTab() {
        await this.step('Switch to Financing Tab', '', () => this.page.getByRole('tab', { name: 'Financing' }).click());
    }

    async clickAddProgramLink() {
        await this.step('Open Add Program', '', () => this.page.getByRole('link', { name: 'Add Program' }).click());
    }

    // Opens a mat-select combobox, retrying the click if an overlapping label swallows
    // the first attempt (a known flaky pattern with this app's Angular Material selects)
    async openSelectWithRetry(combo) {
        for (let attempt = 0; attempt < 5; attempt++) {
            await combo.click({ force: true }).catch(() => {});
            const opened = await this.page.getByRole('option').first().waitFor({ state: 'visible', timeout: 2000 }).then(() => true).catch(() => false);
            if (opened) return;
        }
    }

    // Types into "Search PAN or OEM Name" and picks the option matching the search text -
    // the dropdown can briefly show stale/cached suggestions before the debounced search
    // resolves, so this waits for and clicks an option that actually contains the search
    // text (never blindly ".first()"), then confirms OEM Name auto-populated to match
    async selectAnchorByPanSearch(searchText) {
        await this.step('Search PAN or OEM Name', searchText, async () => {
            const panSearch = this.page.getByRole('combobox', { name: 'Search PAN or OEM Name *' });
            await panSearch.click();
            await panSearch.fill(searchText);

            const matchingOption = this.page.getByRole('option').filter({ hasText: new RegExp(searchText, 'i') });
            await matchingOption.first().waitFor({ state: 'visible' });
            const optionText = await matchingOption.first().textContent();
            await matchingOption.first().click();

            const oemName = await this.page.getByRole('textbox', { name: 'OEM Name *' }).inputValue();
            if (!oemName || !oemName.toLowerCase().includes(searchText.toLowerCase())) {
                throw new Error(`OEM Name "${oemName}" does not match search text "${searchText}" (selected option: "${optionText}")`);
            }
        });
    }

    async selectProductType(value) {
        await this.step('Product Type', value, async () => {
            await this.openSelectWithRetry(this.page.getByRole('combobox', { name: 'Product Type *' }));
            await this.page.getByRole('option', { name: value, exact: true }).click();
        });
    }

    async selectBillingType(value) {
        await this.step('Billing Type', value, async () => {
            await this.openSelectWithRetry(this.page.getByRole('combobox', { name: 'Billing Type *' }));
            await this.page.getByRole('option', { name: value, exact: true }).click();
        });
    }

    async fillProgramName(name) {
        await this.step('Program Name', name, () => this.page.getByRole('textbox', { name: 'Program Name *' }).fill(name));
    }

    async fillProgramSizeLimit(amount) {
        await this.step('Program/Size Limit', amount, () => this.page.getByRole('textbox', { name: 'Program/Size Limit *' }).fill(amount));
    }

    async fillMaxTenor(months) {
        await this.step('Max Tenor (In Months)', months, () => this.page.getByRole('spinbutton', { name: 'Max Tenor (In Months) *' }).fill(months));
    }

    async fillDealerMinLimit(amount) {
        await this.step('Dealer Min Limit', amount, () => this.page.getByRole('textbox', { name: 'Dealer Min Limit *' }).fill(amount));
    }

    async fillDealerMaxLimit(amount) {
        await this.step('Dealer Max Limit', amount, () => this.page.getByRole('textbox', { name: 'Dealer Max Limit *' }).fill(amount));
    }

    async fillMinVintage(months) {
        await this.step('Min. Vintage with OEM (In Months)', months, () => this.page.getByRole('spinbutton', { name: 'Min. Vintage with OEM (In Months) *' }).fill(months));
    }

    // Typing a date directly into these fields does NOT commit it into the Angular
    // datepicker's form control (confirmed: the value silently resets to empty the
    // moment you leave the tab, even after a blur) - it must be set via the calendar
    // picker UI. Field order on the Basic tab: MOU Effective Date(0), Offer Closing
    // Date(1), Sanctioned date(2), Offer letter Date(3).
    async pickDateViaCalendar(calendarIndex, { day, month, year }) {
        const calendarButtons = this.page.getByRole('button', { name: 'Open calendar' });
        await calendarButtons.nth(calendarIndex).click();
        await this.page.getByRole('button', { name: `${day} ${month} ${year}`, exact: true }).click();
    }

    async pickOfferClosingDate({ day, month, year }) {
        await this.step('Offer Closing Date', `${day} ${month} ${year}`, () => this.pickDateViaCalendar(1, { day, month, year }));
    }

    async pickSanctionedDate({ day, month, year }) {
        await this.step('Sanctioned date', `${day} ${month} ${year}`, () => this.pickDateViaCalendar(2, { day, month, year }));
    }

    async fillFinancingTenor(months) {
        await this.step('Tenor (In Months)', months, () => this.page.getByRole('spinbutton', { name: 'Tenor (In Months) *' }).fill(months));
    }

    async openInterestTab() {
        await this.step('Open Interest Tab', '', () => this.page.getByRole('tab', { name: 'Interest' }).click());
    }

    async fillInterestRoi(percent) {
        await this.step('ROI (In %)', percent, () => this.page.getByRole('spinbutton', { name: 'ROI (In %) *' }).fill(percent));
    }

    async openChargesTab() {
        await this.step('Open Charges Tab', '', () => this.page.getByRole('tab', { name: 'Charges' }).click());
    }

    // Fills every charge/fee amount-or-percentage field with a default value, then
    // overrides the last one (Processing Fee, under Fees Information) with its own
    // confirmed limit - Processing Fee's "Charges In Percentage" caps at 0.25%, unlike
    // the other charge rows. Accessible names on these spinbuttons are unreliable (they
    // concatenate sibling label text across rows), so rows are targeted positionally.
    async fillCharges(defaultValue, processingFeeValue) {
        await this.step('Charges (all rows)', defaultValue, async () => {
            const chargeSpinbuttons = await this.page.getByRole('spinbutton').all();
            for (const sb of chargeSpinbuttons) {
                await sb.fill(defaultValue);
            }
        });

        await this.step('Processing Fee Charges In Percentage', processingFeeValue, async () => {
            const chargeSpinbuttons = await this.page.getByRole('spinbutton').all();
            await chargeSpinbuttons[chargeSpinbuttons.length - 1].fill(processingFeeValue);
        });
    }

    // Fills the whole Create Program form (Basic + Financing) with valid data for a
    // Term Loan program against the given OEM/PAN search text
    async fillTermLoanProgram({ panSearchText, programName, offerClosingDate, sanctionedDate, programSizeLimit, maxTenorMonths, dealerMinLimit, dealerMaxLimit, minVintageMonths, financingTenorMonths, roiPercent, chargeDefaultValue, processingFeePercent }) {
        await this.selectAnchorByPanSearch(panSearchText);
        await this.selectProductType('Term Loan');
        await this.selectBillingType('Monthly');
        await this.fillProgramName(programName);
        await this.pickOfferClosingDate(offerClosingDate);
        await this.fillProgramSizeLimit(programSizeLimit);
        await this.pickSanctionedDate(sanctionedDate);
        await this.fillMaxTenor(maxTenorMonths);
        await this.fillDealerMinLimit(dealerMinLimit);
        await this.fillDealerMaxLimit(dealerMaxLimit);
        await this.fillMinVintage(minVintageMonths);
        await this.clickNext();

        await this.fillFinancingTenor(financingTenorMonths);
        await this.openInterestTab();
        await this.fillInterestRoi(roiPercent);
        await this.openChargesTab();
        await this.fillCharges(chargeDefaultValue, processingFeePercent);
    }

    // Locates the newly-created program directly in the (unfiltered, newest-first)
    // "All List" table - the list's search box doesn't scope to Program Name, only to
    // Program Code/OEM/Product Type, so searching by the generated program name would
    // never match
    async findProgramRow(programName) {
        await this.openAllListTab();
        return this.page.getByRole('row', { name: programName }).first();
    }

    // ---------------------------------------------------------------------------
    // Approve/Reject a pending program (Sales Supervisor role)
    // ---------------------------------------------------------------------------

    async openAwaitingApprovalTab() {
        await this.step('Open Awaiting Approval Tab', '', () => this.page.getByRole('tab', { name: 'Awaiting Approval' }).click());
    }

    // Grabs the Program Code (e.g. "TLM_HY_14082026133314") from the topmost/newest row
    // in Awaiting Approval - a clean, unique identifier that (unlike Program Name) the
    // list's own search box actually supports, and reliable to re-locate the same row
    // after it moves to a different status
    async getNewestAwaitingApprovalProgramCode() {
        await this.openAwaitingApprovalTab();
        const firstDataRow = this.page.getByRole('row').nth(1);
        const rowText = await firstDataRow.textContent();
        const match = rowText && rowText.match(/[A-Z]{2,4}_[A-Z]{2,3}_\d+/);
        if (!match) {
            throw new Error(`Could not find a Program Code in the first Awaiting Approval row: "${rowText}"`);
        }
        return match[0];
    }

    // Opens the row's action menu (the small "anchor" icon in the Action column) and
    // clicks "View" - this is a context-menu click, not a direct button
    async openProgramViaActionMenu(identifier) {
        await this.step('Open Action Menu', identifier, async () => {
            const row = this.page.getByRole('row', { name: identifier });
            await row.getByRole('img', { name: 'anchor' }).click();
            await this.page.getByRole('menuitem', { name: 'anchor View' }).click();
        });
    }

    async selectApproveDecision() {
        await this.step('Approve / Reject Decision', 'Approve', () => this.page.getByRole('radio', { name: 'Approve' }).check());
    }

    async selectRejectDecision() {
        await this.step('Approve / Reject Decision', 'Reject', () => this.page.getByRole('radio', { name: 'Reject' }).check());
    }

    // Submitting the Approve/Reject decision raises a native-looking "Are you sure?"
    // confirmation modal that must be explicitly confirmed before anything is committed
    async submitApprovalDecision() {
        await this.step('Submit Decision', '', async () => {
            await this.page.getByRole('button', { name: 'Submit' }).click();
            await this.page.getByRole('button', { name: 'Yes' }).click();
        });
    }
}

module.exports = ProgramsPage;
