// Selectors used by the "Search Lead" and "Promoters, Owners & Management" flow
// Entries with { role, name } are used with page.getByRole(role, { name })
// Plain string entries are used with page.locator(selector)
module.exports = {

    // Search & open an existing lead
    leadsNavBtn: { role: 'button', name: 'counterparty-onboarding Leads' },
    searchInput: { role: 'textbox', name: 'Search by Entity Name,' },

    // Entity Information completion (required before the Promoters tab appears on a fresh lead)
    telephoneMobileInput: { role: 'textbox', name: 'Telephone Number / Mobile' },

    // Promoters, Owners & Management tab
    promotersTabBtn: { role: 'button', name: ' Promoters, Owners &' },
    shareholderCheckbox: { role: 'checkbox', name: 'Shareholder' },
    yesRadio: { role: 'radio', name: 'Yes' },
    matSelectPlaceholder: '.mat-mdc-select-placeholder',
    panInput: { role: 'textbox', name: 'PAN *' },
    firstNameInput: { role: 'textbox', name: 'First Name *' },
    lastNameInput: { role: 'textbox', name: 'Last Name *' },
    shareholdingPctInput: { role: 'textbox', name: 'Shareholding % *' },

    // Date pickers
    openCalendarBtn: { role: 'button', name: 'Open calendar' },
    chooseMonthYearBtn: { role: 'button', name: 'Choose month and year' },
    previous24YearsBtn: { role: 'button', name: 'Previous 24 years' },

    nationalityInput: { role: 'textbox', name: 'Nationality *' },
    incomeRangeSelect: { role: 'combobox', name: 'Income Range (In INR) *' },
    dinInput: { role: 'textbox', name: 'DIN *' },
    aadhaarInput: { role: 'textbox', name: 'Aadhaar Card No(Enter last 4' },
    mobileInput: { role: 'textbox', name: 'Mobile Number*' },
    designationInput: { role: 'textbox', name: 'Designation / Business Title *' },
    addressLine1Input: { role: 'textbox', name: 'Address line 1 *' },
    pincodeInput: { role: 'textbox', name: 'Pincode *' },
    holdingSummaryText: 'Total Holding : 100.00Remaining Holding : 0.00 Management Personnel /',

    submitBtn: { role: 'button', name: 'Submit' },

    // KYC document upload rows (Promoters section)
    browseFilesText: 'text=Browse files to attach',
    browseFilesLabel: /Browse files to attach/,
    firstVerifyIcon: '.bi.bi-check2',
    kycVerifyIcon: '.kyc-doc-row.mb-2.border-bottom.pb-2.ng-untouched.ng-pristine > .row > .col-md-1 > .d-flex > .osv-inline-item > .kyc-osv > .kyc-osv__box > .bi',
    kycVerifyBox: '.kyc-doc-row.mb-2.border-bottom.pb-2.ng-untouched.ng-pristine > .row > .col-md-1 > .d-flex > .osv-inline-item > .kyc-osv > .kyc-osv__box',
    kycTextLink: '.kyc-doc-row.mb-2.border-bottom.pb-2.ng-untouched.ng-pristine > .row > .col-md-4 > .kyc-dropzone > .kyc-dropzone__text > .textLink',

    // Net worth / financial documents section
    netWorthSelectArrow: '#mat-select-98 svg',
    cloudUploadIcon: '.bi.bi-cloud-upload',
    cloudUploadLabel: /Browseor Drop \(\.pdf, \.xls, \./
};
