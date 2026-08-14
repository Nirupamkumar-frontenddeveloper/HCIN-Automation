// Generates fresh, plausible-format GSTIN/CIN for each run so re-running the suite
// never collides with a previously-created lead (duplicate detection is keyed on these,
// not on the entity name, so the name itself is left untouched)

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function randomLetters(count) {
    let result = '';
    for (let i = 0; i < count; i++) {
        result += LETTERS[Math.floor(Math.random() * LETTERS.length)];
    }
    return result;
}

function randomDigits(count) {
    let result = '';
    for (let i = 0; i < count; i++) {
        result += Math.floor(Math.random() * 10);
    }
    return result;
}

// 15-char GSTIN shape: 2-digit state code + 10-char PAN + 1-char entity code + Z + 1 checksum
function generateGSTIN() {
    return `27${randomLetters(5)}${randomDigits(4)}${randomLetters(1)}1Z${randomDigits(1)}`;
}

// 21-char CIN shape: U/L + 5 digits + 2-letter state + 4-digit year + 3-letter type + 6-digit number
function generateCIN() {
    return `U${randomDigits(5)}MH${new Date().getFullYear()}PTC${randomDigits(6)}`;
}

function generateEntityName(prefix = 'SalesLead') {
    return `${prefix} ${Date.now()}${randomDigits(2)}`;
}

function generateMobile() {
    return `9${randomDigits(9)}`;
}

function generateEmail(prefix = 'salesleadtest') {
    return `${prefix}${Date.now()}@example.com`;
}

module.exports = { generateGSTIN, generateCIN, generateEntityName, generateMobile, generateEmail };
