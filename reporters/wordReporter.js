const fs = require('fs');
const path = require('path');
const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    Table,
    TableRow,
    TableCell,
    WidthType,
    ShadingType
} = require('docx');

const reportsDir = path.join(__dirname, '../reports');

// Custom Playwright reporter that produces a Word (.docx) summary of a test run,
// including each test's description (from test annotations), status, duration and error.
class WordReporter {

    constructor() {
        this.results = [];
    }

    onBegin() {
        this.startTime = new Date();
    }

    onTestEnd(test, result) {
        const descriptionAnnotation = test.annotations.find(a => a.type === 'description');

        this.results.push({
            title: test.title,
            file: path.basename(test.location.file),
            description: descriptionAnnotation ? descriptionAnnotation.description : '-',
            status: result.status,
            duration: result.duration,
            error: result.error ? result.error.message : ''
        });
    }

    async onEnd(result) {
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }

        const passed = this.results.filter(r => r.status === 'passed').length;
        const failed = this.results.filter(r => r.status === 'failed' || r.status === 'timedOut').length;
        const skipped = this.results.filter(r => r.status === 'skipped').length;

        const doc = new Document({
            sections: [{
                children: [
                    new Paragraph({
                        heading: HeadingLevel.TITLE,
                        children: [new TextRun('HCIN Automation - Test Execution Report')]
                    }),
                    new Paragraph({
                        children: [new TextRun(`Generated: ${this.startTime.toLocaleString()}`)]
                    }),
                    new Paragraph({
                        children: [new TextRun(`Overall result: ${result.status.toUpperCase()}`)],
                        spacing: { after: 200 }
                    }),
                    new Paragraph({
                        children: [new TextRun({
                            text: `Total: ${this.results.length}    Passed: ${passed}    Failed: ${failed}    Skipped: ${skipped}`,
                            bold: true
                        })],
                        spacing: { after: 300 }
                    }),
                    this.buildTable()
                ]
            }]
        });

        const buffer = await Packer.toBuffer(doc);
        const fileName = `test-report-${this.startTime.toISOString().replace(/[:.]/g, '-')}.docx`;
        const filePath = path.join(reportsDir, fileName);
        fs.writeFileSync(filePath, buffer);

        console.log(`\nWord report generated: ${filePath}`);
    }

    buildTable() {
        const headers = ['#', 'Test Name', 'Description', 'File', 'Status', 'Duration (ms)', 'Error'];

        const headerRow = new TableRow({
            tableHeader: true,
            children: headers.map(text => new TableCell({
                shading: { type: ShadingType.SOLID, color: 'D9D9D9' },
                children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })]
            }))
        });

        const dataRows = this.results.map((r, i) => new TableRow({
            children: [
                String(i + 1),
                r.title,
                r.description,
                r.file,
                r.status,
                String(r.duration),
                r.error
            ].map(text => new TableCell({ children: [new Paragraph(text)] }))
        }));

        return new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...dataRows]
        });
    }
}

module.exports = WordReporter;
