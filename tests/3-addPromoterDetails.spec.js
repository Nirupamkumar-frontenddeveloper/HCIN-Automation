require('dotenv').config();

const path = require('path');
const { test } = require('@playwright/test');
const LoginPage = require('../pages/LoginPage');
const SearchLeadPage = require('../pages/SearchLeadPage');
const PromotersPage = require('../pages/PromotersPage');
const users = require('../utils/users');
const { readKeyValueSheet } = require('../utils/excelReader');

// Same fixture as the lead-creation test - this flow searches for the lead
// created there (by its entityName) and adds promoter/director details to it
const excelPath = path.join(__dirname, '../fixtures/companyLeadData.xlsx');
const sampleDoc = path.join(__dirname, '../fixtures/sample-document.pdf');

// Disabled for now - see tests/LOS/4-salesRmNavigation.spec.js for the current focus.
// Re-enable by changing test.skip back to test.
test.skip('Add Promoter/Director Details to Existing Lead', {
    annotation: {
        type: 'description',
        description: 'Logs in as Sales RM, searches for the lead created by onboardCompanyLead.spec.js (by its entityName), opens its "Promoters, Owners & Management" section, adds a director\'s personal details, uploads their KYC/net-worth/bank documents, and submits - using the same fixtures/companyLeadData.xlsx as the lead-creation test.'
    }
}, async ({ page }, testInfo) => {

    // Read the sheet fresh at run time (not at module load) so this picks up the
    // unique entityName/GSTIN/CIN that 2-onboardCompanyLead.spec.js generated and
    // wrote back to the same file moments earlier in this run
    const raw = readKeyValueSheet(excelPath);

    const director = {
        type: raw.promoterDirectorType,
        pan: raw.promoterPan,
        salutation: raw.promoterSalutation,
        firstName: raw.promoterFirstName,
        lastName: raw.promoterLastName,
        shareholdingPct: raw.promoterShareholdingPct,
        dobDay: raw.promoterDobDay,
        dobMonth: raw.promoterDobMonth,
        dobYear: raw.promoterDobYear,
        gender: raw.promoterGender,
        nationality: raw.promoterNationality,
        incomeRange: raw.promoterIncomeRange,
        din: raw.promoterDin,
        aadhaarLast4: raw.promoterAadhaarLast4,
        mobile: raw.promoterMobile,
        designation: raw.promoterDesignation,
        addressLine1: raw.promoterAddressLine1,
        pincode: raw.promoterPincode
    };

    // This flow fills a full director profile and uploads ~16 documents - well beyond
    // the project's default 60s test timeout
    test.setTimeout(240000);

    const loginPage = new LoginPage(page);
    const searchLeadPage = new SearchLeadPage(page);
    const promotersPage = new PromotersPage(page);

    try {
        // Login (each test gets its own isolated browser context, so this always logs in fresh)
        await loginPage.openLOS();
        await loginPage.login(users.salesRM.username, users.salesRM.password);

        // Find and open the lead created by onboardCompanyLead.spec.js
        await searchLeadPage.openLeadsLoanApplications();
        await searchLeadPage.searchEntity(raw.entityName);
        await searchLeadPage.openLeadView();

        // A freshly-created lead requires the Entity Information form completed first -
        // the Promoters tab only appears after this is submitted
        await promotersPage.completeEntityInformation(raw.entityTelephoneMobile);

        // Promoters, Owners & Management
        await promotersPage.openPromotersTab();
        await promotersPage.addDirector(director);

        // KYC / net-worth / bank documents
        await promotersPage.uploadDirectorKycDocuments(sampleDoc);
        await promotersPage.selectNetWorthRange(raw.promoterNetWorthRange);
        await promotersPage.uploadNetWorthDocuments(sampleDoc);
        await promotersPage.uploadBankDocuments(sampleDoc);
    } finally {
        // Attach the combined field-by-field pass/fail results so the Word reporter can render them,
        // even when the test fails partway through
        const fieldReport = [
            ...searchLeadPage.fieldReport,
            ...promotersPage.fieldReport
        ];
        await testInfo.attach('field-report', {
            body: JSON.stringify(fieldReport),
            contentType: 'application/json'
        });
    }

});
