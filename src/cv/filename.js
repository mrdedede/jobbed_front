/** ASCII, underscores, nothing a file system or upload form dislikes. */
function slug(text) {
  return (text ?? '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * `Name_Company_Role.ext`, ASCII-only: accented filenames still get mangled by
 * enough upload forms to be worth avoiding.
 *
 * @param {{name: string, company: string, title: string}} parts
 * @param {'docx'|'pdf'} extension
 * @return {string}
 */
export function cvFilename({ name, company, title }, extension) {
  const stem = [name, company, title].map(slug).filter(Boolean).join('_');
  return `${stem || 'cv'}.${extension}`;
}
