// Selectors used by the "Create New Lead" flow for a company / corporate entity
// Entries with { role, name } are used with page.getByRole(role, { name })
// Plain string entries are used with page.locator(selector)
module.exports = {

    // Lead creation - entity details
    createNewLeadBtn: { role: 'button', name: 'Create New Lead' },
    newCustomerRadio: { role: 'radio', name: 'New Customer' },
    oemSelect: { role: 'combobox', name: 'OEM *' },
    gstinInput: { role: 'textbox', name: 'GSTIN *' },
    entityNameInput: { role: 'textbox', name: 'Entity Name *' },
    tradeNameInput: { role: 'textbox', name: 'Trade Name' },
    constitutionSelect: { role: 'combobox', name: 'Constitution *' },
    incomeRangeSelect: { role: 'combobox', name: 'Income Range' },
    cinInput: { role: 'textbox', name: 'CIN *' },

    // Date picker (incorporation date)
    openCalendarBtn: { role: 'button', name: 'Open calendar' },
    chooseMonthYearBtn: { role: 'button', name: 'Choose month and year' },

    leiApplicabilitySelect: { role: 'combobox', name: 'LEI Applicability' },
    leiInput: { role: 'textbox', name: 'LEI *' },
    leiExpiryDateInput: { role: 'textbox', name: 'LEI Expiry Date *' },
    msmeApplicabilitySelect: { role: 'combobox', name: 'MSME Applicability' },
    natureOfBusinessInput: { role: 'textbox', name: 'Nature of Business' },
    fetchBtn: { role: 'button', name: 'Fetch' },

    // Key person details
    salutationSelect: { role: 'combobox', name: 'Salutation *' },
    keyPersonNameInput: { role: 'textbox', name: 'Primary Key Person Name *' },
    designationInput: { role: 'textbox', name: 'Designation *' },
    keyPersonMobileInput: { role: 'textbox', name: 'Primary Key Person Mobile *' },
    keyPersonEmailInput: { role: 'textbox', name: 'Primary Key Person Email *' },

    // Address & program details
    addressTypeSelect: { role: 'combobox', name: 'Address Type *' },
    addressLine1Input: { role: 'textbox', name: 'Address Line 1 *' },
    pincodeInput: { role: 'textbox', name: 'Pincode *' },
    pincodeBlurArea: '.w-100 > div:nth-child(10)',
    outletCodeInput: { role: 'textbox', name: 'Outlet Code (Dealer Code) *' },
    mainDealerCodeInput: { role: 'textbox', name: 'Main Dealer Code *' },
    proposedLimitInput: { role: 'textbox', name: 'Proposed Limit' },

    // Uploads / remarks / submit
    browseFilesText: 'text=Browse files to attach',
    remarksInput: { role: 'textbox', name: 'Enter remarks' },
    submitBtn: { role: 'button', name: 'Submit' },

    // Follow-up section
    followUpEmailInput: { role: 'textbox', name: 'Email Id *' }
};
