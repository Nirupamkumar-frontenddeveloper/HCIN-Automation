require('dotenv').config();

const { test, expect } = require('@playwright/test');
const LoginPage = require('../../pages/LoginPage');
const ProgramsPage = require('../../pages/ProgramsPage');
const users = require('../../utils/users');

// Anchor to search for in "Search PAN or OEM Name" - resolves to the single match
// "AAACH2364M - HYUNDAI MOTOR INDIA LIMITED" in this dev environment
const PAN_SEARCH_TEXT = 'Hyundai';

// Required-field validation messages confirmed live on the Basic tab (only surfaced
// once the whole form is touched via a Submit attempt - clicking "Next" from an empty
// Basic tab does NOT validate anything, this app only validates on Submit)
const REQUIRED_FIELD_ERRORS = [
    'Program Name is required.',
    'Offer Closing Date is required.',
    'Program/Size Limit is required.',
    'Sanctioned date is required.',
    'Max Tenor (In Months) is required.',
    'Dealer Min Limit is required.',
    'Dealer Max Limit is required.',
    'Min. Vintage with OEM (In Months) is required.'
];

function todayParts() {
    const now = new Date();
    return {
        day: now.getDate(),
        month: now.toLocaleString('en-US', { month: 'long' }),
        year: now.getFullYear()
    };
}

test('Create Term Loan Program with Hyundai PAN', {
    annotation: {
        type: 'description',
        description: 'Logs in as Sales RM and creates a new Program with Product Type "Term Loan" against the Hyundai PAN/anchor. Verifies mandatory-field validation (Program Name, Offer Closing Date, Program/Size Limit, Sanctioned date, Max Tenor, Dealer Min/Max Limit, Min Vintage) and the Processing Fee percentage business-rule limit (max 0.25%) before submitting valid data, then confirms the program is actually created by finding it in the Programs > All List with the correct Product Type and Anchor Name.'
    }
}, async ({ page }, testInfo) => {

    test.setTimeout(180000);

    const loginPage = new LoginPage(page);
    const programsPage = new ProgramsPage(page);
    const today = todayParts();
    const programName = `Term Loan Automation ${Date.now().toString().slice(-8)}`;

    try {
        await loginPage.openLOS();
        await loginPage.login(users.salesRM.username, users.salesRM.password);
        await programsPage.toggleSidebar();

        await programsPage.openProgramsMenu();
        await programsPage.openAllPrograms();
        await programsPage.clickAddProgramLink();

        // Anchor/Product/Billing must be set for the rest of the Term Loan-specific form
        // to render at all, so these three are filled before the validation checks below
        await programsPage.selectAnchorByPanSearch(PAN_SEARCH_TEXT);
        await programsPage.selectProductType('Term Loan');
        await programsPage.selectBillingType('Monthly');

        // --- Mandatory-field validation: attempt Submit with everything else empty ---
        await programsPage.clickNext();
        await programsPage.switchToFinancingTab();
        await programsPage.openChargesTab();
        await programsPage.clickSubmit();

        expect(page.url(), 'an invalid submission should not navigate away from the create form').toContain('/program-module/create');

        await programsPage.switchToBasicTab();
        for (const message of REQUIRED_FIELD_ERRORS) {
            await expect(page.getByText(message), `expected required-field validation: "${message}"`).toBeVisible();
        }

        // --- Fill in valid data for every required field ---
        await programsPage.fillProgramName(programName);
        await programsPage.pickOfferClosingDate(today);
        await programsPage.fillProgramSizeLimit('50000000');
        await programsPage.pickSanctionedDate(today);
        await programsPage.fillMaxTenor('36');
        await programsPage.fillDealerMinLimit('100000');
        await programsPage.fillDealerMaxLimit('5000000');
        await programsPage.fillMinVintage('12');
        await programsPage.clickNext();

        await programsPage.fillFinancingTenor('36');
        await programsPage.openInterestTab();
        await programsPage.fillInterestRoi('10.5');
        await programsPage.openChargesTab();

        // --- Numeric-limit business validation: Processing Fee caps at 0.25% ---
        await programsPage.fillCharges('2', '2');
        await programsPage.clickSubmit();

        expect(page.url(), 'an over-limit Processing Fee should block submission').toContain('/program-module/create');
        await expect(page.getByText('Maximum value is 0.25%'), 'expected the Processing Fee percentage limit message').toBeVisible();

        // --- Correct the Processing Fee and submit for real ---
        await programsPage.fillCharges('2', '0.25');
        await programsPage.clickSubmit();

        await expect(page).toHaveURL(/\/program-module\/list/, { timeout: 15000 });

        // --- Verify the program was actually created with the expected details ---
        const row = await programsPage.findProgramRow(programName);
        await expect(row, 'the newly-created program should appear in the Programs > All List').toBeVisible();

        const rowText = await row.textContent();
        expect(rowText, 'Product Type should be Term Loan').toContain('Term Loan');
        expect(rowText.toUpperCase(), 'Anchor Name should be the Hyundai OEM').toContain('HYUNDAI');
    } finally {
        await testInfo.attach('field-report', {
            body: JSON.stringify(programsPage.fieldReport),
            contentType: 'application/json'
        });
    }

});
