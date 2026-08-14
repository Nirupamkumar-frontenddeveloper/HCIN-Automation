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
    BorderStyle,
    Header,
    Footer,
    PageNumber,
    PageBorderDisplay,
    PageBorderOffsetFrom,
    PageBorderZOrder
} = require('docx');

const reportsDir = path.join(__dirname, '../reports');

const FONT = 'Calibri';
const BASE_SIZE = 22; // 11pt, in half-points

const COLORS = {
    heading: '1F4E78',
    muted: '595959',
    passed: '1E8449',
    failed: 'C0392B',
    skipped: '7D6608',
    passedBg: 'E9F7EF',
    failedBg: 'FDEDEC',
    skippedBg: 'FEF9E7',
    headerBg: '1F4E78',
    headerText: 'FFFFFF',
    border: 'BFBFBF',
    zebra: 'F5F7FA'
};

const CELL_BORDER = {
    top: { style: BorderStyle.SINGLE, size: 2, color: COLORS.border },
    bottom: { style: BorderStyle.SINGLE, size: 2, color: COLORS.border },
    left: { style: BorderStyle.SINGLE, size: 2, color: COLORS.border },
    right: { style: BorderStyle.SINGLE, size: 2, color: COLORS.border }
};

const DIVIDER_BORDER = {
    bottom: { style: BorderStyle.SINGLE, size: 6, color: COLORS.heading, space: 4 }
};

// Custom Playwright reporter that produces a Word (.docx) summary of a test run: a cover
// page, a table of contents, a test summary table, and - per test - a status/description
// overview followed by one full page per recorded step (status, value, error, screenshot).
class WordReporter {

    constructor() {
        this.results = [];
    }

    onBegin() {
        this.startTime = new Date();
    }

    // Playwright error messages (e.g. locator call logs) carry raw ANSI escape codes
    // (ESC = 0x1B, from the dim/color styling used in "Call log:" output) and can contain
    // other stray control bytes. The `docx` library escapes XML special characters
    // (<, >, &) but does NOT strip actual control bytes - those are illegal in XML 1.0
    // outright, so even one surviving ESC byte makes Word refuse to open the whole file.
    // Every dynamic string is sanitized once here, right where it enters the reporter,
    // so nothing downstream has to remember to do it.
    sanitize(value) {
        if (value === null || value === undefined) return value;
        // eslint-disable-next-line no-control-regex
        return String(value).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
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

        fields = fields.map(f => ({
            ...f,
            field: this.sanitize(f.field),
            value: this.sanitize(f.value),
            error: this.sanitize(f.error)
        }));

        this.results.push({
            title: this.sanitize(test.title),
            file: path.basename(test.location.file),
            suite: this.detectSuite(test.location.file),
            description: this.sanitize(descriptionAnnotation ? descriptionAnnotation.description : '-'),
            status: result.status,
            duration: result.duration,
            error: this.sanitize(result.error ? result.error.message : ''),
            fields
        });
    }

    // Tags a test by which tests/<Suite> folder it lives in (e.g. LMS, LOS), if any
    detectSuite(filePath) {
        const segments = filePath.split(/[\\/]/);
        const testsIndex = segments.lastIndexOf('tests');
        if (testsIndex !== -1 && segments[testsIndex + 1] && segments[testsIndex + 2]) {
            return segments[testsIndex + 1];
        }
        return null;
    }

    async onEnd(result) {
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }

        const passed = this.results.filter(r => r.status === 'passed').length;
        const failed = this.results.filter(r => r.status === 'failed' || r.status === 'timedOut').length;
        const skipped = this.results.filter(r => r.status === 'skipped').length;

        const children = [
            ...this.buildCoverPage(result, passed, failed, skipped),
            this.sectionHeading('Test Summary', HeadingLevel.HEADING_1, { pageBreakBefore: true }),
            this.buildSummaryTable()
        ];

        this.results.forEach((r, i) => {
            children.push(
                this.sectionHeading(`${i + 1}. ${r.title}`, HeadingLevel.HEADING_1, { pageBreakBefore: true }),
                this.buildTestOverviewTable(r),
                this.buildCallout(r.description)
            );

            if (r.fields.length) {
                children.push(...this.buildStepPagePairs(r.fields, r.title));
            }
        });

        const doc = new Document({
            features: { updateFields: true },
            styles: {
                default: {
                    document: {
                        run: { font: FONT, size: BASE_SIZE },
                        paragraph: { spacing: { line: 276 } }
                    }
                }
            },
            sections: [{
                properties: {
                    page: {
                        margin: { top: 1440, bottom: 1440, left: 1080, right: 1080 },
                        borders: {
                            pageBorders: {
                                display: PageBorderDisplay.ALL_PAGES,
                                offsetFrom: PageBorderOffsetFrom.PAGE,
                                zOrder: PageBorderZOrder.FRONT
                            },
                            pageBorderTop: { style: BorderStyle.SINGLE, size: 18, color: '000000', space: 24 },
                            pageBorderRight: { style: BorderStyle.SINGLE, size: 18, color: '000000', space: 24 },
                            pageBorderBottom: { style: BorderStyle.SINGLE, size: 18, color: '000000', space: 24 },
                            pageBorderLeft: { style: BorderStyle.SINGLE, size: 18, color: '000000', space: 24 }
                        }
                    }
                },
                headers: { default: this.buildHeader() },
                footers: { default: this.buildFooter() },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);
        const timestamp = this.startTime.toISOString().replace(/[:.]/g, '-');
        const suiteName = this.findSuiteName();
        const entitySlug = this.findEntityName();

        let fileName;
        if (suiteName) {
            fileName = `${suiteName}-${timestamp}.docx`;
        } else if (entitySlug) {
            fileName = `test-report-${entitySlug}-${timestamp}.docx`;
        } else {
            fileName = `test-report-${timestamp}.docx`;
        }

        const filePath = path.join(reportsDir, fileName);
        fs.writeFileSync(filePath, buffer);

        console.log(`\nWord report generated: ${filePath}`);
    }

    // When every test in this run came from the same tests/<Suite> folder (e.g. LMS, LOS),
    // names the report after that suite instead of a generic timestamp
    findSuiteName() {
        const suites = new Set(this.results.map(r => r.suite).filter(Boolean));
        return suites.size === 1 ? [...suites][0] : null;
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

    buildHeader() {
        return new Header({
            children: [
                new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: 'HCIN Automation — Test Execution Report', size: 16, color: COLORS.muted })]
                })
            ]
        });
    }

    buildFooter() {
        return new Footer({
            children: [
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({ text: 'Page ', size: 16, color: COLORS.muted }),
                        new TextRun({ children: [PageNumber.CURRENT], size: 16, color: COLORS.muted }),
                        new TextRun({ text: ' of ', size: 16, color: COLORS.muted }),
                        new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: COLORS.muted })
                    ]
                })
            ]
        });
    }

    // A heading with a colored bottom-border divider beneath it, for clean visual separation
    sectionHeading(text, level, opts = {}) {
        return new Paragraph({
            heading: level,
            pageBreakBefore: !!opts.pageBreakBefore,
            border: DIVIDER_BORDER,
            children: [new TextRun({ text, color: COLORS.heading, bold: true })],
            spacing: { after: 200, ...(opts.spacing || {}) }
        });
    }

    // A left-accent-bordered callout box, used for test descriptions
    buildCallout(text) {
        return new Paragraph({
            shading: { type: ShadingType.SOLID, color: COLORS.zebra },
            border: { left: { style: BorderStyle.SINGLE, size: 24, color: COLORS.heading, space: 8 } },
            indent: { left: 200 },
            spacing: { before: 100, after: 250 },
            children: [new TextRun({ text, italics: true, color: '404040' })]
        });
    }

    buildCoverPage(result, passed, failed, skipped) {
        return [
            new Paragraph({
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'HCIN Automation', color: COLORS.heading, bold: true })],
                spacing: { before: 1600, after: 60 }
            }),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'Test Execution Report', size: 32, color: COLORS.muted, bold: true })],
                spacing: { after: 300 }
            }),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `Generated: ${this.startTime.toLocaleString()}`, italics: true, color: COLORS.muted })],
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
                spacing: { after: 300 }
            }),
            this.buildSummaryCards(this.results.length, passed, failed, skipped)
        ];
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

    headerCell(text, widthPct, opts = {}) {
        return new TableCell({
            width: { size: widthPct, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: COLORS.headerBg },
            borders: CELL_BORDER,
            margins: { top: 100, bottom: 100, left: 120, right: 120 },
            children: [new Paragraph({
                alignment: opts.align || AlignmentType.LEFT,
                children: [new TextRun({ text, bold: true, color: COLORS.headerText })]
            })]
        });
    }

    bodyCell(text, widthPct, opts = {}) {
        return new TableCell({
            width: { size: widthPct, type: WidthType.PERCENTAGE },
            columnSpan: opts.colSpan,
            shading: opts.bg ? { type: ShadingType.SOLID, color: opts.bg } : undefined,
            borders: CELL_BORDER,
            margins: { top: 90, bottom: 90, left: 120, right: 120 },
            children: [new Paragraph({
                alignment: opts.align || AlignmentType.LEFT,
                children: [new TextRun({ text: String(text), bold: !!opts.bold, color: opts.color })]
            })]
        });
    }

    buildSummaryTable() {
        const headerRow = new TableRow({
            tableHeader: true,
            children: [
                this.headerCell('#', 5, { align: AlignmentType.CENTER }),
                this.headerCell('Test Name', 30),
                this.headerCell('File', 20),
                this.headerCell('Status', 15, { align: AlignmentType.CENTER }),
                this.headerCell('Duration (ms)', 15, { align: AlignmentType.CENTER }),
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
            const rowBg = i % 2 === 1 ? COLORS.zebra : undefined;
            return new TableRow({
                children: [
                    this.bodyCell(i + 1, 5, { align: AlignmentType.CENTER, bg: rowBg }),
                    this.bodyCell(r.title, 30, { bg: rowBg, bold: true }),
                    this.bodyCell(r.file, 20, { bg: rowBg }),
                    this.bodyCell(r.status.toUpperCase(), 15, { bold: true, color: sc.color, bg: sc.bg, align: AlignmentType.CENTER }),
                    this.bodyCell(r.duration, 15, { bg: rowBg, align: AlignmentType.CENTER }),
                    this.bodyCell(r.error, 15, { bg: rowBg })
                ]
            });
        });

        return new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...dataRows]
        });
    }

    // Compact Status / Duration / File fact table shown right under each test's heading
    buildTestOverviewTable(r) {
        const statusColor = r.status === 'passed' ? COLORS.passed : (r.status === 'skipped' ? COLORS.skipped : COLORS.failed);
        const statusBg = r.status === 'passed' ? COLORS.passedBg : (r.status === 'skipped' ? COLORS.skippedBg : COLORS.failedBg);

        return new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                new TableRow({
                    children: [
                        this.headerCell('Status', 20),
                        this.bodyCell(r.status.toUpperCase(), 30, { bold: true, color: statusColor, bg: statusBg }),
                        this.headerCell('Duration', 20),
                        this.bodyCell(`${r.duration} ms`, 30)
                    ]
                }),
                new TableRow({
                    children: [
                        this.headerCell('Spec File', 20),
                        this.bodyCell(r.file, 80, { colSpan: 3 })
                    ]
                })
            ]
        });
    }

    // Categorizes a step by its field name into a QA-meaningful label/action/purpose,
    // used to write a non-generic, non-repetitive explanation and a page heading -
    // based only on data actually present in the field report (name/value/status/error)
    categorizeField(field) {
        const f = field.toLowerCase();
        const rules = [
            [/ad id|password|^login$/, {
                label: 'User Authentication',
                action: 'authenticates the user',
                purpose: 'valid credentials are accepted and the session is established correctly'
            }],
            [/toggle sidebar/, {
                label: 'Navigation Setup',
                action: 'expands the primary navigation sidebar',
                purpose: 'the main menu is accessible before navigating to the target module'
            }],
            [/open .*menu/, {
                label: 'Module Navigation',
                action: 'opens the corresponding top-level navigation menu',
                purpose: 'the target module loads and its sub-menu items render correctly'
            }],
            [/open .*(list|tab)/, {
                label: 'Data List Navigation',
                action: 'switches to the corresponding list or tab view',
                purpose: 'the correct data set is displayed for this view'
            }],
            [/open row|open entity|open program|open case/, {
                label: 'Record Selection',
                action: 'opens the selected record from the list',
                purpose: 'record-level navigation correctly loads the intended entity'
            }],
            [/^view$|view \(menu item\)|^view /, {
                label: 'Record Review & Verification',
                action: 'opens the record in read-only view mode',
                purpose: 'the captured data is displayed accurately without permitting unintended edits'
            }],
            [/^edit$|edit /, {
                label: 'Record Edit Mode',
                action: 'switches the record into edit mode',
                purpose: 'the edit form loads correctly with the existing data pre-populated'
            }],
            [/^add /, {
                label: 'New Record Entry',
                action: 'opens the form to add a new entry',
                purpose: 'new records can be initiated correctly from this section'
            }],
            [/submit/, {
                label: 'Form Submission',
                action: 'submits the current form',
                purpose: 'the submission is processed without validation errors'
            }],
            [/cancel/, {
                label: 'Action Cancellation',
                action: 'cancels the in-progress action without saving changes',
                purpose: 'unsaved changes can be safely discarded without affecting existing data'
            }],
            [/back/, {
                label: 'Screen Navigation',
                action: 'navigates back to the previous screen',
                purpose: 'in-page navigation correctly returns the user to the prior context'
            }],
            [/upload|document|kyc/, {
                label: 'Document Upload',
                action: 'uploads the required supporting document',
                purpose: 'the document is attached and accepted by the system'
            }],
            [/download|master/, {
                label: 'Data Export',
                action: 'triggers the corresponding file download',
                purpose: 'the export/download completes and produces a usable file'
            }],
            [/select|salutation|gender|constitution|applicability|arrangement|checker|filter/, {
                label: 'Filter & Selection',
                action: 'selects the specified option from the dropdown or filter',
                purpose: 'the selected value is applied and correctly reflected on screen'
            }],
            [/remarks|mobile|email|pincode|address|name|number|amount|ifsc|pan|din|aadhaar|designation|percentage|%/, {
                label: 'Field Data Entry',
                action: 'enters data into the corresponding input field',
                purpose: 'the field accepts and correctly displays the entered value'
            }]
        ];

        for (const [regex, info] of rules) {
            if (regex.test(f)) return info;
        }
        return {
            label: 'Workflow Step',
            action: `performs the "${field}" action`,
            purpose: 'this step of the workflow behaves as expected'
        };
    }

    // Builds a specific, non-repetitive explanation for a single step, referencing the
    // actual field/value/status/error recorded for it and the enclosing test's context
    buildExplanationRuns(f, testTitle) {
        const { action, purpose } = this.categorizeField(f.field);
        const isPass = f.status === 'Pass';
        const valuePhrase = f.value ? ` using "${f.value}"` : '';

        const runs = [
            new TextRun({ text: `This screenshot captures the "${f.field}" step of the ${testTitle} flow, where the automation ${action}${valuePhrase}. ` }),
            new TextRun({ text: `This step verifies that ${purpose}. ` })
        ];

        if (isPass) {
            runs.push(new TextRun({ text: 'The action completed successfully, confirming the expected behavior for this step.', bold: true, color: COLORS.passed }));
        } else {
            runs.push(new TextRun({ text: 'The action did not complete as expected', bold: true, color: COLORS.failed }));
            runs.push(new TextRun({ text: ` (${f.error || 'an error occurred during execution'}), indicating an issue that requires investigation.`, color: COLORS.failed }));
        }

        return runs;
    }

    // A professional page heading summarizing the functional area covered by a pair of steps
    pageHeadingFor(pair) {
        const labels = [...new Set(pair.map(f => this.categorizeField(f.field).label))];
        return labels.join(' & ');
    }

    // Exactly 2 screenshots per page: a functional heading, then for each step in the pair
    // a labelled screenshot (fixed, consistent size) followed by its specific explanation
    buildStepPagePairs(fields, testTitle) {
        const elements = [];
        const total = fields.length;

        for (let i = 0; i < fields.length; i += 2) {
            const pair = fields.slice(i, i + 2);
            const rangeLabel = pair.length > 1 ? `Steps ${i + 1}–${i + 2} of ${total}` : `Step ${i + 1} of ${total}`;

            elements.push(
                new Paragraph({
                    pageBreakBefore: true,
                    heading: HeadingLevel.HEADING_2,
                    border: DIVIDER_BORDER,
                    children: [new TextRun({ text: this.pageHeadingFor(pair), color: COLORS.heading, bold: true })],
                    spacing: { after: 60 }
                }),
                new Paragraph({
                    children: [new TextRun({ text: rangeLabel, size: 18, color: COLORS.muted, italics: true })],
                    spacing: { after: 250 }
                })
            );

            pair.forEach((f, idx) => {
                const isPass = f.status === 'Pass';

                elements.push(
                    new Paragraph({
                        children: [new TextRun({
                            text: `Screenshot ${idx + 1}: ${f.field} (${isPass ? 'PASS' : 'FAIL'})`,
                            bold: true,
                            size: 24,
                            color: isPass ? COLORS.heading : COLORS.failed
                        })],
                        spacing: { before: idx === 0 ? 0 : 400, after: 120 }
                    }),
                    this.buildStepScreenshot(f.screenshotBase64),
                    new Paragraph({
                        children: [new TextRun({ text: 'Explanation:', bold: true, color: COLORS.muted })],
                        spacing: { before: 120, after: 60 }
                    }),
                    new Paragraph({
                        children: this.buildExplanationRuns(f, testTitle),
                        alignment: AlignmentType.JUSTIFIED,
                        spacing: { after: 100 }
                    })
                );
            });
        }

        return elements;
    }

    buildStepScreenshot(screenshotBase64) {
        if (screenshotBase64) {
            try {
                const data = Buffer.from(screenshotBase64, 'base64');
                const isValidPng = data.length > 8 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4E && data[3] === 0x47;

                // Word validates embedded images far more strictly than a generic zip/xml
                // check does - a truncated/malformed screenshot buffer can pass every
                // structural check here yet still make Word flag the whole .docx as
                // corrupt when it tries to render that one image. A PNG signature check
                // catches that before it ever gets embedded.
                if (isValidPng) {
                    // Fixed, consistent size (matches the 16:9 viewport aspect ratio, so
                    // nothing is stretched/cropped) - sized so 2 fit on one page together
                    // with their headings and explanations without overflowing
                    return new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new ImageRun({ type: 'png', data, transformation: { width: 440, height: 248 } })]
                    });
                }
            } catch {
                // Fall through to the placeholder - one bad screenshot should never
                // take down the whole report
            }
        }

        return new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: '[ No screenshot available ]', italics: true, color: '999999' })]
        });
    }
}

module.exports = WordReporter;
