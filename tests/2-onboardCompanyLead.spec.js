require('dotenv').config();

const path = require('path');
const { test } = require('@playwright/test');
const LoginPage = require('../pages/LoginPage');
const CreateLeadPage = require('../pages/CreateLeadPage');
const users = require('../utils/users');
const { readKeyValueSheet, updateKeyValueSheet } = require('../utils/excelReader');
const { generateGSTIN, generateCIN } = require('../utils/uniqueTestData');

// Test data lives in an Excel sheet (Field / Value columns) instead of hardcoded JS
const excelPath = path.join(__dirname, '../fixtures/companyLeadData.xlsx');
const sampleDoc = path.join(__dirname, '../fixtures/sample-document.pdf');

// Disabled for now - see tests/LOS/4-salesRmNavigation.spec.js for the current focus.
// Re-enable by changing test.skip back to test.
test.skip('Create New Company Lead', {
    annotation: {
        type: 'description',
        description: 'Logs in as Sales RM, creates a new lead for a company/corporate entity (GSTIN, CIN, LEI, key person, address & program details), uploads a KYC document and submits it, using test data read from fixtures/companyLeadData.xlsx. A fresh GSTIN/CIN are generated and written back to the same file each run so the lead is never rejected as a duplicate - the entity name itself stays exactly as set in the sheet, since duplicate detection is keyed on GSTIN/CIN, not the name.'
    }
}, async ({ page }, testInfo) => {

    // Read the sheet fresh at run time (not at module load) so this always reflects
    // the latest file on disk, then mint unique identifiers and persist them back -
    // 3-addPromoterDetails.spec.js reads this same file at its own run time, so it
    // will search for the exact entity created here
    const raw = readKeyValueSheet(excelPath);

    // Only GSTIN/CIN need to be unique per run to avoid duplicate-lead rejection -
    // the entity name itself is left exactly as set in the sheet, no suffix appended
    const uniqueValues = {
        gstin: generateGSTIN(),
        cin: generateCIN()
    };
    updateKeyValueSheet(excelPath, uniqueValues);
    Object.assign(raw, uniqueValues);

    const entity = {
        gstin: raw.gstin,
        entityName: raw.entityName,
        tradeName: raw.tradeName,
        constitution: raw.constitution,
        incomeRange: raw.incomeRange,
        cin: raw.cin,
        dobDay: raw.dobDay,
        dobMonth: raw.dobMonth,
        dobYear: raw.dobYear,
        lei: raw.lei,
        leiExpiryDate: raw.leiExpiryDate,
        leiApplicability: raw.leiApplicability,
        msmeApplicability: raw.msmeApplicability,
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

    const loginPage = new LoginPage(page);
    const leadPage = new CreateLeadPage(page);

    try {
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
    } finally {
        // Attach the field-by-field pass/fail results so the Word reporter can render them,
        // even when the test fails partway through
        await testInfo.attach('field-report', {
            body: JSON.stringify(leadPage.fieldReport),
            contentType: 'application/json'
        });
    }

});
