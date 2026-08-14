const loc = require('../locators/leadLocators');
const BasePage = require('./BasePage');

class CreateLeadPage extends BasePage {

    async createNewLead() {
        await this.step('Create New Lead', '', () => this.byRole(loc.createNewLeadBtn).click());
    }

    async selectNewCustomer() {
        await this.step('Existing/New Customer', 'New Customer', () => this.byRole(loc.newCustomerRadio).check());
    }

    async selectManufacturer(name) {
        await this.step('OEM', name, async () => {
            const oem = this.byRole(loc.oemSelect);
            const option = this.page.getByRole('option', { name, exact: true });

            // The first dropdown on a freshly-loaded page can be slow/flaky to open on
            // the first click - keep clicking until the option list actually renders
            let opened = false;
            for (let attempt = 1; attempt <= 5 && !opened; attempt++) {
                await oem.click();
                opened = await option.first().waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false);
                if (!opened) {
                    await this.page.keyboard.press('Escape').catch(() => {});
                }
            }

            await option.click();
        });
    }

    async fillGSTIN(gstin) {
        await this.step('GSTIN', gstin, () => this.byRole(loc.gstinInput).fill(gstin));
    }

    async fillEntityName(name) {
        await this.step('Entity Name', name, () => this.byRole(loc.entityNameInput).fill(name));
    }

    async fillTradeName(tradeName) {
        await this.step('Trade Name', tradeName, () => this.byRole(loc.tradeNameInput).fill(tradeName));
    }

    async selectConstitution(value) {
        await this.step('Constitution', value, () => this.selectOption(loc.constitutionSelect, value));
    }

    async selectIncomeRange(range) {
        await this.step('Income Range', range, () => this.selectOption(loc.incomeRangeSelect, range));
    }

    async fillCIN(cin) {
        await this.step('CIN', cin, () => this.byRole(loc.cinInput).fill(cin));
    }

    // Calendar picker for the incorporation date
    async pickDate({ day, month, year }) {
        await this.step('DOB / DOI', `${day}-${month}-${year}`, async () => {
            await this.byRole(loc.openCalendarBtn).first().click();
            await this.byRole(loc.chooseMonthYearBtn).click();
            await this.page.getByRole('button', { name: String(year) }).click();
            await this.page.getByRole('button', { name: month }).click();
            await this.page.getByRole('button', { name: `${day} ${month} ${year}`, exact: true }).click();
        });
    }

    async selectLeiApplicability(value) {
        await this.step('LEI Applicability', value, () => this.selectOption(loc.leiApplicabilitySelect, value));
    }

    async fillLEI(lei) {
        await this.step('LEI', lei, () => this.byRole(loc.leiInput).fill(lei));
    }

    async fillLEIExpiryDate(date) {
        await this.step('LEI Expiry Date', date, () => this.byRole(loc.leiExpiryDateInput).fill(date));
    }

    async selectMsmeApplicability(value) {
        await this.step('MSME Applicability', value, () => this.selectOption(loc.msmeApplicabilitySelect, value));
    }

    async fillNatureOfBusiness(text) {
        await this.step('Nature of Business', text, () => this.byRole(loc.natureOfBusinessInput).fill(text));
    }

    async clickFetch() {
        await this.step('Fetch (Dedupe & Group Exposure)', '', () => this.byRole(loc.fetchBtn).click());
    }

    async fillEntityDetails(entity) {
        await this.fillGSTIN(entity.gstin);
        await this.fillEntityName(entity.entityName);
        await this.fillTradeName(entity.tradeName);
        await this.selectConstitution(entity.constitution);
        await this.selectIncomeRange(entity.incomeRange);
        await this.fillCIN(entity.cin);
        await this.pickDate({ day: entity.dobDay, month: entity.dobMonth, year: entity.dobYear });
        await this.selectLeiApplicability(entity.leiApplicability);
        if (entity.leiApplicability === 'Yes') {
            await this.fillLEI(entity.lei);
            await this.fillLEIExpiryDate(entity.leiExpiryDate);
        }
        await this.selectMsmeApplicability(entity.msmeApplicability);
        await this.fillNatureOfBusiness(entity.natureOfBusiness);
        await this.clickFetch();
    }

    async selectSalutation(value) {
        await this.step('Salutation', value, () => this.selectOption(loc.salutationSelect, value));
    }

    async fillKeyPersonName(name) {
        await this.step('Primary Key Person Name', name, () => this.byRole(loc.keyPersonNameInput).fill(name));
    }

    async fillDesignation(designation) {
        await this.step('Designation', designation, () => this.byRole(loc.designationInput).fill(designation));
    }

    async fillKeyPersonMobile(mobile) {
        await this.step('Primary Key Person Mobile', mobile, () => this.byRole(loc.keyPersonMobileInput).fill(mobile));
    }

    async fillKeyPersonEmail(email) {
        await this.step('Primary Key Person Email', email, () => this.byRole(loc.keyPersonEmailInput).fill(email));
    }

    async fillKeyPersonDetails(keyPerson) {
        await this.selectSalutation(keyPerson.salutation);
        await this.fillKeyPersonName(keyPerson.name);
        await this.fillDesignation(keyPerson.designation);
        await this.fillKeyPersonMobile(keyPerson.mobile);
        await this.fillKeyPersonEmail(keyPerson.email);
    }

    async selectAddressType(type) {
        await this.step('Address Type', type, () => this.selectOption(loc.addressTypeSelect, type));
    }

    async fillAddressLine1(line1) {
        await this.step('Address Line 1', line1, () => this.byRole(loc.addressLine1Input).fill(line1));
    }

    async fillPincode(pincode) {
        await this.step('Pincode', pincode, async () => {
            await this.byRole(loc.pincodeInput).fill(pincode);
            await this.page.locator(loc.pincodeBlurArea).click();
        });
    }

    async fillAddressDetails(address) {
        await this.selectAddressType(address.type);
        await this.fillAddressLine1(address.line1);
        await this.fillPincode(address.pincode);
        await this.verifyAddressAutoPopulated();
    }

    // District/City/State should auto-fill from the pincode
    async verifyAddressAutoPopulated() {
        await this.step('Verify District/City/State Auto-populated', 'District, City, State non-empty', async () => {
            await this.wait(1500);
            const district = await this.readFieldValue(/district/i);
            const city = await this.readFieldValue(/city/i);
            const state = await this.readFieldValue(/state/i);
            if (!district || !city || !state) {
                throw new Error(`District/City/State did not auto-populate from pincode (district="${district}", city="${city}", state="${state}")`);
            }
        });
    }

    async verifyNoValidationErrors() {
        await this.step('Verify No Validation Errors Before Submit', '', async () => {
            const { hasErrors, ngInvalidCount, matErrorCount } = await this.hasValidationErrors();
            if (hasErrors) {
                throw new Error(`Form still has ${ngInvalidCount} invalid field(s) / ${matErrorCount} visible error message(s) before submit`);
            }
        });
    }

    async captureLeadName(entityName) {
        await this.step('Lead Name Captured', entityName, async () => {
            this.capturedLeadName = entityName;
        });
    }

    async fillOutletCode(outletCode) {
        await this.step('Outlet Code (Dealer Code)', outletCode, () => this.byRole(loc.outletCodeInput).fill(outletCode));
    }

    async fillMainDealerCode(mainDealerCode) {
        await this.step('Main Dealer Code', mainDealerCode, () => this.byRole(loc.mainDealerCodeInput).fill(mainDealerCode));
    }

    async selectProgram(radioName) {
        await this.step('Program Name', radioName, () => this.page.getByRole('radio', { name: radioName }).click());
    }

    async fillProposedLimit(proposedLimit) {
        await this.step('Proposed Limit', proposedLimit, () => this.byRole(loc.proposedLimitInput).fill(proposedLimit));
    }

    async fillProgramDetails(program) {
        await this.fillOutletCode(program.outletCode);
        await this.fillMainDealerCode(program.mainDealerCode);
        await this.selectProgram(program.radioName);
        await this.fillProposedLimit(program.proposedLimit);
    }

    async uploadDocument(filePath) {
        await this.step('Physical Application File', filePath, async () => {
            await this.page.locator(loc.browseFilesText).first().click();
            await this.page.getByLabel(/Browse files to attach/).setInputFiles(filePath);
        });
    }

    async fillRemarks(remarks) {
        await this.step('Remarks', remarks, () => this.byRole(loc.remarksInput).fill(remarks));
    }

    async submit() {
        await this.step('Submit', '', () => this.byRole(loc.submitBtn).click());
    }

    async fillFollowUpEmail(email) {
        await this.step('Follow-up Email Id', email, () => this.byRole(loc.followUpEmailInput).fill(email));
    }
}

module.exports = CreateLeadPage;
