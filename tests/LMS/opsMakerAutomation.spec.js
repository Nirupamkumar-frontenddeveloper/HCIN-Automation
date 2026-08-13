require('dotenv').config();

const { test } = require('@playwright/test');
const LmsLoginPage = require('../../pages/LMS/LmsLoginPage');
const LmsOemDetailsPage = require('../../pages/LMS/LmsOemDetailsPage');
const LmsLimitDetailsPage = require('../../pages/LMS/LmsLimitDetailsPage');
const LmsProgramsPage = require('../../pages/LMS/LmsProgramsPage');
const LmsRelationshipPage = require('../../pages/LMS/LmsRelationshipPage');
const users = require('../../utils/users');

// Reference records that already exist in the dev environment - this is a pure
// navigation smoke test (view/edit existing screens), not a data-creation test,
// so these are fixed rather than Excel-driven
const KIA_OEM_NAME = 'KIA INDIA PRIVATE LIMITED';
const HYUNDAI_OEM_NAME = 'HYUNDAI MOTOR INDIA LIMITED';
const PROGRAM_CODE = 'TDM_HMIL_12082026153010';
const ENTITY_ROW = 'DEEP INDIA ENTERPRISES';
const RELATIONSHIP_ROW = '9100003 Sunlife Hyundai';
const PRODUCT_ROW = 'Spare Parts Loan';

test('Ops Maker Automation', {
    annotation: {
        type: 'description',
        description: 'Logs in as LMS Ops Maker and exercises menu navigation across OEM Details (OEM List view/edit sections + add entries, Dealer List view + OEM status change), Limit Details (Manage Entity/Relationship/Product/Group Limit), Programs (view, OEM Auth Matrix, View Relationships, search/filter), and opens the Relationship menu. Pure navigation smoke test - any edit forms opened are cancelled, not saved.'
    }
}, async ({ page }, testInfo) => {

    // This flow has 100+ steps across 5 modules, each now including a settle-wait - well
    // beyond the project's default 60s test timeout
    test.setTimeout(300000);

    const loginPage = new LmsLoginPage(page);
    const oemDetailsPage = new LmsOemDetailsPage(page);
    const limitDetailsPage = new LmsLimitDetailsPage(page);
    const programsPage = new LmsProgramsPage(page);
    const relationshipPage = new LmsRelationshipPage(page);

    try {
        await loginPage.openLMS();
        await loginPage.login(users.lmsOpsMaker.username, users.lmsOpsMaker.password);
        await oemDetailsPage.toggleSidebar();

        // --- OEM Details: OEM List ---
        await oemDetailsPage.openOemDetailsMenu();
        await oemDetailsPage.openOemList();
        await oemDetailsPage.openAllListTab();
        await oemDetailsPage.openRow(KIA_OEM_NAME);
        await oemDetailsPage.clickView();
        await oemDetailsPage.viewAllSections();

        await oemDetailsPage.clickEdit();
        await oemDetailsPage.openCreditRatingInformation();
        await oemDetailsPage.clickAddCreditRating();
        await oemDetailsPage.openCreditRatingInformation();
        await oemDetailsPage.openAddressInformation();
        await oemDetailsPage.clickAddAddress();
        await oemDetailsPage.openContactInformation();
        await oemDetailsPage.clickAddContact();
        await oemDetailsPage.openBankInformation();
        await oemDetailsPage.clickAddBank();
        await oemDetailsPage.goBackText();

        // --- OEM Details: Dealer List ---
        await oemDetailsPage.openDealerList();
        await oemDetailsPage.selectDealerOem(KIA_OEM_NAME);
        await oemDetailsPage.openMoreMenu();
        await oemDetailsPage.clickViewMenuItem();
        await oemDetailsPage.viewAllSections();
        await oemDetailsPage.goBackText();

        await oemDetailsPage.selectDealerOem(HYUNDAI_OEM_NAME);
        await oemDetailsPage.openChangeStatus();
        await oemDetailsPage.selectCheckerStatus('INACTIVE');
        await oemDetailsPage.clickCancel();

        // --- Limit Details: Manage Entity Limit ---
        await limitDetailsPage.openLimitDetailsMenu();
        await limitDetailsPage.openManageEntityLimit();
        await limitDetailsPage.openProgramFilterDropdown();
        await limitDetailsPage.selectProgramOption(`${PROGRAM_CODE} -`);
        await limitDetailsPage.openAllListTab();
        await limitDetailsPage.openRow(ENTITY_ROW);
        await limitDetailsPage.clickView();
        await limitDetailsPage.clickBackButton();

        await limitDetailsPage.openRow(ENTITY_ROW);
        await limitDetailsPage.clickEditExactText();

        await limitDetailsPage.gotoProgramLimitScreen();
        // This screen defaults to the "Awaiting Approval" tab (empty) rather than "All
        // List" where the data actually is, so switch tabs before filtering by status
        await limitDetailsPage.openAllListTab();
        await limitDetailsPage.clickActiveCellFilter();
        await limitDetailsPage.openRow(PROGRAM_CODE);
        await limitDetailsPage.clickViewMenuItemNamed('anchor View');
        await limitDetailsPage.clickBackButton();

        await limitDetailsPage.openRow(PROGRAM_CODE);
        await limitDetailsPage.clickEditDivFilter();
        await limitDetailsPage.clickBackButton();

        // --- Limit Details: Manage Relationship Limit ---
        await limitDetailsPage.openManageRelationshipLimit();
        await limitDetailsPage.clickAllListButton();
        await limitDetailsPage.openRow(RELATIONSHIP_ROW);
        await limitDetailsPage.clickEditDivFilter();
        await limitDetailsPage.clickSubmitBackText();
        await limitDetailsPage.clickBackButton();

        await limitDetailsPage.openRow(RELATIONSHIP_ROW);
        await limitDetailsPage.openFreezeLimitMenuItem();
        await limitDetailsPage.clickRemarksField();
        await limitDetailsPage.clickCancel();

        // --- Limit Details: Manage Product Limit ---
        await limitDetailsPage.openManageProductLimit();
        await limitDetailsPage.clickAllListButton();
        await limitDetailsPage.openRow(PRODUCT_ROW);
        await limitDetailsPage.clickView();
        await limitDetailsPage.clickBackButton();

        // --- Limit Details: Manage Group Limit ---
        await limitDetailsPage.openManageGroupLimit();
        await limitDetailsPage.clickAllListButton();
        await limitDetailsPage.clickAwaitingApproval();

        // --- Programs ---
        await programsPage.openProgramsMenu();
        await programsPage.openAllPrograms();
        await programsPage.openAllListTab();
        await programsPage.openRow(PROGRAM_CODE);
        await programsPage.clickView();
        await programsPage.clickBackButton();

        await programsPage.openAllListTab();
        await programsPage.openRow(PROGRAM_CODE);
        await programsPage.openOemAuthMatrix();
        await programsPage.clickFormBackButton();

        await programsPage.openAllListTab();
        await programsPage.openRow(PROGRAM_CODE);
        await programsPage.openViewRelationships();

        await programsPage.openAllListTab();
        await programsPage.openMoreMenu();
        await programsPage.clickView();
        await programsPage.clickBackButton();

        await programsPage.clickAdvanceSearch();
        await programsPage.clickClearFilter();
        await programsPage.openAllProgramsDivFilter();
        await programsPage.openAddProgramsDivFilter();
        await programsPage.clickBackButton();

        // --- Relationship (menu opened only - recording cuts off here) ---
        await relationshipPage.openRelationshipMenu();
    } finally {
        // Attach the combined field-by-field pass/fail results so the Word reporter can render them,
        // even when the test fails partway through
        const fieldReport = [
            ...oemDetailsPage.fieldReport,
            ...limitDetailsPage.fieldReport,
            ...programsPage.fieldReport,
            ...relationshipPage.fieldReport
        ];
        await testInfo.attach('field-report', {
            body: JSON.stringify(fieldReport),
            contentType: 'application/json'
        });
    }

});
