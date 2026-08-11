const fs = require('fs');
const path = require('path');
const BasePage = require('./BasePage');

const downloadsDir = path.join(__dirname, '../downloads');

// Page object for the Configuration module - open Masters (which triggers a file
// download when a master type is picked), then jump directly to the Dynamic Field screen
class ConfigurationPage extends BasePage {

    async openConfigurationMenu() {
        await this.step('Open Configuration Menu', '', () => this.page.getByRole('button', { name: 'configuration Configuration' }).click());
    }

    async openMasters() {
        await this.step('Open Masters', '', () => this.page.locator('div').filter({ hasText: /^Masters$/ }).nth(3).click());
    }

    // Picking a master type from the dropdown auto-triggers a file download - the download
    // event alone doesn't persist anything, so it has to be explicitly saved to disk
    async selectMasterAndDownload() {
        await this.step('Select Master Type (download)', '', async () => {
            const downloadPromise = this.page.waitForEvent('download');
            await this.page.locator('.mat-mdc-select-placeholder').click();
            const download = await downloadPromise;

            if (!fs.existsSync(downloadsDir)) {
                fs.mkdirSync(downloadsDir, { recursive: true });
            }
            const savePath = path.join(downloadsDir, download.suggestedFilename());
            await download.saveAs(savePath);
            this.lastDownloadPath = savePath;
        });
    }

    async openDynamicFieldScreen() {
        const dynamicFieldUrl = process.env.LOS_URL.replace(/#\/.*/, '#/dynamicField');
        await this.step('Open Dynamic Field Screen', dynamicFieldUrl, () => this.page.goto(dynamicFieldUrl));
    }
}

module.exports = ConfigurationPage;
