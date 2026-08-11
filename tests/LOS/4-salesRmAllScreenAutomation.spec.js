require('dotenv').config();

const { test } = require('@playwright/test');
const LoginPage = require('../../pages/LoginPage');
const OemPage = require('../../pages/OemPage');
const ProgramsPage = require('../../pages/ProgramsPage');
const CasesPage = require('../../pages/CasesPage');
const ConfigurationPage = require('../../pages/ConfigurationPage');
const users = require('../../utils/users');

// Reference records that already exist in the dev environment - this is a pure
// navigation smoke test (view/edit existing screens), not a data-creation test,
// so these are fixed rather than Excel-driven
const OEM_NAME = 'KIA INDIA PRIVATE LIMITED';
const FIRST_PROGRAM_ROW = 'IM_HMIL_29062026171016';
const SECOND_PROGRAM_ROW = 'IM_KIPL_29062026165643';
const EDIT_WIZARD_STEPS = 6;
const CASE_ROW = 'Hridya Cars Private';

test('Sales RM All Screen Automation', {
    annotation: {
        type: 'description',
        description: 'Logs in as Sales RM and exercises menu navigation across OEM, Programs, Cases, and Configuration end-to-end: OEM record view/edit sections, a program view + a full edit-wizard-to-Submit, a post-underwriting case view plus browsing Rejected/Credit Returned/Ops Returned Cases, and Configuration > Masters (downloading a master file) followed by the Dynamic Field screen. Pure navigation smoke test - no new data is created.'
    }
}, async ({ page }, testInfo) => {

    const loginPage = new LoginPage(page);
    const oemPage = new OemPage(page);
    const programsPage = new ProgramsPage(page);
    const casesPage = new CasesPage(page);
    const configurationPage = new ConfigurationPage(page);

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

        // Cases module - view a post-underwriting case, then browse the other Cases sub-menus
        await casesPage.openCasesMenu();
        await casesPage.openPostUnderwritingCases();
        await casesPage.openCaseRow(CASE_ROW);
        await casesPage.clickViewMenuItem();
        await casesPage.clickBackButton();
        await casesPage.openRejectedCases();
        await casesPage.openCreditReturnedCases();
        await casesPage.openOpsReturnedCases();

        // Configuration module - Masters (downloads a master file) then Dynamic Field screen
        await configurationPage.openConfigurationMenu();
        await configurationPage.openMasters();
        await configurationPage.selectMasterAndDownload();
        await configurationPage.openDynamicFieldScreen();
    } finally {
        // Attach the combined field-by-field pass/fail results so the Word reporter can render them,
        // even when the test fails partway through
        const fieldReport = [
            ...oemPage.fieldReport,
            ...programsPage.fieldReport,
            ...casesPage.fieldReport,
            ...configurationPage.fieldReport
        ];
        await testInfo.attach('field-report', {
            body: JSON.stringify(fieldReport),
            contentType: 'application/json'
        });
    }

});
