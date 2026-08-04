const fs = require('fs');
const path = require('path');

const screenshotsDir = path.join(__dirname, '../screenshots/steps');
if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Shared base class for page objects: resolves { role, name } locator descriptors,
// records a pass/fail entry per field/action for the Word reporter's field-by-field
// table, and captures a screenshot after every step for that same report.
class BasePage {

    constructor(page) {
        this.page = page;
        this.fieldReport = [];
        // Unique per instance so screenshot filenames never collide with another
        // page object or an earlier run writing to the same shared folder
        this.runId = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
        this.stepCounter = 0;
    }

    // Resolve a locator entry that is either a { role, name } descriptor or a plain selector string
    byRole(descriptor, options = {}) {
        return this.page.getByRole(descriptor.role, { name: descriptor.name, ...options });
    }

    // Run a field-level action, capture a screenshot, and record whether it passed or
    // failed for the report, then rethrow so the test still stops/fails at the right place
    async step(field, value, action) {
        const entry = { field, value: value === undefined || value === null ? '' : String(value) };

        try {
            await action();
            entry.status = 'Pass';
        } catch (err) {
            entry.status = 'Fail';
            entry.error = err.message;
            entry.screenshotPath = await this.captureScreenshot(field);
            this.fieldReport.push(entry);
            throw err;
        }

        entry.screenshotPath = await this.captureScreenshot(field);
        this.fieldReport.push(entry);
    }

    async captureScreenshot(field) {
        this.stepCounter += 1;
        const safeField = field.replace(/[^a-zA-Z0-9-_]+/g, '_').slice(0, 60) || 'step';
        const filePath = path.join(screenshotsDir, `${this.runId}_${this.stepCounter}_${safeField}.png`);

        try {
            await this.page.screenshot({ path: filePath });
            // A screenshot that didn't actually get written is worse than none - the
            // report should show "-" rather than try to embed a broken/empty file
            return fs.existsSync(filePath) && fs.statSync(filePath).size > 0 ? filePath : undefined;
        } catch {
            return undefined;
        }
    }

    // Open a mat-select combobox and pick an option by its visible text
    async selectOption(descriptor, optionName) {
        await this.byRole(descriptor).click();
        await this.page.getByRole('option', { name: optionName, exact: true }).click();
    }

    // Fixed pause, used to let the UI settle between fast-fired actions (e.g. document uploads)
    async wait(ms) {
        await this.page.waitForTimeout(ms);
    }
}

module.exports = BasePage;
