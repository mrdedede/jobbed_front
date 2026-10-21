const escape = (text) => text.replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const line = ([bold, rest]) => `<p>${bold ? `<b>${escape(bold)}</b>` : ''}${escape(rest)}</p>`;

const CSS = `
  @page { size: A4; margin: 16mm; }
  body { font: 10.5pt/1.35 Calibri, Arial, sans-serif; color: #111; margin: 0; }
  header { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
  h1 { font-size: 22pt; margin: 0 0 4px; }
  h2 { font-size: 12pt; margin: 14px 0 4px; border-bottom: 1px solid #999; }
  p { margin: 0 0 3px; }
  img { width: 32mm; height: 32mm; object-fit: cover; border-radius: 50%; }
`;

/**
 * The CV as one standalone HTML document, photo optional. Text stays real
 * text, so the printed PDF is selectable and parseable.
 *
 * @param {CvDocument} doc From `buildDocument`.
 * @param {?string} photoUrl Object URL or data URL of the photo.
 * @return {string}
 */
export function toHtml(doc, photoUrl) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(doc.name)} - CV</title>
<style>${CSS}</style></head><body>
<header><div><h1>${escape(doc.name)}</h1>${doc.contact ? `<p>${escape(doc.contact)}</p>` : ''}</div>
${photoUrl ? `<img src="${escape(photoUrl)}" alt="">` : ''}</header>
${doc.introduction.map(line).join('')}
${doc.sections.map((s) => `<h2>${escape(s.title)}</h2>${s.lines.map(line).join('')}`).join('')}
</body></html>`;
}

/** Fallback cleanup, for browsers that never fire `afterprint` on the frame. */
const CLEANUP_FALLBACK_MS = 60_000;

/**
 * Opens the browser's print dialog on the CV; "Save as PDF" there makes the file.
 * No PDF library, so nothing to keep in step with the Word layout beyond text.
 *
 * @param {CvDocument} doc
 * @param {?Blob} photo
 * @return {Promise<void>} Resolves once the dialog was requested.
 */
export function printPdf(doc, photo) {
  const photoUrl = photo ? URL.createObjectURL(photo) : null;
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(frame);

  return new Promise((resolve) => {
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      frame.remove();
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
    frame.onload = () => {
      frame.contentWindow.addEventListener('afterprint', cleanup);
      setTimeout(cleanup, CLEANUP_FALLBACK_MS);
      frame.contentWindow.focus();
      frame.contentWindow.print();
      resolve();
    };
    frame.srcdoc = toHtml(doc, photoUrl);
  });
}
