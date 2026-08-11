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

    async openAllListTab() {
        await this.step('Open All List Tab', '', () => this.page.getByRole('tab', { name: 'All List' }).click());
    }

    async openProgramRow(rowName) {
        await this.step('Open Program Row', rowName, () => this.page.getByRole('row', { name: rowName }).locator('a').click());
    }

    async clickView() {
        await this.step('View Program', '', () => this.page.locator('div').filter({ hasText: /^View$/ }).click());
    }

    async openStructureStep() {
        await this.step('Open Structure Step', '', () => this.page.getByText('2 Structure').click());
    }

    async openFinancingTab() {
        await this.step('Open Financing Tab', '', () => this.page.getByText('Financing', { exact: true }).click());
    }

    async openOtherTab() {
        await this.step('Open Other Tab', '', () => this.page.getByRole('tab', { name: 'Other' }).click());
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
