const BasePage = require('./BasePage');

// Page object for the Onboarding module - view existing onboarding entities
// (select from the dropdown, open the row's More menu, View), a pure navigation flow
class OnboardingPage extends BasePage {

    async openOnboardingMenu() {
        await this.step('Open Onboarding Menu', '', () => this.page.getByRole('button', { name: 'onboarding Onboarding' }).click());
    }

    // Opens the Onboarding list within the sidebar's Onboarding region
    async openOnboardingList() {
        await this.step('Open Onboarding List', '', () => this.page.getByRole('region', { name: 'onboarding Onboarding' }).getByRole('navigation').click());
    }

    async selectEntity(entityName) {
        await this.step('Select Entity', entityName, async () => {
            await this.page.locator('.mat-mdc-select-placeholder').click();
            await this.page.getByRole('option', { name: entityName }).click();
        });
    }

    // Selecting an entity filters to a dealer list, not a single row - this is a
    // pure navigation smoke test, so the first dealer's row is opened rather than
    // matching a specific one
    async openMoreMenu() {
        await this.step('Open More Menu', '', () => this.page.getByTitle('More').first().click());
    }

    async clickViewMenuItem() {
        await this.step('View Entity', '', () => this.page.getByRole('menuitem').locator('div').filter({ hasText: 'View' }).click());
    }

    async goBack() {
        await this.step('Back', '', () => this.page.getByText('Back').click());
    }
}

module.exports = OnboardingPage;
