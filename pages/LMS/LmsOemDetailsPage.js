const BasePage = require('../BasePage');

// Page object for the LMS "OEM Details" module - OEM List (view/edit an OEM's
// Credit Rating/Address/Contact/Bank sections, add new entries) and Dealer List
// (view a dealer's sections, change an OEM's status)
class LmsOemDetailsPage extends BasePage {

    async openOemDetailsMenu() {
        await this.step('Open OEM Details Menu', '', () => this.page.getByRole('button', { name: 'oemDetails OEM Details' }).click());
    }

    async openOemList() {
        await this.step('Open OEM List', '', () => this.page.getByLabel('OEM Details').getByText('OEM List').click());
    }

    async openAllListTab() {
        await this.step('Open All List Tab', '', () => this.page.getByRole('tab', { name: 'All List' }).click());
    }

    async openRow(rowName) {
        await this.step('Open Row', rowName, () => this.page.getByRole('row', { name: rowName }).locator('a').click());
    }

    async clickView() {
        await this.step('View', '', () => this.page.locator('div').filter({ hasText: /^View$/ }).click());
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

    // Opens Credit Rating/Address/Contact/Bank Information in order
    async viewAllSections() {
        await this.openCreditRatingInformation();
        await this.openAddressInformation();
        await this.openContactInformation();
        await this.openBankInformation();
    }

    async clickEdit() {
        await this.step('Edit', '', () => this.page.getByRole('button', { name: 'Edit', exact: true }).click());
    }

    async clickAddCreditRating() {
        await this.step('Add Credit Rating', '', () => this.page.getByRole('button', { name: 'Add Credit Rating' }).click());
    }

    async clickAddAddress() {
        await this.step('Add Address', '', () => this.page.getByRole('button', { name: 'Add Address' }).click());
    }

    async clickAddContact() {
        await this.step('Add Contact', '', () => this.page.getByRole('button', { name: 'Add Contact' }).click());
    }

    async clickAddBank() {
        await this.step('Add Bank', '', () => this.page.getByRole('button', { name: 'Add Bank' }).click());
    }

    async goBackText() {
        await this.step('Back', '', () => this.page.getByText('Back').click());
    }

    async openDealerList() {
        await this.step('Open Dealer List', '', () => this.page.getByLabel('OEM Details').getByText('Dealer List').click());
    }

    async selectDealerOem(oemName) {
        await this.step('Select OEM Filter', oemName, async () => {
            await this.page.locator('.mat-mdc-select-placeholder').click();
            await this.page.getByText(oemName).click();
        });
    }

    async openMoreMenu() {
        await this.step('Open More Menu', '', () => this.page.getByTitle('More').click());
    }

    async clickViewMenuItem() {
        await this.step('View (menu item)', '', () => this.page.getByRole('menuitem').locator('div').filter({ hasText: 'View' }).click());
    }

    async openChangeStatus() {
        await this.step('Open Change Status', '', () => this.page.getByText('Change status').nth(1).click());
    }

    async selectCheckerStatus(status) {
        await this.step('Select Checker Status', status, () => this.page.locator('select[name="checkerId"]').selectOption(status));
    }

    async clickCancel() {
        await this.step('Cancel', '', () => this.page.getByRole('button', { name: 'Cancel' }).click());
    }
}

module.exports = LmsOemDetailsPage;
