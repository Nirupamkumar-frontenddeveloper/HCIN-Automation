require('dotenv').config();

const { test, expect } = require('@playwright/test');
const LoginPage = require('../../pages/LoginPage');
const ProgramsPage = require('../../pages/ProgramsPage');
const users = require('../../utils/users');

test('Approve Awaiting Term Loan Program', {
    annotation: {
        type: 'description',
        description: 'Logs in as Sales Supervisor and approves the most recently created program sitting in Programs > Awaiting Approval (the one created by 6-createTermLoanProgram.spec.js, if run beforehand): opens it via the row\'s Action menu > View, selects "Approve", confirms the "Are you sure?" dialog, and verifies the program\'s status actually changed from "Awaiting approval" to "Published".'
    }
}, async ({ page }, testInfo) => {

    test.setTimeout(120000);

    const loginPage = new LoginPage(page);
    const programsPage = new ProgramsPage(page);

    try {
        await loginPage.openLOS();
        await loginPage.login(users.salesSupervisor.username, users.salesSupervisor.password);
        await programsPage.toggleSidebar();

        await programsPage.openProgramsMenu();
        await programsPage.openAllProgramsForSupervisor();

        // Target the newest pending program (identified by its Program Code, a stable,
        // searchable identifier - Program Name isn't supported by this list's search)
        const programCode = await programsPage.getNewestAwaitingApprovalProgramCode();
        await programsPage.openProgramViaActionMenu(programCode);

        await programsPage.selectApproveDecision();
        await programsPage.submitApprovalDecision();

        // Submitting redirects back to the Programs list
        await expect(page).toHaveURL(/\/program-module\/list/, { timeout: 15000 });

        // Verify it actually moved out of Awaiting Approval and is now Published
        const row = await programsPage.findProgramRow(programCode);
        await expect(row, 'the approved program should still be visible in All List').toBeVisible();

        const rowText = await row.textContent();
        expect(rowText, 'status should have changed to Published after approval').toContain('Published');
        expect(rowText, 'status should no longer show as awaiting approval').not.toMatch(/Awaiting approval/i);
    } finally {
        await testInfo.attach('field-report', {
            body: JSON.stringify(programsPage.fieldReport),
            contentType: 'application/json'
        });
    }

});
