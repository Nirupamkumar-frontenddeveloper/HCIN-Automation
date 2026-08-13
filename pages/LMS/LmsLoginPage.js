const BasePage = require('../BasePage');

// Page object for the LMS login screen
class LmsLoginPage extends BasePage {

    async openLMS() {
        await this.step('Open LMS', '', () => this.page.goto(process.env.LMS_URL));
    }

    async login(username, password) {
        await this.step('Enter AD ID', username, () => this.page.getByRole('textbox', { name: 'Enter AD ID' }).fill(username));
        await this.step('Enter Password', '••••••', () => this.page.getByRole('textbox', { name: 'Enter Your Password' }).fill(password));
        await this.step('Login', '', () => this.page.getByRole('button', { name: 'Login' }).click());
    }
}

module.exports = LmsLoginPage;
