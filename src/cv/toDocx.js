import { convertMillimetersToTwip, Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';

const FONT = 'Calibri';
const PAGE_MARGIN = convertMillimetersToTwip(14);

/** Same rule as toPdf.js: a gap only where a bold-led line follows a plain one. */
function paragraph([bold, rest], previous) {
  return new Paragraph({
    spacing: { before: bold && previous && !previous[0] ? 100 : 0, after: 0 },
    children: [
      ...(bold ? [new TextRun({ text: bold, bold: true })] : []),
      new TextRun(rest),
    ],
  });
}

/**
 * The ATS-safe copy: single column, no tables, no text boxes, no images,
 * literal bullets. The photo is deliberately not an option here; use the PDF.
 *
 * @param {CvDocument} doc From `buildDocument`.
 * @return {Promise<Blob>}
 */
export function toDocx(doc) {
  const children = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: doc.name, bold: true, size: 44 })] }),
    ...(doc.contact ? [new Paragraph({ children: [new TextRun(doc.contact)] })] : []),
    ...doc.introduction.map((line) => paragraph(line)),
    ...doc.sections.flatMap(({ title, lines }) => [
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 160, after: 40 },
        children: [new TextRun({ text: title, bold: true, size: 22 })],
      }),
      ...lines.map((line, i) => paragraph(line, lines[i - 1])),
    ]),
  ];

  return Packer.toBlob(new Document({
    title: `${doc.name} - CV`,
    creator: doc.name,
    styles: { default: { document: { run: { font: FONT, size: 20 } } } },
    sections: [{
      properties: {
        page: { margin: { top: PAGE_MARGIN, right: PAGE_MARGIN, bottom: PAGE_MARGIN, left: PAGE_MARGIN } },
      },
      children,
    }],
  }));
}
