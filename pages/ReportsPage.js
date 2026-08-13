const fs = require('fs');
const path = require('path');
const BasePage = require('./BasePage');

const downloadsDir = path.join(__dirname, '../downloads');

// Page object for the Reports module - System Reports screen, picking report
// types from the dropdown, opening the standalone report tiles, and downloading
// the report files a couple of them produce (CRILC, NESL)
class ReportsPage extends BasePage {

    async openReportsMenu() {
        await this.step('Open Reports Menu', '', () => this.page.getByRole('button', { name: 'reports Reports' }).click());
    }

    async openSystemReports() {
        await this.step('Open System Reports', '', () => this.page.getByLabel('Reports').getByText('System Reports').click());
    }

    async selectReportType(reportName) {
        await this.step('Select Report Type', reportName, async () => {
            await this.page.locator('.mat-mdc-select-placeholder').click();
            await this.page.getByRole('option', { name: reportName }).click();
        });
    }

    // Same dropdown as selectReportType, but re-opened via its now-filled value
    // trigger instead of the (now gone) placeholder
    async changeReportType(reportName) {
        await this.step('Change Report Type', reportName, async () => {
            await this.page.locator('#mat-select-value-3').click();
            await this.page.getByRole('option', { name: reportName }).click();
        });
    }

    async openCrilcReport() {
        await this.step('Open CRILC Report', '', () => this.page.getByLabel('Reports').locator('div').filter({ hasText: /^CRILC Report$/ }).click());
    }

    async downloadCrilcWeeklyReport() {
        await this.step('Download CRILC Weekly Report', '', () => this.clickAndSaveDownload(this.page.getByRole('button', { name: ' Download Weekly' })));
    }

    async downloadCrilcMonthlyReport() {
        await this.step('Download CRILC Monthly Report', '', () => this.clickAndSaveDownload(this.page.getByRole('button', { name: ' Download Monthly' })));
    }

    // Opening this report itself triggers a download
    async openNeslReport() {
        await this.step('Open NESL Report', '', () => this.clickAndSaveDownload(this.page.getByLabel('Reports').locator('div').filter({ hasText: /^NESL Report$/ })));
    }

    async downloadNeslReport() {
        await this.step('Download NESL Report', '', () => this.clickAndSaveDownload(this.page.getByRole('button', { name: ' Download Report' })));
    }

    async openBureauReport() {
        await this.step('Open Bureau Report', '', () => this.page.getByLabel('Reports').locator('div').filter({ hasText: /^Bureau Report$/ }).click());
    }

    async openCibilApiAuditReport() {
        await this.step('Open CIBIL API Audit Report', '', () => this.page.getByLabel('Reports').locator('div').filter({ hasText: /^CIBIL API Audit Report$/ }).click());
    }

    // Clicks the given locator and saves the download it triggers to the project's
    // downloads folder. Best-effort by default: some report buttons don't always
    // fire a browser "download" event (e.g. the report renders inline instead), and
    // one missing file shouldn't stop the rest of the Reports run (maxFailures: 1
    // in playwright.config.js would otherwise kill every report after it). Pass
    // { required: true } for a button that must always produce a file.
    async clickAndSaveDownload(locator, { required = false, timeout = 15000 } = {}) {
        const downloadPromise = this.page.waitForEvent('download', { timeout }).catch(() => null);
        await locator.click();
        const download = await downloadPromise;

        if (!download) {
            if (required) {
                throw new Error('Expected a download but none occurred');
            }
            return;
        }

        if (!fs.existsSync(downloadsDir)) {
            fs.mkdirSync(downloadsDir, { recursive: true });
        }
        const savePath = path.join(downloadsDir, download.suggestedFilename());
        await download.saveAs(savePath);
        this.lastDownloadPath = savePath;
    }
}

module.exports = ReportsPage;
