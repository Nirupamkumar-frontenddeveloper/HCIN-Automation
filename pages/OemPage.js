const BasePage = require('./BasePage');

// Page object for the OEM module - view an OEM's detail sections and edit it,
// a pure navigation flow (no new data created)
class OemPage extends BasePage {

    async openOemMenu() {
        await this.step('Open OEM Menu', '', () => this.page.getByRole('button', { name: 'oem OEM' }).click());
    }

    async openOemList() {
        await this.step('Open OEM List', '', () => this.page.locator('div').filter({ hasText: /^OEM List$/ }).nth(3).click());
    }

    async openOem(name) {
        await this.step('Open OEM Row', name, () => this.page.getByRole('row', { name }).locator('a').click());
    }

    async clickView() {
        await this.step('View OEM', '', () => this.page.locator('div').filter({ hasText: /^View$/ }).click());
    }

    // View via the row's context menu (as opposed to clickView's direct View button)
    async clickViewMenuItem() {
        await this.step('View OEM (menu)', '', () => this.page.getByRole('menuitem').locator('div').filter({ hasText: 'View' }).click());
    }

    async openCreditRatingInformation() {
        await this.step('Open Credit Rating Information', '', () => this.page.getByRole('button', { name: 'Credit Rating Information' }).click());
    }

    async openAddressInformation() {
        await this.step('Open Address Information', '', () => this.page.getByRole('button', { name: 'Address Information' }).click());
    }

    async openContactInformation() {
        await this.step('Open Contact Information', '', () => this.page.getByRole('button', { name: 'Contact Information' }).click());
    }

    async openBankInformation() {
        await this.step('Open Bank Information', '', () => this.page.getByRole('button', { name: 'Bank Information' }).click());
    }

    async clickEdit() {
        await this.step('Edit OEM', '', () => this.page.getByRole('button', { name: 'Edit', exact: true }).click());
    }

    async clickEditFromList() {
        await this.step('Edit OEM (from list)', '', () => this.page.locator('div').filter({ hasText: /^Edit$/ }).click());
    }

    async goBack() {
        await this.step('Back', '', () => this.page.getByText('Back').click());
    }
}

module.exports = OemPage;
