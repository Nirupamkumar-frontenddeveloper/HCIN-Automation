// Shared base class for page objects: resolves { role, name } locator descriptors,
// records a pass/fail entry per field/action for the Word reporter's field-by-field
// table, and captures a screenshot after every step - kept in memory (base64) and
// embedded straight into the report, never written to disk as loose files.
class BasePage {

    constructor(page) {
        this.page = page;
        this.fieldReport = [];
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
            entry.screenshotBase64 = await this.captureScreenshot();
            this.fieldReport.push(entry);
            throw err;
        }

        // Give the app a moment to finish re-rendering before the next step fires - several
        // failures so far have been the next action racing an Angular re-render mid-flight
        // (elements detaching, dropdowns not yet open) rather than a real locator problem
        await this.wait(500);

        entry.screenshotBase64 = await this.captureScreenshot();
        this.fieldReport.push(entry);
    }

    async captureScreenshot() {
        try {
            const buffer = await this.page.screenshot();
            return buffer.toString('base64');
        } catch {
            return undefined;
        }
    }

    // Collapses/expands the left navigation sidebar - the very first click on most screens
    async toggleSidebar() {
        await this.step('Toggle Sidebar', '', () => this.page.getByRole('button', { name: 'toggle sidebar' }).click());
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
