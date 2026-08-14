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

    // Logs out via the sidebar "Logout" link
    async logout() {
        await this.step('Logout', '', () => this.page.locator('div').filter({ hasText: /^Logout$/ }).click());
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

    // Reads a textbox or mat-select combobox's current value by accessible name
    async readFieldValue(nameRegex) {
        const textbox = this.page.getByRole('textbox', { name: nameRegex }).first();
        if (await textbox.count()) {
            return (await textbox.inputValue().catch(() => '')).trim();
        }

        const combobox = this.page.getByRole('combobox', { name: nameRegex }).first();
        if (await combobox.count()) {
            const viaInputValue = await combobox.inputValue().catch(() => null);
            if (viaInputValue !== null) return viaInputValue.trim();
            return (await combobox.textContent().catch(() => '')).trim();
        }

        return '';
    }

    // Checks for any .ng-invalid / mat-error currently visible on the page
    async hasValidationErrors() {
        const ngInvalidCount = await this.page.locator('.ng-invalid:visible').count().catch(() => 0);
        const matErrorCount = await this.page.locator('mat-error:visible, .mat-error:visible').count().catch(() => 0);
        return { ngInvalidCount, matErrorCount, hasErrors: ngInvalidCount > 0 || matErrorCount > 0 };
    }
}

module.exports = BasePage;
