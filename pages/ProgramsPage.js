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
}

module.exports = ProgramsPage;
