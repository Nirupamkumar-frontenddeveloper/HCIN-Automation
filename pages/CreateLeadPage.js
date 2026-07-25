const loc = require('../locators/leadLocators');

// Page object for the "Create New Lead" flow for a company / corporate entity
class CreateLeadPage {

    constructor(page) {
        this.page = page;
    }

    // Resolve a locator entry that is either a { role, name } descriptor or a plain selector string
    byRole(descriptor, options = {}) {
        return this.page.getByRole(descriptor.role, { name: descriptor.name, ...options });
    }

    async createNewLead() {
        await this.byRole(loc.createNewLeadBtn).click();
    }

    async selectNewCustomer() {
        await this.byRole(loc.newCustomerRadio).check();
    }

    async selectManufacturer(name) {
        await this.page.locator(loc.matSelectPlaceholder).first().click();
        await this.page.getByRole('option', { name, exact: true }).click();
    }

    async fillGSTIN(gstin) {
        await this.byRole(loc.gstinInput).fill(gstin);
    }

    async fillEntityName(name) {
        await this.byRole(loc.entityNameInput).fill(name);
    }

    async fillTradeName(tradeName) {
        await this.byRole(loc.tradeNameInput).fill(tradeName);
    }

    async selectIncomeRange(range) {
        await this.page.locator(loc.incomeRangeText).click();
        await this.page.getByRole('option', { name: range }).click();
    }

    async fillCIN(cin) {
        await this.byRole(loc.cinInput).fill(cin);
    }

    // Calendar picker for the incorporation date
    async pickDate({ day, month, year }) {
        await this.byRole(loc.openCalendarBtn).first().click();
        await this.byRole(loc.chooseMonthYearBtn).click();
        await this.page.getByRole('button', { name: String(year) }).click();
        await this.page.getByRole('button', { name: month }).click();
        await this.page.getByRole('button', { name: day }).click();
    }

    async fillLEI(lei) {
        await this.byRole(loc.leiInput).fill(lei);
    }

    async fillLEIExpiryDate(date) {
        await this.byRole(loc.leiExpiryDateInput).fill(date);
    }

    async selectListedStatus(value) {
        await this.page.locator(loc.listedSelect).click();
        await this.page.getByRole('option', { name: value }).click();
    }

    async fillNatureOfBusiness(text) {
        await this.byRole(loc.natureOfBusinessInput).fill(text);
    }

    async clickFetch() {
        await this.byRole(loc.fetchBtn).click();
    }

    async fillEntityDetails(entity) {
        await this.fillGSTIN(entity.gstin);
        await this.fillEntityName(entity.entityName);
        await this.fillTradeName(entity.tradeName);
        await this.selectIncomeRange(entity.incomeRange);
        await this.fillCIN(entity.cin);
        await this.pickDate({ day: entity.dobDay, month: entity.dobMonth, year: entity.dobYear });
        await this.fillLEI(entity.lei);
        await this.fillLEIExpiryDate(entity.leiExpiryDate);
        await this.selectListedStatus(entity.isListed);
        await this.fillNatureOfBusiness(entity.natureOfBusiness);
        await this.clickFetch();
    }

    async fillKeyPersonDetails(keyPerson) {
        await this.page.locator(loc.matSelectPlaceholder).first().click();
        await this.page.getByRole('option', { name: keyPerson.salutation }).click();

        await this.byRole(loc.keyPersonNameInput).fill(keyPerson.name);
        await this.byRole(loc.designationInput).fill(keyPerson.designation);
        await this.byRole(loc.keyPersonMobileInput).fill(keyPerson.mobile);
        await this.byRole(loc.keyPersonEmailInput).fill(keyPerson.email);
    }

    async selectAddressType(type) {
        await this.page.locator(loc.addressTypeDropdown).first().click();
        await this.page.getByRole('option', { name: type }).click();
    }

    async fillAddressDetails(address) {
        await this.selectAddressType(address.type);
        await this.byRole(loc.addressLine1Input).fill(address.line1);
        await this.byRole(loc.pincodeInput).fill(address.pincode);
        await this.page.locator(loc.pincodeBlurArea).click();
    }

    async fillProgramDetails(program) {
        await this.byRole(loc.outletCodeInput).fill(program.outletCode);
        await this.byRole(loc.mainDealerCodeInput).fill(program.mainDealerCode);
        await this.page.getByRole('radio', { name: program.radioName }).click();
        await this.byRole(loc.proposedLimitInput).fill(program.proposedLimit);
    }

    async uploadDocument(filePath) {
        await this.page.locator(loc.browseFilesText).first().click();
        await this.page.getByLabel(/Browse files to attach/).setInputFiles(filePath);
    }

    async fillRemarks(remarks) {
        await this.byRole(loc.remarksInput).fill(remarks);
    }

    async submit() {
        await this.byRole(loc.submitBtn).click();
    }

    async fillFollowUpEmail(email) {
        await this.byRole(loc.followUpEmailInput).fill(email);
    }
}

module.exports = CreateLeadPage;
