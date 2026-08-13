const BasePage = require('./BasePage');

// Page object for the Underwriting module - open the Underwriting Cases queue,
// browse to All Applications and view a case, a pure navigation flow
class UnderwritingPage extends BasePage {

    async openUnderwritingModule() {
        await this.step('Open Underwriting Module Menu', '', () => this.page.getByRole('button', { name: 'UnderWriting Module' }).click());
    }

    // The sidebar's Underwriting Module region only has one list item (Underwriting
    // Cases), so it's targeted generically rather than by text
    async openUnderwritingCases() {
        await this.step('Open Underwriting Cases', '', () => this.page.getByRole('region', { name: 'UnderWriting Module' }).locator('mat-list-item').click());
    }

    async openUnderwriterQueue() {
        const underwriterUrl = process.env.LOS_URL.replace(/#\/.*/, '#/underwriter');
        await this.step('Open Underwriter Queue', underwriterUrl, () => this.page.goto(underwriterUrl));
    }

    async openAllApplications() {
        await this.step('Open All Applications', '', () => this.page.getByRole('button', { name: 'All Applications' }).click());
    }

    // Application rows here aren't table rows, just styled flex divs - so the
    // first matching row is targeted by its class instead of a role/name
    async openFirstApplicationRow() {
        await this.step('Open First Application Row', '', () => this.page.locator('.d-flex.w-100.align-center.ng-star-inserted').first().click());
    }

    async clickViewMenuItem() {
        await this.step('View Application (menu)', '', () => this.page.getByRole('menuitem').locator('div').filter({ hasText: 'View' }).click());
    }
}

module.exports = UnderwritingPage;
