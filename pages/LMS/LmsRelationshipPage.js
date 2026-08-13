const BasePage = require('../BasePage');

// Page object for the LMS "Relationship" module
class LmsRelationshipPage extends BasePage {

    async openRelationshipMenu() {
        await this.step('Open Relationship Menu', '', () => this.page.getByRole('button', { name: 'relationship Relationship' }).click());
    }
}

module.exports = LmsRelationshipPage;
