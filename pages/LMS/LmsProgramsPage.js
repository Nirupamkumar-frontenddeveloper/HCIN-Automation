const BasePage = require('../BasePage');

// Page object for the LMS "Programs" module - view a program's sections (OEM Auth
// Matrix, View Relationships), search/filter controls. Pure navigation flow.
class LmsProgramsPage extends BasePage {

    async openProgramsMenu() {
        await this.step('Open Programs Menu', '', () => this.page.getByRole('button', { name: 'programs Programs' }).click());
    }

    async openAllPrograms() {
        await this.step('Open All Programs', '', () => this.page.getByLabel('Programs').getByText('All Programs').click());
    }

    async openAllProgramsDivFilter() {
        await this.step('Open All Programs (nav)', '', () => this.page.getByLabel('Programs').locator('div').filter({ hasText: /^All Programs$/ }).click());
    }

    async openAddProgramsDivFilter() {
        await this.step('Open Add Programs (nav)', '', () => this.page.getByLabel('Programs').locator('div').filter({ hasText: /^Add Programs$/ }).click());
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

    async clickBackButton() {
        await this.step('Back', '', () => this.page.getByRole('button', { name: 'Back' }).click());
    }

    async clickFormBackButton() {
        await this.step('Back (form)', '', () => this.page.locator('form').getByRole('button', { name: 'Back' }).click());
    }

    async openOemAuthMatrix() {
        await this.step('Open OEM Auth Matrix', '', () => this.page.getByText('OEM Auth Matrix').click());
    }

    async openViewRelationships() {
        await this.step('Open View Relationships', '', () => this.page.getByText('View Relationships').click());
    }

    async openMoreMenu() {
        await this.step('Open More Menu', '', () => this.page.getByTitle('More').click());
    }

    async clickAdvanceSearch() {
        await this.step('Advance Search', '', () => this.page.getByRole('button', { name: ' Advance search' }).click());
    }

    async clickClearFilter() {
        await this.step('Clear Filter', '', () => this.page.getByRole('button', { name: ' Clear Filter' }).click());
    }
}

module.exports = LmsProgramsPage;
