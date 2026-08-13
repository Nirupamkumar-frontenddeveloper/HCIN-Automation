const loginLocators = require('../locators/loginLocators');

// Page object for the login workflow
class LoginPage {

    constructor(page) {
        this.page = page;
    }

    // Open the login page using the URL from the environment variables. Waits only
    // for the DOM rather than the full "load" event - some background resource on
    // this dev environment never settles, which was making the default wait hang
    // for the full navigation timeout even though the app itself is interactive.
    async openLOS() {
        await this.page.goto(process.env.LOS_URL, { waitUntil: 'domcontentloaded' });
    }

    // Fill the username input field
    async enterUsername(username) {
        await this.page.locator(loginLocators.username).fill(username);
    }

    // Fill the password input field
    async enterPassword(password) {
        await this.page.locator(loginLocators.password).fill(password);
    }

    // Click the login button
    async clickLogin() {
        await this.page.locator(loginLocators.loginButton).click();
    }

    // Perform the full login action with the provided credentials
    async login(username, password) {

        await this.enterUsername(username);

        await this.enterPassword(password);

        await this.clickLogin();

    }

    // Sign out and wait until the login screen is visible again
    async logout() {

        await this.page.locator('img[alt="Logout"]').click();

        await this.page.waitForURL(/\/login|#\/login/i, {
            timeout: 15000
        }).catch(() => {});

        await this.page.locator(loginLocators.username).waitFor({
            state: 'visible',
            timeout: 15000
        });

    }

}

module.exports = LoginPage;