const LosCrawlerPage = require('./LosCrawlerPage');

// Generic filler for the multi-tab Edit Loan Application wizard - tabs/fields not yet
// verified live, so it discovers whatever is on the page instead of hardcoding locators.
// For each required field it looks up the field's own label in companyLeadData.xlsx
// first (add a row there once you know the real label from a run) and only falls back
// to a guessed value when the sheet has nothing for that label.
class LoanApplicationEditPage extends LosCrawlerPage {

    normalizeLabel(name) {
        return (name || '').replace(/\*/g, '').trim().toLowerCase();
    }

    buildLookup(excelData) {
        const map = {};
        Object.entries(excelData || {}).forEach(([key, value]) => {
            map[this.normalizeLabel(key)] = value;
        });
        return map;
    }

    guessValueForField(name, type) {
        const n = (name || '').toLowerCase();
        if (/email/.test(n)) return `salesleadtest${Date.now()}@example.com`;
        if (/mobile|phone|contact/.test(n)) return `9${Math.floor(100000000 + Math.random() * 899999999)}`;
        if (/pincode|pin code/.test(n)) return '812001';
        if (/\bpan\b/.test(n)) return 'ABCDE1234F';
        if (/aadhaar|aadhar/.test(n)) return '234567890123';
        if (/amount|limit|tenor|roi|rate|percent|charge|fee/.test(n) || type === 'number') return '10000';
        return 'Test Data';
    }

    async waitForFormReady() {
        await this.page.waitForLoadState('domcontentloaded');
        await this.wait(1000);
    }

    async fillMandatoryTextFields(lookup) {
        const requiredInputs = this.page.locator('input.ng-invalid, textarea.ng-invalid');
        const count = await requiredInputs.count();

        for (let i = 0; i < count; i++) {
            const input = requiredInputs.nth(i);
            if (!(await input.isVisible().catch(() => false))) continue;

            const name = (await input.getAttribute('aria-label'))
                || (await input.getAttribute('formcontrolname'))
                || (await input.getAttribute('placeholder'))
                || `field-${i}`;
            const type = (await input.getAttribute('type')) || 'text';
            const value = lookup[this.normalizeLabel(name)] || this.guessValueForField(name, type);

            await this.step(`Fill: ${name}`, value, () => input.fill(value));
        }
    }

    async fillMandatoryDropdowns(lookup) {
        const requiredCombos = this.page.locator('[role="combobox"].ng-invalid, mat-select.ng-invalid');
        const count = await requiredCombos.count();

        for (let i = 0; i < count; i++) {
            const combo = requiredCombos.nth(i);
            if (!(await combo.isVisible().catch(() => false))) continue;

            const name = (await combo.getAttribute('aria-label'))
                || (await combo.getAttribute('formcontrolname'))
                || `dropdown-${i}`;
            const preferredValue = lookup[this.normalizeLabel(name)];

            await this.step(`Select: ${name}`, preferredValue || '(first available option)', async () => {
                await combo.click();
                const option = preferredValue
                    ? this.page.getByRole('option', { name: preferredValue, exact: true })
                    : this.page.getByRole('option').first();
                await option.waitFor({ state: 'visible', timeout: 5000 });
                await option.click();
            });
        }
    }

    async uploadWhereverNeeded(filePath) {
        const uploadTriggers = this.page.getByText('Browse files to attach');
        const count = await uploadTriggers.count();

        for (let i = 0; i < count; i++) {
            const trigger = uploadTriggers.nth(i);
            if (!(await trigger.isVisible().catch(() => false))) continue;

            await this.step(`Upload Document (${i + 1})`, filePath, async () => {
                await trigger.click();
                await this.page.getByLabel(/Browse files to attach/i).nth(i).setInputFiles(filePath);
            });
            await this.wait(1200);
        }
    }

    async checkNoValidationErrors(tabName) {
        await this.step(`Validate Tab: ${tabName}`, '', async () => {
            const { hasErrors, ngInvalidCount, matErrorCount } = await this.hasValidationErrors();
            if (hasErrors) {
                throw new Error(`Tab "${tabName}" still has ${ngInvalidCount} invalid field(s) / ${matErrorCount} visible error message(s) after filling`);
            }
        });
    }

    async saveOrAdvance(tabName) {
        await this.step(`Save/Next: ${tabName}`, '', async () => {
            const next = this.page.getByRole('button', { name: /^next$/i });
            const save = this.page.getByRole('button', { name: /^save$/i });
            const submit = this.page.getByRole('button', { name: /^submit$/i });

            if (await next.count() && await next.first().isEnabled().catch(() => false)) {
                await next.first().click();
            } else if (await save.count() && await save.first().isEnabled().catch(() => false)) {
                await save.first().click();
            } else if (await submit.count() && await submit.first().isEnabled().catch(() => false)) {
                await submit.first().click();
            } else {
                throw new Error(`No enabled Save/Next/Submit button found on tab "${tabName}"`);
            }
            await this.wait(1200);
        });
    }

    async fillAllTabs(sampleDocPath, excelData = {}) {
        const lookup = this.buildLookup(excelData);
        await this.waitForFormReady();
        const tabs = await this.discoverTabs();

        if (!tabs.length) {
            await this.fillMandatoryDropdowns(lookup);
            await this.fillMandatoryTextFields(lookup);
            await this.uploadWhereverNeeded(sampleDocPath);
            await this.checkNoValidationErrors('(single page)');
            await this.saveOrAdvance('(single page)');
            return;
        }

        for (const tabName of tabs) {
            await this.switchToTab(tabName);
            await this.wait(800);
            await this.fillMandatoryDropdowns(lookup);
            await this.fillMandatoryTextFields(lookup);
            await this.uploadWhereverNeeded(sampleDocPath);
            await this.checkNoValidationErrors(tabName);
            await this.saveOrAdvance(tabName);
        }
    }
}

module.exports = LoanApplicationEditPage;
