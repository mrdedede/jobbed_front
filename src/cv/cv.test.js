import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { cvFilename } from './filename.js';
import { GENERATED, CV, PROFILE } from './fixture.js';
import { loadL10n, resolveKeys } from './l10n.js';
import { buildDocument } from './model.js';
import { sections } from './sections.js';
import { toDocx } from './toDocx.js';
import { toHtml } from './toPdf.js';

// Mirrors tests/test_docx_gen.py in the back end, line for line.
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
});
