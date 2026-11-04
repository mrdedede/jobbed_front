import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { cvFilename } from './filename.js';
import { GENERATED, CV, PROFILE } from './fixture.js';
import { loadL10n, resolveKeys } from './l10n.js';
import { buildDocument } from './model.js';
import { sections } from './sections.js';
import { toDocx } from './toDocx.js';
import { toHtml } from './toPdf.js';
import { letterHtml, letterParagraphs, letterToDocx } from './letter.js';

describe('sections', () => {
  it('makes a skills group a bold label and a joined list', () => {
    expect(sections(CV).skills[0]).toEqual(['Go: ', 'Go, gRPC']);
  });

  it('makes an experience a header then one line per bullet', () => {
    const { experiences } = sections(CV);
    expect(experiences[0]).toEqual(['Backend Engineer - Acme', ', Lille, France (January, 2022 - Present)']);
    expect(experiences.slice(1, 3)).toEqual([['', '• Cut p99 latency by 40%.'], ['', '• Owned the release train.']]);
    expect(experiences[3]).toEqual(['Junior Engineer - Beta', ', Paris, France (January, 2020 - December, 2021)']);
  });

  it('adds no line for blank education details', () => {
    const { education } = sections(CV);
    expect(education).toHaveLength(5);
    expect(education[2]).toEqual(['', 'GPA 3.9']);
    expect(education[3][0]).toMatch(/^BSc - USP/);
  });

  it('invents no languages', () => {
    expect(JSON.stringify(sections(CV)).toLowerCase()).not.toContain('language');
  });
});

describe('sections positions', () => {
  const position = (role, company, start_date, end_date, location = 'Lille') => ({
    role, company, location, start_date, end_date, bullets: [`${role} work.`],
  });

  it('gives every position the same line, even at one company', () => {
    expect(sections({ ...CV, experiences: [
      position('Senior', 'Acme', 'January, 2022', 'Present'),
      position('Junior', 'Acme', 'January, 2020', 'December, 2021'),
    ] }).experiences).toEqual([
      ['Senior - Acme', ', Lille (January, 2022 - Present)'],
      ['', '• Senior work.'],
      ['Junior - Acme', ', Lille (January, 2020 - December, 2021)'],
      ['', '• Junior work.'],
    ]);
  });
});

describe('sections certifications', () => {
  const certifications = (...list) => sections({ ...CV, certifications: list }).certifications;

  it('shows the issuer and year it has', () => {
    expect(certifications(
      { name: 'CKA', issuer: 'CNCF', year: '2024' },
      { name: 'TOEIC', issuer: '', year: '2023' },
      { name: 'AWS SAA', issuer: 'Amazon', year: ' ' },
      { name: 'PMP', issuer: '', year: '' },
    )).toEqual([
      ['CKA', ', CNCF (2024)'], ['TOEIC', ' (2023)'], ['AWS SAA', ', Amazon'], ['PMP', ''],
    ]);
  });

  it('is empty for a CV generated before the field existed', () => {
    expect('certifications' in CV).toBe(false);
    expect(sections(CV).certifications).toEqual([]);
  });

  it('is in the document in the CV language, and absent when there are none', () => {
    const titles = (cv) => buildDocument({ ...GENERATED, cv }, PROFILE).sections.map((s) => s.title);
    expect(titles(CV)).not.toContain('CERTIFICATIONS');
    expect(titles({ ...CV, certifications: [{ name: 'CKA', issuer: '', year: '' }] }))
      .toContain('CERTIFICATIONS');
  });
});

describe('l10n', () => {
  it('has the same keys in every locale', () => {
    const keys = Object.keys(loadL10n('en')).sort();
    for (const locale of ['es', 'fr', 'pt']) {
      expect(Object.keys(loadL10n(locale)).sort()).toEqual(keys);
    }
  });

  it('falls back to English for an unknown locale', () => {
    expect(loadL10n('xx')).toBe(loadL10n('en'));
  });

  it('resolves IDs mid-line in the CV language', () => {
    expect(resolveKeys('{language_fr}, C1 - {LEVEL_FLUENT}', loadL10n('fr'))).toBe('Français, C1 - Courant');
    expect(resolveKeys('{language_fr}, C1 - {LEVEL_FLUENT}', loadL10n('en'))).toBe('French, C1 - Fluent');
  });

  it('refuses an unknown ID instead of printing it', () => {
    expect(() => resolveKeys('{language_ja}', loadL10n('en'))).toThrow(/language_ja/);
  });
});

describe('cvFilename', () => {
  it('is ASCII and names the role', () => {
    expect(cvFilename({ name: 'Ana Souza', company: 'Société Générale', title: 'Dév. Go/Rust' }, 'pdf'))
      .toBe('Ana_Souza_Societe_Generale_Dev_Go_Rust.pdf');
  });

  it('falls back to cv', () => {
    expect(cvFilename({ name: '', company: '', title: '' }, 'docx')).toBe('cv.docx');
  });
});

describe('buildDocument', () => {
  it('orders sections, localizes headings, skips blank language lines', () => {
    const doc = buildDocument(GENERATED, PROFILE);
    expect(doc.sections.map((s) => s.title)).toEqual(['PROFIL', 'COMPÉTENCES TECHNIQUES', 'EXPÉRIENCES PROFESSIONNELLES', 'FORMATION', 'LANGUES']);
    expect(doc.sections.at(-1).lines).toEqual([['', 'Français, C1 - Courant']]);
  });

  it('omits the languages section when the user wrote none', () => {
    const doc = buildDocument(GENERATED, { ...PROFILE, languages: [] });
    expect(doc.sections).toHaveLength(4);
  });
});

describe('toHtml', () => {
  it('escapes content and only embeds a photo when given one', () => {
    const doc = { ...buildDocument(GENERATED, { ...PROFILE, name: '<b>Ana</b>' }) };
    const html = toHtml(doc, null);
    expect(html).toContain('&lt;b&gt;Ana&lt;/b&gt;');
    expect(html).not.toContain('<img');
    expect(toHtml(doc, 'blob:x')).toContain('<img src="blob:x"');
  });

  it('marks only bold-led lines, which the spacing rule keys on', () => {
    const html = toHtml(buildDocument(GENERATED, PROFILE), null);
    expect(html).toContain('<p class="lead"><b>Go: </b>Go, gRPC</p>');
    expect(html).toContain('<p>• Cut p99 latency by 40%.</p>');
  });
});

describe('toDocx', () => {
  it('is single column, text only, with every section and no leftover placeholder', async () => {
    const blob = await toDocx(buildDocument(GENERATED, PROFILE));
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const xml = await zip.file('word/document.xml').async('string');
    const text = xml.replace(/<[^>]+>/g, ' ');

    expect(xml).not.toContain('<w:drawing');
    expect(xml).not.toContain('<w:tbl>');
    expect(Object.keys(zip.files).some((f) => f.startsWith('word/media'))).toBe(false);
    expect(text).not.toMatch(/[{}]/);
    for (const needle of ['Ana Souza', 'Backend Engineer', 'Cut p99 latency by 40%.', 'Français, C1 - Courant']) {
      expect(text).toContain(needle);
    }
  });

  it('sets narrow margins and a gap only where a bold-led line follows a plain one', async () => {
    const blob = await toDocx(buildDocument(GENERATED, PROFILE));
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const xml = await zip.file('word/document.xml').async('string');
    const paragraphWith = (text) => xml.split('<w:p>').find((p) => p.includes(text));

    expect(Number(xml.match(/<w:pgMar[^>]*w:left="(\d+)"/)[1])).toBeLessThan(1000);
    expect(paragraphWith('Junior Engineer')).toContain('w:before="100"');
    expect(paragraphWith('Cloud: ')).toContain('w:before="0"');
    expect(paragraphWith('Cut p99 latency')).toContain('w:before="0"');
  });
});

describe('cover letter', () => {
  const LETTER = 'Madame, Monsieur,\n\nJe postule.\nLigne deux.\n\n\n  Cordialement,  ';

  it('splits paragraphs on blank lines only', () => {
    expect(letterParagraphs(LETTER)).toEqual(['Madame, Monsieur,', 'Je postule.\nLigne deux.', 'Cordialement,']);
  });

  it('escapes the html and signs with the name', () => {
    const html = letterHtml('<i>x</i>', { name: 'Ana', contact: 'a@b.c' });
    expect(html).toContain('&lt;i&gt;x&lt;/i&gt;');
    expect(html.trim().endsWith('<p>Ana</p>\n</body></html>')).toBe(true);
  });

  it('writes every paragraph and the sender into the docx', async () => {
    const blob = await letterToDocx(LETTER, { name: 'Ana', contact: 'a@b.c' });
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const text = (await zip.file('word/document.xml').async('string')).replace(/<[^>]+>/g, ' ');

    for (const part of ['Ana', 'a@b.c', 'Madame, Monsieur,', 'Je postule.', 'Ligne deux.', 'Cordialement,']) {
      expect(text).toContain(part);
    }
  });
});
