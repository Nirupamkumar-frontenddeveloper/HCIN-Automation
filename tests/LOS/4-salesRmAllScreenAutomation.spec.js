require('dotenv').config();

const { test } = require('@playwright/test');
const LoginPage = require('../../pages/LoginPage');
const OemPage = require('../../pages/OemPage');
const ProgramsPage = require('../../pages/ProgramsPage');
const users = require('../../utils/users');

// Reference records that already exist in the dev environment - this is a pure
// navigation smoke test (view/edit existing screens), not a data-creation test,
// so these are fixed rather than Excel-driven
const OEM_NAME = 'KIA INDIA PRIVATE LIMITED';
const FIRST_PROGRAM_ROW = 'TDM_HY_28072026104415';
const SECOND_PROGRAM_ROW = 'TDM_KI_27072026120349';
const EDIT_WIZARD_STEPS = 6;

test('Sales RM - OEM & Programs Menu Navigation', {
    annotation: {
        type: 'description',
        description: 'Logs in as Sales RM and exercises the OEM and Programs menu navigation end-to-end: views an OEM record\'s Credit Rating/Address/Contact/Bank Information sections, edits it, then views a program\'s Structure/Financing/Other sections and edits another program through its full step wizard to Submit. Pure navigation smoke test - no new data is created.'
    }
}, async ({ page }, testInfo) => {

    const loginPage = new LoginPage(page);
    const oemPage = new OemPage(page);
    const programsPage = new ProgramsPage(page);

    try {
        await loginPage.openLOS();
        await loginPage.login(users.salesRM.username, users.salesRM.password);
        await oemPage.toggleSidebar();

        // OEM module - view an existing OEM's detail sections
        await oemPage.openOemMenu();
        await oemPage.openOemList();
        await oemPage.openOem(OEM_NAME);
        await oemPage.clickView();
        await oemPage.openCreditRatingInformation();
        await oemPage.openAddressInformation();
        await oemPage.openContactInformation();
        await oemPage.openBankInformation();

        // Edit the same OEM and browse a couple of sections again
        await oemPage.clickEdit();
        await oemPage.openContactInformation();
        await oemPage.openContactInformation();
        await oemPage.openBankInformation();
        await oemPage.goBack();

        // Re-open the same OEM directly into edit mode from the list
        await oemPage.openOem(OEM_NAME);
        await oemPage.clickEditFromList();
        await oemPage.openContactInformation();
        await oemPage.goBack();

        // Programs module - view an existing program's detail sections
        await programsPage.openProgramsMenu();
        await programsPage.openAllPrograms();
        await programsPage.openAllListTab();
        await programsPage.openProgramRow(FIRST_PROGRAM_ROW);
        await programsPage.clickView();
        await programsPage.openStructureStep();
        await programsPage.openFinancingTab();
        await programsPage.openOtherTab();
        await programsPage.clickBackButton();

        // Edit a different program through its full step wizard to Submit
        await programsPage.openAllListTab();
        await programsPage.openProgramRow(SECOND_PROGRAM_ROW);
        await programsPage.clickEditFromList();
        await programsPage.goThroughWizard(EDIT_WIZARD_STEPS);
        await programsPage.clickSubmit();
        await programsPage.clickBackButton();
    } finally {
        // Attach the combined field-by-field pass/fail results so the Word reporter can render them,
        // even when the test fails partway through
        const fieldReport = [
            ...oemPage.fieldReport,
            ...programsPage.fieldReport
        ];
        await testInfo.attach('field-report', {
            body: JSON.stringify(fieldReport),
            contentType: 'application/json'
        });
    }

});
