const BasePage = require('../BasePage');

// Page object for the LMS "Limit Details" module - Manage Entity/Relationship/Product/Group
// Limit sub-sections. Pure navigation flow; any edit forms opened are cancelled, not saved.
class LmsLimitDetailsPage extends BasePage {

    async openLimitDetailsMenu() {
        await this.step('Open Limit Details Menu', '', () => this.page.getByRole('button', { name: 'Limit Details Limit Details' }).click());
    }

    async openManageEntityLimit() {
        await this.step('Open Manage Entity Limit', '', () => this.page.getByLabel('Limit Details').getByText('Manage Entity Limit').click());
    }

    async openManageRelationshipLimit() {
        await this.step('Open Manage Relationship Limit', '', () => this.page.getByLabel('Limit Details').getByText('Manage Relationship Limit').click());
    }

    async openManageProductLimit() {
        await this.step('Open Manage Product Limit', '', () => this.page.getByLabel('Limit Details').getByText('Manage Product Limit').click());
    }

    async openManageGroupLimit() {
        await this.step('Open Manage Group Limit', '', () => this.page.locator('mat-list-item').filter({ hasText: 'Manage Group Limit' }).click());
    }

    async openProgramFilterDropdown() {
        await this.step('Open Program Filter', '', () => this.page.locator('.mat-mdc-select-placeholder').click());
    }

    async selectProgramOption(programText) {
        await this.step('Select Program', programText, () => this.page.locator('span').filter({ hasText: programText }).first().click());
    }

    async openAllListTab() {
        await this.step('Open All List Tab', '', () => this.page.getByRole('tab', { name: 'All List' }).click());
    }

    async clickAllListButton() {
        await this.step('Open All List', '', () => this.page.getByRole('button', { name: 'All List' }).click());
    }

    async clickAwaitingApproval() {
        await this.step('Open Awaiting Approval', '', () => this.page.getByRole('button', { name: 'Awaiting Approval' }).click());
    }

    async openRow(rowName) {
        await this.step('Open Row', rowName, () => this.page.getByRole('row', { name: rowName }).locator('a').click());
    }

    async clickView() {
        await this.step('View', '', () => this.page.locator('div').filter({ hasText: /^View$/ }).click());
    }

    async clickViewMenuItemNamed(name) {
        await this.step('View (menu item)', name, () => this.page.getByRole('menuitem', { name }).click());
    }

    async clickEditExactText() {
        await this.step('Edit', '', () => this.page.getByText('Edit', { exact: true }).click());
    }

    async clickEditDivFilter() {
        await this.step('Edit', '', () => this.page.locator('div').filter({ hasText: /^Edit$/ }).click());
    }

    async clickBackButton() {
        await this.step('Back', '', () => this.page.getByRole('button', { name: 'Back' }).click());
    }

    async clickSubmitBackText() {
        await this.step('Submit Back', '', () => this.page.getByText('Submit Back').click());
    }

    async gotoProgramLimitScreen() {
        // Recorded as a direct URL (different base path than the login URL: "lms" vs
        // "lmsfrontend") - kept literal since that's what was confirmed working
        const url = 'https://hcinlmsdev.cashinvoice.in/lms/#/limit/program-limit';
        await this.step('Open Program Limit Screen', url, () => this.page.goto(url));
    }

    async clickActiveCellFilter() {
        await this.step('Click Active Cell Filter', '', () => this.page.getByRole('cell', { name: 'Active' }).nth(1).click());
    }

    // Original recording used a fragile auto-generated overlay ID (#mat-menu-panel-90) for
    // this context-menu item - matched by role=menuitem + its visible text instead, which
    // also disambiguates it from a "Freeze Limit" modal header that's present in the DOM
    // at the same time (a plain div-text filter matches both)
    async openFreezeLimitMenuItem() {
        await this.step('Open Freeze Limit', '', () => this.page.getByRole('menuitem').filter({ hasText: 'Freeze Limit' }).click());
    }

    async clickRemarksField() {
        await this.step('Click Remarks Field', '', () => this.page.getByRole('textbox', { name: 'Remarks *' }).click());
    }

    async clickCancel() {
        await this.step('Cancel', '', () => this.page.getByRole('button', { name: 'Cancel' }).click());
    }
}

module.exports = LmsLimitDetailsPage;
