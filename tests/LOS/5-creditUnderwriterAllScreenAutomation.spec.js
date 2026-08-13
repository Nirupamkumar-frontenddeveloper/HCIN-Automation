require('dotenv').config();

const { test } = require('@playwright/test');
const LoginPage = require('../../pages/LoginPage');
const OnboardingPage = require('../../pages/OnboardingPage');
const OemPage = require('../../pages/OemPage');
const ProgramsPage = require('../../pages/ProgramsPage');
const ReportsPage = require('../../pages/ReportsPage');
const users = require('../../utils/users');

// Reference records that already exist in the dev environment - this is a pure
// navigation smoke test (view existing screens), not a data-creation test,
// so these are fixed rather than Excel-driven
const FIRST_ENTITY = 'KIA INDIA PRIVATE LIMITED';
const SECOND_ENTITY = 'HYUNDAI MOTOR INDIA LIMITED';
// Row names matched here are stable substrings only - dropped the leading row-number/
// badge-count prefixes (e.g. "1 ", "+ 2 ") that were captured at record time, since
// those fluctuate as the list polls/refreshes and would break the getByRole name match
const OEM_ROW = 'KIA INDIA PRIVATE LIMITED';
const PROGRAM_ROW = 'IM_HMIL_29062026171016';

// Pause after every step so each screen stays on-screen long enough to actually
// watch in headed mode, instead of the suite flashing through screens instantly
const STEP_PAUSE_MS = 3000;

// Longer pause for screens that load heavier content (e.g. the program's full
// view after clicking a row) - gives the page time to actually finish rendering
// before the next action, instead of clicking through before it's shown
const LONG_PAUSE_MS = 6000;

test('Credit Underwriter All Screen Automation', {
    annotation: {
        type: 'description',
        description: 'Logs in as Credit Underwriter and exercises menu navigation across Onboarding, OEM, Programs, and Reports end-to-end: views two onboarding entities, views an OEM record via its row menu, views a program\'s Structure/Financing/Other sections, then runs through the System Reports screen - Master\'s Log, Email History, CRILC (downloads Weekly + Monthly), NESL (downloads on open, plus a Download Report button), Bureau, and CIBIL API Audit - before logging out. Pure navigation smoke test - no new data is created. (Underwriting module step skipped.)'
    }
}, async ({ page }, testInfo) => {

    test.setTimeout(240000);

    const pause = () => page.waitForTimeout(STEP_PAUSE_MS);
    const longPause = () => page.waitForTimeout(LONG_PAUSE_MS);

    const loginPage = new LoginPage(page);
    const onboardingPage = new OnboardingPage(page);
    const oemPage = new OemPage(page);
    const programsPage = new ProgramsPage(page);
    const reportsPage = new ReportsPage(page);

    try {
        await loginPage.openLOS();
        await pause();
        await loginPage.login(users.creditUW.username, users.creditUW.password);
        await pause();
        await onboardingPage.toggleSidebar();
        await pause();

        // Onboarding module - view two existing entities
        await onboardingPage.openOnboardingMenu();
        await pause();
        await onboardingPage.openOnboardingList();
        await pause();
        await onboardingPage.selectEntity(FIRST_ENTITY);
        await pause();
        await onboardingPage.openMoreMenu();
        await pause();
        await onboardingPage.clickViewMenuItem();
        await longPause();
        await onboardingPage.goBack();
        await pause();

        await onboardingPage.selectEntity(SECOND_ENTITY);
        await pause();
        await onboardingPage.openMoreMenu();
        await pause();
        await onboardingPage.clickViewMenuItem();
        await pause();

        // OEM module - view an existing OEM record via its row menu
        await oemPage.openOemMenu();
        await pause();
        await oemPage.openOemList();
        await pause();
        await oemPage.openOem(OEM_ROW);
        await pause();
        await oemPage.clickViewMenuItem();
        await longPause();

        // Programs module - view an existing program's detail sections
        await programsPage.openProgramsMenu();
        await pause();
        await programsPage.openAllProgramsMenu();
        await pause();
        await programsPage.openAllListTab();
        await pause();
        await programsPage.openProgramRow(PROGRAM_ROW);
        await longPause();
        await programsPage.clickViewMenuItem();
        await longPause();
        await programsPage.openStructureTab();
        await pause();
        await programsPage.openFinancingTab();
        await pause();
        await programsPage.openOtherTabText();
        await pause();

        // Reports module - System Reports screen
        await reportsPage.openReportsMenu();
        await pause();
        await reportsPage.openSystemReports();
        await pause();
        await reportsPage.selectReportType('Master\'s Log Report');
        await pause();
        await reportsPage.changeReportType('Email History Report');
        await pause();
        await reportsPage.openCrilcReport();
        await pause();
        await reportsPage.downloadCrilcWeeklyReport();
        await pause();
        await reportsPage.downloadCrilcMonthlyReport();
        await pause();
        await reportsPage.openNeslReport();
        await pause();
        await reportsPage.downloadNeslReport();
        await pause();
        await reportsPage.openBureauReport();
        await pause();
        await reportsPage.openCibilApiAuditReport();
        await pause();

        await reportsPage.logout();
    } finally {
        // Attach the combined field-by-field pass/fail results so the Word reporter can render them,
        // even when the test fails partway through
        const fieldReport = [
            ...onboardingPage.fieldReport,
            ...oemPage.fieldReport,
            ...programsPage.fieldReport,
            ...reportsPage.fieldReport
        ];
        await testInfo.attach('field-report', {
            body: JSON.stringify(fieldReport),
            contentType: 'application/json'
        });
    }

});
