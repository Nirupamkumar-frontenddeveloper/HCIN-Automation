require('dotenv').config();

const path = require('path');
const { test } = require('@playwright/test');
const LoginPage = require('../pages/LoginPage');
const CreateLeadPage = require('../pages/CreateLeadPage');
const users = require('../utils/users');
const { readKeyValueSheet } = require('../utils/excelReader');

// Test data lives in an Excel sheet (Field / Value columns) instead of hardcoded JS
const excelPath = path.join(__dirname, '../fixtures/companyLeadData.xlsx');
const sampleDoc = path.join(__dirname, '../fixtures/sample-document.pdf');

const raw = readKeyValueSheet(excelPath);

const entity = {
    gstin: raw.gstin,
    entityName: raw.entityName,
    tradeName: raw.tradeName,
    incomeRange: raw.incomeRange,
    cin: raw.cin,
    dobDay: raw.dobDay,
    dobMonth: raw.dobMonth,
    dobYear: raw.dobYear,
    lei: raw.lei,
    leiExpiryDate: raw.leiExpiryDate,
    isListed: raw.isListed,
    natureOfBusiness: raw.natureOfBusiness
};

const keyPerson = {
    salutation: raw.keyPersonSalutation,
    name: raw.keyPersonName,
    designation: raw.keyPersonDesignation,
    mobile: raw.keyPersonMobile,
    email: raw.keyPersonEmail
};

const address = {
    type: raw.addressType,
    line1: raw.addressLine1,
    pincode: raw.pincode
};

const program = {
    outletCode: raw.outletCode,
    mainDealerCode: raw.mainDealerCode,
    radioName: raw.programRadioName,
    proposedLimit: raw.proposedLimit
};

test('Create New Company Lead', async ({ page }) => {

    const loginPage = new LoginPage(page);
    const leadPage = new CreateLeadPage(page);

    // Login (each test gets its own isolated browser context, so this always logs in fresh)
    await loginPage.openLOS();
    await loginPage.login(users.salesRM.username, users.salesRM.password);

    // Entity details
    await leadPage.createNewLead();
    await leadPage.selectNewCustomer();
    await leadPage.selectManufacturer(raw.manufacturer);
    await leadPage.fillEntityDetails(entity);

    // Key person details
    await leadPage.fillKeyPersonDetails(keyPerson);

    // Address & program details
    await leadPage.fillAddressDetails(address);
    await leadPage.fillProgramDetails(program);

    // Document upload & remarks
    await leadPage.uploadDocument(sampleDoc);
    await leadPage.fillRemarks(raw.remarks);
    await leadPage.submit();

    // Follow-up section
    await leadPage.fillFollowUpEmail(raw.followUpEmail);
    await leadPage.submit();

});
