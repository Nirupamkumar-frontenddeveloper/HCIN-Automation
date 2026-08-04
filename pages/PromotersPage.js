const loc = require('../locators/promoterLocators');
const BasePage = require('./BasePage');

// Page object for the "Promoters, Owners & Management" tab: add a director/promoter,
// upload their KYC documents, then the net-worth and bank-document sections that follow.
class PromotersPage extends BasePage {

    async fillTelephoneMobile(number) {
        await this.step('Telephone Number / Mobile', number, async () => {
            // This is the very first field on a just-navigated page, so give Angular a
            // moment to finish rendering it before interacting, then verify the fill stuck
            const field = this.byRole(loc.telephoneMobileInput);
            await field.waitFor({ state: 'visible' });
            await field.fill(number);
            if ((await field.inputValue()) !== number) {
                await field.fill(number);
            }
        });
    }

    // A freshly-created lead lands on an "Entity Information" completion form, and the
    // Promoters tab only appears once this is filled in (Telephone/Mobile) and submitted
    async completeEntityInformation(telephoneMobile) {
        await this.wait(1000);
        await this.fillTelephoneMobile(telephoneMobile);
        await this.submit();
    }

    async openPromotersTab() {
        await this.step('Open Promoters Tab', '', () => this.byRole(loc.promotersTabBtn).click());
    }

    async checkShareholder() {
        await this.step('Shareholder', 'Yes', () => this.byRole(loc.shareholderCheckbox).check());
    }

    async checkYes() {
        await this.step('Confirm (Yes)', 'Yes', () => this.byRole(loc.yesRadio).check());
    }

    async selectDirectorType(type) {
        await this.step('Type', type, async () => {
            await this.page.locator(loc.matSelectPlaceholder).first().click();
            await this.page.getByText(type, { exact: true }).click();
        });
    }

    async fillPAN(pan) {
        await this.step('PAN', pan, () => this.byRole(loc.panInput).fill(pan));
    }

    async selectSalutation(value) {
        await this.step('Salutation', value, async () => {
            await this.page.locator(loc.matSelectPlaceholder).first().click();
            await this.page.getByRole('option', { name: value }).click();
        });
    }

    async fillFirstName(firstName) {
        await this.step('First Name', firstName, () => this.byRole(loc.firstNameInput).fill(firstName));
    }

    async fillLastName(lastName) {
        await this.step('Last Name', lastName, () => this.byRole(loc.lastNameInput).fill(lastName));
    }

    async fillShareholdingPct(pct) {
        await this.step('Shareholding %', pct, () => this.byRole(loc.shareholdingPctInput).fill(pct));
    }

    // DOB calendar: navigates back to the target year via "Previous 24 years", then picks month/day
    async pickDOB({ day, month, year }) {
        await this.step('Date of Birth', `${day}-${month}-${year}`, async () => {
            await this.byRole(loc.openCalendarBtn).first().click();
            await this.byRole(loc.chooseMonthYearBtn).click();
            await this.byRole(loc.previous24YearsBtn).click();
            await this.page.getByRole('button', { name: String(year) }).click();
            await this.page.getByRole('button', { name: month }).click();
            // Anchor the match at the start of the label so e.g. day "1" can't match "21"/"31"
            await this.page.getByRole('button', { name: new RegExp(`^${day}\\s+${month}\\b`) }).click();
        });
    }

    async selectGender(value) {
        await this.step('Gender', value, async () => {
            await this.page.locator(loc.matSelectPlaceholder).first().click();
            await this.page.getByRole('option', { name: value, exact: true }).click();
        });
    }

    async fillNationality(nationality) {
        await this.step('Nationality', nationality, () => this.byRole(loc.nationalityInput).fill(nationality));
    }

    async selectIncomeRange(rangeText) {
        await this.step('Income Range (In INR)', rangeText, async () => {
            await this.byRole(loc.incomeRangeSelect).locator('svg').click();
            await this.page.getByText(rangeText).click();
        });
    }

    // Date of Appointment: defaults to today's date in the calendar, so compute it dynamically
    async pickAppointmentDate() {
        const today = new Date();
        const day = today.getDate();
        const month = today.toLocaleString('en-US', { month: 'long' });
        const year = today.getFullYear();

        await this.step('Date of Appointment', `${day} ${month} ${year}`, async () => {
            await this.byRole(loc.openCalendarBtn).nth(1).click();
            await this.page.getByRole('button', { name: `${day} ${month} ${year}`, exact: true }).click();
        });
    }

    async fillDIN(din) {
        await this.step('DIN', din, () => this.byRole(loc.dinInput).fill(din));
    }

    async fillAadhaarLast4(last4) {
        await this.step('Aadhaar Card No (last 4)', last4, () => this.byRole(loc.aadhaarInput).fill(last4));
    }

    async fillMobile(mobile) {
        await this.step('Mobile Number', mobile, () => this.byRole(loc.mobileInput).fill(mobile));
    }

    async fillDesignation(designation) {
        await this.step('Designation / Business Title', designation, () => this.byRole(loc.designationInput).fill(designation));
    }

    async fillAddressLine1(line1) {
        await this.step('Address Line 1', line1, () => this.byRole(loc.addressLine1Input).fill(line1));
    }

    async fillPincode(pincode) {
        await this.step('Pincode', pincode, () => this.byRole(loc.pincodeInput).fill(pincode));
    }

    async openManagementPersonnelSection() {
        await this.step('Open Management Personnel Section', '', () => this.page.getByText(loc.holdingSummaryText).click());
    }

    async submit() {
        await this.step('Submit', '', () => this.byRole(loc.submitBtn).click());
    }

    // Fills the full director/promoter card in the recorded order
    async addDirector(director) {
        await this.checkShareholder();
        await this.checkYes();
        await this.selectDirectorType(director.type);
        await this.fillPAN(director.pan);

        await this.checkShareholder();
        await this.checkYes();
        await this.selectSalutation(director.salutation);
        await this.fillFirstName(director.firstName);
        await this.fillLastName(director.lastName);
        await this.fillShareholdingPct(director.shareholdingPct);
        await this.pickDOB({ day: director.dobDay, month: director.dobMonth, year: director.dobYear });
        await this.selectGender(director.gender);
        await this.fillNationality(director.nationality);
        await this.selectIncomeRange(director.incomeRange);
        await this.pickAppointmentDate();
        await this.fillDIN(director.din);
        await this.fillAadhaarLast4(director.aadhaarLast4);
        await this.fillMobile(director.mobile);
        await this.fillDesignation(director.designation);
        await this.fillAddressLine1(director.addressLine1);
        await this.fillPincode(director.pincode);
        await this.openManagementPersonnelSection();
        await this.submit();
    }

    // The 8 KYC document rows shown right after the director card is submitted (upload ids 3-10).
    // Each row's post-upload "verify" control differs slightly, mirroring the actual recorded flow.
    async uploadDirectorKycDocuments(filePath) {
        await this.step('KYC Document 1', filePath, async () => {
            await this.page.getByText('Browse files to attach').first().click();
            await this.page.locator('#docUpload-document-upload-3').setInputFiles(filePath);
            await this.page.locator(loc.firstVerifyIcon).first().click();
        });
        await this.wait(2000);

        for (const [index, uploadId] of [[1, 4], [2, 5], [3, 6], [4, 7]]) {
            await this.step(`KYC Document ${index + 1}`, filePath, async () => {
                await this.page.getByText('Browse files to attach').nth(index).click();
                await this.page.locator(`#docUpload-document-upload-${uploadId}`).setInputFiles(filePath);
                await this.page.locator(loc.kycVerifyIcon).first().click();
            });
            await this.wait(2000);
        }

        await this.step('KYC Document 6', filePath, async () => {
            await this.page.getByText('Browse files to attach').nth(5).click();
            await this.page.locator('#docUpload-document-upload-8').setInputFiles(filePath);
            await this.page.locator(loc.kycVerifyBox).first().click();
        });
        await this.wait(2000);

        await this.step('KYC Document 7', filePath, async () => {
            await this.page.locator(loc.kycTextLink).first().click();
            await this.page.locator('#docUpload-document-upload-9').setInputFiles(filePath);
            await this.page.locator(loc.kycVerifyIcon).first().click();
        });
        await this.wait(2000);

        await this.step('KYC Document 8', filePath, async () => {
            await this.page.locator(loc.kycTextLink).click();
            await this.page.locator('#docUpload-document-upload-10').setInputFiles(filePath);
        });
        await this.wait(2000);

        await this.submit();
    }

    async selectNetWorthRange(value) {
        await this.step('Net Worth Range', value, async () => {
            await this.page.locator(loc.netWorthSelectArrow).click();
            await this.page.getByRole('option', { name: value }).click();
        });
    }

    async uploadNetWorthDocuments(filePath) {
        await this.step('Net Worth Document 1', filePath, async () => {
            await this.page.locator(loc.cloudUploadIcon).first().click();
            await this.page.getByLabel(loc.cloudUploadLabel).first().setInputFiles(filePath);
        });
        await this.wait(2000);

        await this.step('Net Worth Document 2', filePath, async () => {
            await this.page.getByText('Browse', { exact: true }).click();
            await this.page.getByLabel(loc.cloudUploadLabel).setInputFiles(filePath);
        });
        await this.wait(2000);

        await this.submit();
    }

    // 6 further "Browse files to attach" rows in the section after the net-worth documents
    async uploadBankDocuments(filePath) {
        for (let index = 0; index < 6; index++) {
            await this.step(`Bank Document ${index + 1}`, filePath, async () => {
                await this.page.getByText('Browse files to attach').nth(index).click();
                await this.page.getByLabel(loc.browseFilesLabel).nth(index).setInputFiles(filePath);
            });
            await this.wait(2000);
        }

        await this.submit();
    }
}

module.exports = PromotersPage;
