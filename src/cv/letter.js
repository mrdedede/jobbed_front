import { escape, printHtml } from './toPdf.js';

/**
 * A cover letter split for rendering: blank lines separate paragraphs, single
 * line breaks stay inside one.
 *
 * @param {string} letter
 * @return {string[]}
 */
export function letterParagraphs(letter) {
  return letter.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

const CSS = `
  @page { size: A4; margin: 22mm; }
  body { font: 11pt/1.5 Calibri, Arial, sans-serif; color: #111; margin: 0; }
  h1 { font-size: 16pt; margin: 0; }
  header { margin-bottom: 18px; }
  p { margin: 0 0 10px; white-space: pre-line; }
`;

/**
 * The letter as one standalone HTML document: sender header, then the text.
 *
 * @param {string} letter
 * @param {Profile} profile Name and contact line; the name also signs it.
 * @return {string}
 */
export function letterHtml(letter, profile) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(profile.name)} - Cover letter</title>
<style>${CSS}</style></head><body>
<header><h1>${escape(profile.name)}</h1>${profile.contact ? `<p>${escape(profile.contact)}</p>` : ''}</header>
${letterParagraphs(letter).map((p) => `<p>${escape(p)}</p>`).join('')}
<p>${escape(profile.name)}</p>
</body></html>`;
}

/** @param {string} letter @param {Profile} profile @return {Promise<void>} */
export function printLetter(letter, profile) {
  return printHtml(letterHtml(letter, profile));
}

/**
 * The letter as a Word file. Import this module's caller lazily: `docx` is
 * most of the bundle.
 *
 * @param {string} letter
 * @param {Profile} profile
 * @return {Promise<Blob>}
 */
export async function letterToDocx(letter, profile) {
  const { Document, Packer, Paragraph, TextRun } = await import('docx');
  // One run per line, so single line breaks inside a paragraph survive.
  const paragraph = (text, options = {}) => new Paragraph({
    spacing: { after: 200 },
    children: text.split('\n').map((line, i) => new TextRun({ text: line, break: i > 0 ? 1 : 0, ...options })),
  });

  return Packer.toBlob(new Document({
    title: `${profile.name} - Cover letter`,
    creator: profile.name,
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
    sections: [{
      children: [
        paragraph(profile.name, { bold: true, size: 32 }),
        ...(profile.contact ? [paragraph(profile.contact)] : []),
        ...letterParagraphs(letter).map((p) => paragraph(p)),
        paragraph(profile.name),
      ],
    }],
  }));
}
