const XLSX = require('xlsx');

// Reads a Field/Value sheet from an .xlsx file into a plain { field: value } object
function readKeyValueSheet(filePath, sheetName) {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[sheetName || workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const data = {};
    rows.forEach(row => {
        data[row.Field] = row.Value;
    });

    return data;
}

module.exports = { readKeyValueSheet };
