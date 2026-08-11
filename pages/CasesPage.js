const BasePage = require('./BasePage');

// Page object for the Cases module - view a post-underwriting case, then browse
// the other Cases sub-menus (Rejected/Credit Returned/Ops Returned), a pure navigation flow
class CasesPage extends BasePage {

    async openCasesMenu() {
        await this.step('Open Cases Menu', '', () => this.page.getByRole('button', { name: 'cases Cases' }).click());
    }

    async openPostUnderwritingCases() {
        await this.step('Open Post-Underwriting Cases', '', () => this.page.getByLabel('Cases').getByText('Post-Underwriting Cases').click());
    }

    async openCaseRow(rowName) {
        await this.step('Open Case Row', rowName, () => this.page.getByRole('row', { name: rowName }).locator('a').click());
    }

    async clickViewMenuItem() {
        await this.step('View Case', '', () => this.page.getByRole('menuitem').locator('div').filter({ hasText: 'View' }).click());
    }

    async clickBackButton() {
        await this.step('Back', '', () => this.page.getByRole('button', { name: 'Back' }).click());
    }

    async openRejectedCases() {
        await this.step('Open Rejected Cases', '', () => this.page.getByLabel('Cases').getByText('Rejected Cases').click());
    }

    async openCreditReturnedCases() {
        await this.step('Open Credit Returned Cases', '', () => this.page.getByLabel('Cases').getByText('Credit Returned Cases').click());
    }

    async openOpsReturnedCases() {
        await this.step('Open Ops Returned Cases', '', () => this.page.getByLabel('Cases').getByText('Ops Returned Cases').click());
    }
}

module.exports = CasesPage;
