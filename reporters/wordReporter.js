const fs = require('fs');
const path = require('path');
const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    ImageRun,
    HeadingLevel,
    Table,
    TableRow,
    TableCell,
    WidthType,
    ShadingType,
    AlignmentType,
    BorderStyle
} = require('docx');

const reportsDir = path.join(__dirname, '../reports');

const COLORS = {
    heading: '1F4E78',
    passed: '1E8449',
    failed: 'C0392B',
    skipped: '7D6608',
    passedBg: 'E9F7EF',
    failedBg: 'FDEDEC',
    skippedBg: 'FEF9E7',
    headerBg: '1F4E78',
    headerText: 'FFFFFF',
    border: 'BFBFBF'
};

const CELL_BORDER = {
    top: { style: BorderStyle.SINGLE, size: 2, color: COLORS.border },
    bottom: { style: BorderStyle.SINGLE, size: 2, color: COLORS.border },
    left: { style: BorderStyle.SINGLE, size: 2, color: COLORS.border },
    right: { style: BorderStyle.SINGLE, size: 2, color: COLORS.border }
};

// Custom Playwright reporter that produces a Word (.docx) summary of a test run,
// including each test's description, overall status/duration, and a field-by-field
// pass/fail breakdown (read from the "field-report" attachment tests can push to).
class WordReporter {

    constructor() {
        this.results = [];
    }

    onBegin() {
        this.startTime = new Date();
    }

    onTestEnd(test, result) {
        const descriptionAnnotation = test.annotations.find(a => a.type === 'description');
        const fieldReportAttachment = result.attachments.find(a => a.name === 'field-report');

        let fields = [];
        if (fieldReportAttachment && fieldReportAttachment.body) {
            try {
                fields = JSON.parse(fieldReportAttachment.body.toString('utf-8'));
            } catch {
                fields = [];
            }
        }

        this.results.push({
            title: test.title,
            file: path.basename(test.location.file),
            description: descriptionAnnotation ? descriptionAnnotation.description : '-',
            status: result.status,
            duration: result.duration,
            error: result.error ? result.error.message : '',
            fields
        });
    }

    async onEnd(result) {
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }

        const passed = this.results.filter(r => r.status === 'passed').length;
        const failed = this.results.filter(r => r.status === 'failed' || r.status === 'timedOut').length;
        const skipped = this.results.filter(r => r.status === 'skipped').length;

        const children = [
            new Paragraph({
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'HCIN Automation - Test Execution Report', color: COLORS.heading, bold: true })],
                spacing: { after: 120 }
            }),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `Generated: ${this.startTime.toLocaleString()}`, italics: true, color: '595959' })],
                spacing: { after: 200 }
            }),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({
                    text: `Overall Result: ${result.status.toUpperCase()}`,
                    bold: true,
                    size: 28,
                    color: result.status === 'passed' ? COLORS.passed : COLORS.failed
                })],
                spacing: { after: 200 }
            }),
            this.buildSummaryCards(this.results.length, passed, failed, skipped),
            new Paragraph({ text: '', spacing: { after: 200 } }),
            new Paragraph({
                heading: HeadingLevel.HEADING_1,
                children: [new TextRun({ text: 'Test Summary', color: COLORS.heading, bold: true })],
                spacing: { after: 150 }
            }),
            this.buildSummaryTable()
        ];

        this.results.forEach((r, i) => {
            children.push(
                new Paragraph({
                    heading: HeadingLevel.HEADING_1,
                    children: [new TextRun({ text: `${i + 1}. ${r.title}`, color: COLORS.heading, bold: true })],
                    spacing: { before: 400, after: 100 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: 'Status: ', bold: true }),
                        new TextRun({
                            text: r.status.toUpperCase(),
                            bold: true,
                            color: r.status === 'passed' ? COLORS.passed : (r.status === 'skipped' ? COLORS.skipped : COLORS.failed)
                        }),
                        new TextRun({ text: `   |   Duration: ${r.duration} ms`, color: '595959' })
                    ],
                    spacing: { after: 100 }
                }),
                new Paragraph({
                    children: [new TextRun({ text: r.description, italics: true, color: '404040' })],
                    spacing: { after: 150 }
                })
            );

            if (r.fields.length) {
                children.push(
                    new Paragraph({
                        children: [new TextRun({ text: 'Field-by-Field Results', bold: true })],
                        spacing: { after: 100 }
                    }),
                    this.buildFieldTable(r.fields)
                );
            }

            if (r.error) {
                children.push(
                    new Paragraph({
                        spacing: { before: 150 },
                        children: [new TextRun({ text: 'Error: ', bold: true, color: COLORS.failed })]
                    }),
                    new Paragraph({
                        children: [new TextRun({ text: r.error, color: COLORS.failed })]
                    })
                );
            }
        });

        const doc = new Document({
            sections: [{ children }]
        });

        const buffer = await Packer.toBuffer(doc);
        const entitySlug = this.findEntityName();
        const timestamp = this.startTime.toISOString().replace(/[:.]/g, '-');
        const fileName = entitySlug
            ? `test-report-${entitySlug}-${timestamp}.docx`
            : `test-report-${timestamp}.docx`;
        const filePath = path.join(reportsDir, fileName);
        fs.writeFileSync(filePath, buffer);

        console.log(`\nWord report generated: ${filePath}`);
    }

    // Pulls the entity name recorded by the lead-creation test's field report, if present,
    // so the report filename identifies which lead this run was about
    findEntityName() {
        const entityField = this.results
            .flatMap(r => r.fields)
            .find(f => f.field === 'Entity Name' && f.value);

        if (!entityField) {
            return null;
        }

        return entityField.value.replace(/[^a-zA-Z0-9-_]+/g, '_').slice(0, 60);
    }

    buildSummaryCards(total, passed, failed, skipped) {
        const card = (label, value, color, bg) => new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: bg },
            borders: CELL_BORDER,
            margins: { top: 150, bottom: 150, left: 100, right: 100 },
            children: [
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: String(value), bold: true, size: 32, color })]
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: label, size: 20, color: '404040' })]
                })
            ]
        });

        return new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [new TableRow({
                children: [
                    card('Total', total, COLORS.heading, 'EAF1F8'),
                    card('Passed', passed, COLORS.passed, COLORS.passedBg),
                    card('Failed', failed, COLORS.failed, COLORS.failedBg),
                    card('Skipped', skipped, COLORS.skipped, COLORS.skippedBg)
                ]
            })]
        });
    }

    headerCell(text, widthPct) {
        return new TableCell({
            width: { size: widthPct, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: COLORS.headerBg },
            borders: CELL_BORDER,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: COLORS.headerText })] })]
        });
    }

    bodyCell(text, widthPct, opts = {}) {
        return new TableCell({
            width: { size: widthPct, type: WidthType.PERCENTAGE },
            shading: opts.bg ? { type: ShadingType.SOLID, color: opts.bg } : undefined,
            borders: CELL_BORDER,
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [new Paragraph({
                children: [new TextRun({ text: String(text), bold: !!opts.bold, color: opts.color })]
            })]
        });
    }

    buildSummaryTable() {
        const headerRow = new TableRow({
            tableHeader: true,
            children: [
                this.headerCell('#', 5),
                this.headerCell('Test Name', 30),
                this.headerCell('File', 20),
                this.headerCell('Status', 15),
                this.headerCell('Duration (ms)', 15),
                this.headerCell('Error', 15)
            ]
        });

        const statusColors = {
            passed: { color: COLORS.passed, bg: COLORS.passedBg },
            failed: { color: COLORS.failed, bg: COLORS.failedBg },
            timedOut: { color: COLORS.failed, bg: COLORS.failedBg },
            skipped: { color: COLORS.skipped, bg: COLORS.skippedBg }
        };

        const dataRows = this.results.map((r, i) => {
            const sc = statusColors[r.status] || { color: '000000', bg: undefined };
            return new TableRow({
                children: [
                    this.bodyCell(i + 1, 5),
                    this.bodyCell(r.title, 30),
                    this.bodyCell(r.file, 20),
                    this.bodyCell(r.status.toUpperCase(), 15, { bold: true, color: sc.color, bg: sc.bg }),
                    this.bodyCell(r.duration, 15),
                    this.bodyCell(r.error, 15)
                ]
            });
        });

        return new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...dataRows]
        });
    }

    buildFieldTable(fields) {
        const headerRow = new TableRow({
            tableHeader: true,
            children: [
                this.headerCell('#', 5),
                this.headerCell('Field', 17),
                this.headerCell('Value Entered', 20),
                this.headerCell('Status', 10),
                this.headerCell('Screenshot', 48)
            ]
        });

        const dataRows = fields.map((f, i) => {
            const isPass = f.status === 'Pass';
            const color = isPass ? COLORS.passed : COLORS.failed;
            const bg = isPass ? COLORS.passedBg : COLORS.failedBg;
            return new TableRow({
                children: [
                    this.bodyCell(i + 1, 5),
                    this.bodyCell(f.field, 17),
                    this.bodyCell(f.value || '-', 20),
                    this.bodyCell(isPass ? 'PASS' : 'FAIL', 10, { bold: true, color, bg }),
                    this.screenshotCell(f.screenshotBase64, 48)
                ]
            });
        });

        return new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...dataRows]
        });
    }

    screenshotCell(screenshotBase64, widthPct) {
        let children = [new Paragraph({ children: [new TextRun({ text: '-', color: '999999' })] })];

        if (screenshotBase64) {
            try {
                const data = Buffer.from(screenshotBase64, 'base64');
                children = [new Paragraph({
                    children: [new ImageRun({ type: 'png', data, transformation: { width: 220, height: 124 } })]
                })];
            } catch {
                // Keep the placeholder dash if the image can't be decoded/embedded -
                // one bad screenshot should never take down the whole report
            }
        }

        return new TableCell({
            width: { size: widthPct, type: WidthType.PERCENTAGE },
            borders: CELL_BORDER,
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children
        });
    }
}

module.exports = WordReporter;
