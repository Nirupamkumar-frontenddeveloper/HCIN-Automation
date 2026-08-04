const XLSX = require('xlsx');

// Reads a Field/Value sheet from an .xlsx file into a plain { field: value } object
function readKeyValueSheet(filePath, sheetName) {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[sheetName || workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const data = {};
    rows.forEach(row => {
        // xlsx auto-types purely numeric cells (mobile, pincode, etc.) as JS numbers,
        // but Playwright's fill() requires a string
        data[row.Field] = row.Value === undefined ? row.Value : String(row.Value);
    });

    return data;
}

// Updates a subset of Field/Value rows in place and writes the sheet back to disk,
// leaving every other row untouched. Used to persist freshly-generated unique
// identifiers (GSTIN/CIN/Entity Name) so a later test reading the same file sees them.
function updateKeyValueSheet(filePath, updates, sheetName) {
    const workbook = XLSX.readFile(filePath);
    const resolvedSheetName = sheetName || workbook.SheetNames[0];
    const sheet = workbook.Sheets[resolvedSheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const updatedRows = rows.map(row => (
        Object.prototype.hasOwnProperty.call(updates, row.Field)
            ? { Field: row.Field, Value: updates[row.Field] }
            : row
    ));

    workbook.Sheets[resolvedSheetName] = XLSX.utils.json_to_sheet(updatedRows);
    XLSX.writeFile(workbook, filePath);
}

module.exports = { readKeyValueSheet, updateKeyValueSheet };
