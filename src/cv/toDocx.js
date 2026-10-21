import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';

const FONT = 'Calibri';

function paragraph([bold, rest]) {
  return new Paragraph({
    spacing: { after: 60 },
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
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: doc.name, bold: true })] }),
    ...(doc.contact ? [new Paragraph({ children: [new TextRun(doc.contact)] })] : []),
    ...doc.introduction.map(paragraph),
    ...doc.sections.flatMap(({ title, lines }) => [
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 80 },
        children: [new TextRun({ text: title, bold: true })],
      }),
      ...lines.map(paragraph),
    ]),
  ];

  return Packer.toBlob(new Document({
    title: `${doc.name} - CV`,
    creator: doc.name,
    styles: { default: { document: { run: { font: FONT, size: 21 } } } },
    sections: [{ children }],
  }));
}
