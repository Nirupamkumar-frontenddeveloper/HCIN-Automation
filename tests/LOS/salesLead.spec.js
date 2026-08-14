require('dotenv').config();

const path = require('path');
const { test } = require('@playwright/test');
const LoginPage = require('../../pages/LoginPage');
const CreateLeadPage = require('../../pages/CreateLeadPage');
const SearchLeadPage = require('../../pages/SearchLeadPage');
const LoanApplicationEditPage = require('../../pages/LoanApplicationEditPage');
const users = require('../../utils/users');
const { readKeyValueSheet } = require('../../utils/excelReader');
const { generateGSTIN, generateCIN, generateEntityName } = require('../../utils/uniqueTestData');

// Same fixture as 2-onboardCompanyLead.spec.js - only gstin/cin/entityName/pincode are
// overridden below. Add rows to this sheet for Edit Loan Application tab field labels
// (as seen on a run) to have LoanApplicationEditPage use real values instead of guesses.
const excelPath = path.join(__dirname, '../../fixtures/companyLeadData.xlsx');
const sampleDoc = path.join(__dirname, '../../fixtures/sample-document.pdf');

test('Sales Lead - Create Lead, Search Loan Application, Edit Lead', {
    annotation: {
        type: 'description',
        description: 'Logs in as Sales RM, creates a new lead (OEM = Hyundai, Pincode = 812001, verifying District/City/State auto-populate), captures the generated lead name, searches for it under Leads > Loan Applications, opens it via Action > Edit, and fills every mandatory field across each tab of the Edit Loan Application wizard using fixtures/sample-document.pdf wherever a file upload is required.'
    }
}, async ({ page }, testInfo) => {

    // Multi-tab wizard with document uploads - well beyond the project's default 60s test timeout
    test.setTimeout(300000);

    const raw = readKeyValueSheet(excelPath);

    const entity = {
        gstin: generateGSTIN(),
        entityName: generateEntityName('SalesLead'),
        tradeName: raw.tradeName,
        constitution: raw.constitution,
        incomeRange: raw.incomeRange,
        cin: generateCIN(),
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
        pincode: '812001'
    };

    const program = {
        outletCode: raw.outletCode,
        mainDealerCode: raw.mainDealerCode,
        radioName: raw.programRadioName,
        proposedLimit: raw.proposedLimit
    };

    const loginPage = new LoginPage(page);
    const leadPage = new CreateLeadPage(page);
    const searchLeadPage = new SearchLeadPage(page);
    const editPage = new LoanApplicationEditPage(page);

    try {
        // 1. Login
        await loginPage.openLOS();
        await loginPage.login(users.salesRM.username, users.salesRM.password);

        // 2. Create Lead
        await leadPage.createNewLead();
        await leadPage.selectNewCustomer();
        await leadPage.selectManufacturer(raw.manufacturer);
        await leadPage.fillEntityDetails(entity);
        await leadPage.fillKeyPersonDetails(keyPerson);
        await leadPage.fillAddressDetails(address);
        await leadPage.fillProgramDetails(program);
        await leadPage.uploadDocument(sampleDoc);
        await leadPage.fillRemarks(raw.remarks);
        await leadPage.verifyNoValidationErrors();
        await leadPage.submit();

        await leadPage.fillFollowUpEmail(raw.followUpEmail);
        await leadPage.submit();

        // 3. Capture lead name
        await leadPage.captureLeadName(entity.entityName);

        // 4. Search under Loan Application
        await searchLeadPage.openLeadsLoanApplications();
        await searchLeadPage.searchEntity(leadPage.capturedLeadName);

        // 5. Action > Edit
        await searchLeadPage.openLeadEditAction();

        // 6. Fill every tab of the Edit Loan Application wizard
        await editPage.fillAllTabs(sampleDoc, raw);
    } finally {
        const fieldReport = [
            ...leadPage.fieldReport,
            ...searchLeadPage.fieldReport,
            ...editPage.fieldReport
        ];
        await testInfo.attach('field-report', {
            body: JSON.stringify(fieldReport),
            contentType: 'application/json'
        });
    }

});
