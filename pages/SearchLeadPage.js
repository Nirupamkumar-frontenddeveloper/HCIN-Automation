const loc = require('../locators/promoterLocators');
const BasePage = require('./BasePage');

// Page object for finding an existing lead via the "Leads > Loan Applications" list and opening it
class SearchLeadPage extends BasePage {

    async toggleSidebar() {
        await this.step('Toggle Sidebar', '', () => this.page.getByRole('button', { name: 'toggle sidebar' }).click());
    }

    async openLeadsLoanApplications() {
        await this.toggleSidebar();
        await this.step('Open Leads Menu', '', () => this.byRole(loc.leadsNavBtn).click());
        await this.step('Open Loan Applications', '', () => this.page.getByLabel('Leads').getByText('Loan Applications').click());
    }

    async searchEntity(entityName) {
        await this.step('Search Entity', entityName, async () => {
            this.entityName = entityName;
            const searchBox = this.byRole(loc.searchInput);
            const row = this.page.getByRole('row', { name: entityName }).first();

            // A lead created moments ago can take a little while to show up in the list/search
            // index, so retry a few times (reloading to force a fresh fetch) before giving up
            const maxAttempts = 4;
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                await searchBox.fill(entityName);
                await searchBox.press('Enter');
                const found = await row.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
                if (found) return;
                if (attempt < maxAttempts) {
                    await this.page.reload();
                    await searchBox.waitFor({ state: 'visible' });
                }
            }

            // Final attempt - let this throw a clear timeout error if it's still not found
            await searchBox.fill(entityName);
            await searchBox.press('Enter');
            await row.waitFor({ state: 'visible' });
        });
    }

    async openLeadView() {
        const row = this.page.getByRole('row', { name: this.entityName });
        await this.step('Open More Menu', '', () => row.getByTitle('More').click());
        await this.step('View Lead', '', () => this.page.locator('div').filter({ hasText: /^View$/ }).click());
    }
}

module.exports = SearchLeadPage;
