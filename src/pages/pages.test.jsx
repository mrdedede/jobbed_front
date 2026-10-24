import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AiAnalysis from './AiAnalysis/AiAnalysis.jsx';
import CoverLetters from './CoverLetters/CoverLetters.jsx';
import CvGeneration from './CvGeneration/CvGeneration.jsx';
import Cvs from './Cvs/Cvs.jsx';
import Keywords from './Keywords/Keywords.jsx';
import { formatGradedAt } from '../components/analysis/gradedAt.js';
import { downloadBlob } from '../cv/download.js';
import { json, mockFetch, renderWithProviders } from '../test/utils.jsx';

vi.mock('../cv/download.js', () => ({ downloadBlob: vi.fn() }));

describe('Keywords (TermList)', () => {
  const setup = (routes) => {
    const fetchMock = mockFetch({ 'GET /v1/me/keywords': json([{ id: 'k1', term: 'go' }]), ...routes });
    renderWithProviders(<Keywords />);
    return fetchMock;
  };

  it('adds a term, normalised like the API does', async () => {
    const fetchMock = setup({
      'POST /v1/me/keywords': ({ body }) => json({ id: 'k2', term: body.term }, 201),
    });
    const user = userEvent.setup();
    await screen.findByText('go');

    await user.type(screen.getByPlaceholderText('Add a term'), '  Python {Enter}');

    expect(await screen.findByText('python')).toBeInTheDocument();
    expect(screen.getByText('2 / 200')).toBeInTheDocument();
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(JSON.parse(post[1].body)).toEqual({ term: 'python' });
  });

  it('rolls the add back and explains a 409 limit', async () => {
    setup({ 'POST /v1/me/keywords': json({ detail: 'limit reached' }, 409) });
    const user = userEvent.setup();
    await screen.findByText('go');

    await user.type(screen.getByPlaceholderText('Add a term'), 'rust{Enter}');

    expect(await screen.findByText('Limit reached (200)')).toBeInTheDocument();
    expect(screen.queryByText('rust')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Add a term')).toHaveValue('rust');
  });

  it('refuses a duplicate without calling the API', async () => {
    const fetchMock = setup({});
    const user = userEvent.setup();
    await screen.findByText('go');

    await user.type(screen.getByPlaceholderText('Add a term'), 'GO{Enter}');

    expect(screen.getByText('Already in the list')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1); // the initial list only
  });

  it('removes a term, and restores it if the API fails', async () => {
    setup({ 'DELETE /v1/me/keywords/k1': json({ detail: 'internal error' }, 500) });
    const user = userEvent.setup();
    await screen.findByText('go');

    await user.click(screen.getByRole('button', { name: 'Remove go' }));

    expect(await screen.findByText('internal error')).toBeInTheDocument(); // toast
    expect(screen.getByText('go')).toBeInTheDocument();
  });

  it('shows a retry when the list fails to load', async () => {
    mockFetch({ 'GET /v1/me/keywords': json({ detail: 'internal error' }, 500) });
    renderWithProviders(<Keywords />);
    expect(await screen.findByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});

describe('Cvs', () => {
  const cvs = [
    { id: 'a', content_md: 'Active CV', is_active: true },
    { id: 'b', content_md: 'Other CV', is_active: false },
  ];

  it('activates a CV', async () => {
    const fetchMock = mockFetch({
      'GET /v1/me/cvs': json(cvs),
      'PUT /v1/me/cvs/b/activate': json({ ...cvs[1], is_active: true }),
    });
    renderWithProviders(<Cvs />);

    await userEvent.click(await screen.findByRole('button', { name: 'Activate' }));

    const otherCard = screen.getByText('Other CV').closest('.mantine-Paper-root');
    expect(within(otherCard).getByText('Active')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/v1/me/cvs/b/activate', expect.objectContaining({ method: 'PUT' }));
  });

  it('warns before deleting the active CV, then asks to activate another', async () => {
    mockFetch({ 'GET /v1/me/cvs': json(cvs), 'DELETE /v1/me/cvs/a': json(null, 204) });
    const user = userEvent.setup();
    renderWithProviders(<Cvs />);
    await screen.findByText('Active CV');

    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    expect(await screen.findByText(/This is your active CV/)).toBeInTheDocument();
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(screen.queryByText('Active CV')).not.toBeInTheDocument());
    expect(screen.getByText(/Analysis needs an active CV/)).toBeInTheDocument();
  });

  it('creates a CV from the editor', async () => {
    mockFetch({
      'GET /v1/me/cvs': json([]),
      'POST /v1/me/cvs': ({ body }) => json({ id: 'n', content_md: body.content_md, is_active: body.make_active }, 201),
      'POST /v1/me/cvs/n/suggest-terms': json({ keywords: [], blacklist: [] }),
    });
    const user = userEvent.setup();
    renderWithProviders(<Cvs />);
    await screen.findByText('No CVs yet.');

    await user.click(screen.getByRole('button', { name: 'New CV' }));
    await user.type(within(screen.getByRole('dialog')).getByRole('textbox'), 'Backend engineer');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /save/i }));

    expect(await screen.findByText('Backend engineer')).toBeInTheDocument();
    expect(screen.getByText('1 / 10')).toBeInTheDocument();
    // Nothing new to suggest: straight back to the list.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('adds the suggested terms the user keeps', async () => {
    const fetchMock = mockFetch({
      'GET /v1/me/cvs': json([]),
      'POST /v1/me/cvs': ({ body }) => json({ id: 'n', content_md: body.content_md, is_active: true }, 201),
      'POST /v1/me/cvs/n/suggest-terms': json({ keywords: ['go', 'rust'], blacklist: ['nurse'] }),
      'POST /v1/me/terms': json(null, 204),
    });
    const user = userEvent.setup();
    renderWithProviders(<Cvs />);
    await screen.findByText('No CVs yet.');

    await user.click(screen.getByRole('button', { name: 'New CV' }));
    await user.type(within(screen.getByRole('dialog')).getByRole('textbox'), 'Go dev');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /save/i }));

    await user.click(await screen.findByRole('checkbox', { name: 'rust' }));
    await user.click(screen.getByRole('button', { name: 'Add 2 terms' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const [, init] = fetchMock.mock.calls.find(([path]) => path === '/v1/me/terms');
    expect(JSON.parse(init.body)).toEqual({ keywords: ['go'], blacklist: ['nurse'] });
  });
});

describe('AiAnalysis', () => {
  const candidate = (id, title) => ({
    job_id: id, company: 'Acme', title, place: 'Paris', url: `https://x/${id}`,
    scraped_at: '2026-10-21T08:00:00Z',
  });

  it('grades only the picked postings and shows the new grades', async () => {
    let stored = [];
    let offered = [candidate('j1', 'Go Dev'), candidate('j2', 'Py Dev'), candidate('j3', 'Rust Dev')];
    const graded = {
      job_id: 'j1', adequation_grade: 88, company: 'Acme', title: 'Go Dev', place: 'Paris',
      url: 'https://x', analysed_at: '2026-10-21T08:00:00Z', depth_analysis: 'fits',
    };
    const fetchMock = mockFetch({
      'GET /v1/me/analyses/candidates': () => json(offered),
      'GET /v1/me/analyses': () => json(stored),
      'POST /v1/me/analyze': () => {
        stored = [graded];
        offered = offered.slice(1);
        return json({ analysed: 1, failed: 0, skipped: 1, results: [graded] });
      },
    });
    renderWithProviders(<AiAnalysis />);
    expect(await screen.findByText(/3 waiting to be graded/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Analyse 0 selected' })).toBeDisabled();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Select Go Dev' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select Rust Dev' }));
    await userEvent.click(screen.getByRole('button', { name: 'Analyse 2 selected' }));

    const [, init] = fetchMock.mock.calls.find(([path]) => path === '/v1/me/analyze');
    expect(JSON.parse(init.body)).toEqual({ job_ids: ['j1', 'j3'], model: 'haiku' });
    expect(await screen.findByText(/1 graded, 0 failed, 1 skipped/)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Open the analysis of Go Dev at Acme' }))
      .toBeInTheDocument();
    expect(screen.getByText('Analysis finished')).toBeInTheDocument();
    expect(screen.getByText(formatGradedAt(graded.analysed_at))).toBeInTheDocument();
    // Go Dev is graded and no longer offered; Rust Dev stays picked.
    expect(await screen.findByRole('button', { name: 'Analyse 1 selected' })).toBeInTheDocument();
  });

  it('opens a posting to read its description and pick it from there', async () => {
    mockFetch({
      'GET /v1/me/analyses/candidates': json([candidate('j1', 'Go Dev')]),
      'GET /v1/me/analyses': json([]),
      'GET /v1/me/jobs/j1': json({ ...candidate('j1', 'Go Dev'), description: 'Write Go all day' }),
    });
    renderWithProviders(<AiAnalysis />);

    await userEvent.click(await screen.findByRole('button', { name: 'Read the posting Go Dev at Acme' }));

    expect(await screen.findByText('Write Go all day')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Select for analysis' }));
    expect(screen.getByRole('checkbox', { name: 'Select Go Dev' })).toBeChecked();
  });

  it('links to the CVs page when there is no active CV', async () => {
    mockFetch({
      'GET /v1/me/analyses/candidates': json([candidate('j1', 'Go Dev')]),
      'GET /v1/me/analyses': json([]),
      'POST /v1/me/analyze': json({ detail: 'no active CV' }, 409),
    });
    renderWithProviders(<AiAnalysis />);

    await userEvent.click(await screen.findByRole('checkbox', { name: 'Select all postings' }));
    await userEvent.click(screen.getByRole('button', { name: 'Analyse 1 selected' }));

    expect(await screen.findByRole('link', { name: 'Go to your CVs' })).toHaveAttribute('href', '/cvs');
  });
});

describe('CvGeneration', () => {
  const graded = {
    job_id: 'j1', adequation_grade: 80, company: 'Acme', title: 'Go Dev',
    url: 'https://x', analysed_at: '2026-10-21T08:00:00Z',
  };
  const generated = {
    cv_id: 'c1', job_id: 'j1', title: 'Go Dev', company: 'Acme', adequation_grade: 80, locale: 'en',
    cv: {
      cv_introduction: 'Hi', profile_text: 'Engineer', skills: [], experiences: [], education: [],
    },
  };

  it('generates a CV once, then offers the downloads', async () => {
    window.localStorage.setItem('jobbed.cvProfile', JSON.stringify({ name: 'Ana', contact: '', languages: [] }));
    let listed = [];
    mockFetch({
      'GET /v1/me/analyses': json([graded]),
      'GET /v1/me/generated-cvs': () => json(listed),
      'POST /v1/me/cvs/generate': json({ generation_id: 'g1' }, 202),
      'GET /v1/me/cvs/generate/g1': () => {
        listed = [generated];
        return json({ status: 'done', cv: generated, error: null });
      },
    });
    const user = userEvent.setup();
    renderWithProviders(<CvGeneration />);
    await screen.findByText('No CV generated yet.');

    await user.click(await screen.findByRole('button', { name: 'Generate' }));

    expect(await screen.findByRole('button', { name: 'Word' })).toBeEnabled();
    expect(screen.getAllByText('CV generated, review it before downloading')).toHaveLength(1);
    expect(screen.getByText('Nothing waiting. Grade more postings in AI analysis.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Word' }));
    await waitFor(() => expect(downloadBlob).toHaveBeenCalledWith(expect.any(Blob), expect.stringMatching(/\.docx$/)));
  });

  it('opens the new CV for review after generating it', async () => {
    let listed = [];
    mockFetch({
      'GET /v1/me/analyses': json([graded]),
      'GET /v1/me/generated-cvs': () => json(listed),
      'POST /v1/me/cvs/generate': json({ generation_id: 'g1' }, 202),
      'GET /v1/me/cvs/generate/g1': () => {
        listed = [generated];
        return json({ status: 'done', cv: null, error: null });
      },
    });
    const user = userEvent.setup();
    renderWithProviders(<CvGeneration />);

    await user.click(await screen.findByRole('button', { name: 'Generate' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/written by AI/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Introduction')).toHaveValue('Hi');
  });

  it('saves an edited CV and refetches the list', async () => {
    const { CV } = await import('../cv/fixture.js');
    let listed = [{ ...generated, cv: CV }];
    let sent = null;
    const fetchMock = mockFetch({
      'GET /v1/me/analyses': json([]),
      'GET /v1/me/generated-cvs': () => json(listed),
      'PUT /v1/me/generated-cvs/c1': ({ body }) => {
        sent = body.cv;
        listed = [{ ...generated, cv: sent }];
        return json(listed[0]);
      },
    });
    const user = userEvent.setup();
    renderWithProviders(<CvGeneration />);

    await user.click(await screen.findByRole('button', { name: 'Review / edit' }));
    const dialog = await screen.findByRole('dialog');
    const bullets = within(dialog).getAllByLabelText('Bullets (one per line)')[0];
    await user.clear(bullets);
    await user.type(bullets, 'Cut latency by 30%.{Enter}{Enter}  ');
    await user.click(within(dialog).getByRole('button', { name: 'Remove experience 2' }));
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(sent.experiences).toEqual([{ ...CV.experiences[0], bullets: ['Cut latency by 30%.'] }]);
    expect(sent.skills).toEqual(CV.skills);
    const listCalls = fetchMock.mock.calls.filter(([url, init]) =>
      url.endsWith('/v1/me/generated-cvs') && init.method === 'GET');
    expect(listCalls.length).toBeGreaterThan(1);
  });

  it('keeps the editor open when saving fails', async () => {
    mockFetch({
      'GET /v1/me/analyses': json([]),
      'GET /v1/me/generated-cvs': json([generated]),
      'PUT /v1/me/generated-cvs/c1': json({ detail: 'cv: bad shape' }, 422),
    });
    const user = userEvent.setup();
    renderWithProviders(<CvGeneration />);

    await user.click(await screen.findByRole('button', { name: 'Review / edit' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await within(dialog).findByText('cv: bad shape')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('puts the posting picked on the dashboard first', async () => {
    mockFetch({
      'GET /v1/me/analyses': json([{ ...graded, job_id: 'j0', title: 'First' }, { ...graded, title: 'Picked' }]),
      'GET /v1/me/generated-cvs': json([]),
    });
    renderWithProviders(<CvGeneration />, { route: { pathname: '/cv-generation', state: { jobId: 'j1' } } });

    const rows = await screen.findAllByRole('button', { name: 'Generate' });
    expect(rows[0].closest('tr')).toHaveTextContent('Picked');
  });

  describe('job drawer', () => {
    const posting = json({ job_id: 'j1', company: 'Acme', title: 'Go Dev', url: 'https://x/post',
      scraped_at: '2026-10-20T08:00:00Z', description: 'We need Go.' });
    const rowName = 'Open the analysis of Go Dev at Acme';

    it('opens from a waiting posting row, but not from its Generate button', async () => {
      mockFetch({
        'GET /v1/me/analyses': json([{ ...graded, depth_analysis: 'Lead with **Go**' }]),
        'GET /v1/me/generated-cvs': json([]),
        'GET /v1/me/jobs/j1': posting,
        'POST /v1/me/cvs/generate': json({ generation_id: 'g1' }, 202),
        'GET /v1/me/cvs/generate/g1': json({ status: 'running', cv: null, error: null }),
      });
      const user = userEvent.setup();
      renderWithProviders(<CvGeneration />);

      await user.click(await screen.findByRole('button', { name: 'Generate' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: rowName }));
      const drawer = await screen.findByRole('dialog');
      expect(within(drawer).getByText('Go')).toBeInTheDocument();
      expect(await within(drawer).findByText('We need Go.')).toBeInTheDocument();
    });

    it('opens from a generated CV row, with a link to the posting', async () => {
      mockFetch({
        'GET /v1/me/analyses': json([]),
        'GET /v1/me/generated-cvs': json([{ ...generated, depth_analysis: 'Lead with **Go**' }]),
        'GET /v1/me/jobs/j1': posting,
      });
      const user = userEvent.setup();
      renderWithProviders(<CvGeneration />);

      await user.click(await screen.findByRole('button', { name: rowName }));
      const drawer = await screen.findByRole('dialog');
      expect(await within(drawer).findByRole('link', { name: 'Open posting' })).toHaveAttribute('href', 'https://x/post');
    });

    it('opens from the CV editor', async () => {
      mockFetch({
        'GET /v1/me/analyses': json([]),
        'GET /v1/me/generated-cvs': json([{ ...generated, depth_analysis: 'Lead with **Go**' }]),
        'GET /v1/me/jobs/j1': posting,
      });
      const user = userEvent.setup();
      renderWithProviders(<CvGeneration />);

      await user.click(await screen.findByRole('button', { name: 'Review / edit' }));
      expect(screen.getAllByRole('dialog')).toHaveLength(1);
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Job details' }));
      expect(await screen.findByText('We need Go.')).toBeInTheDocument();
    });
  });
});

describe('CoverLetters', () => {
  const cv = {
    cv_id: 'c1', job_id: 'j1', title: 'Go Dev', company: 'Acme', adequation_grade: 80, locale: 'fr',
    depth_analysis: 'Lead with **Go**', cv: {},
  };
  const letter = {
    letter_id: 'l1', cv_id: 'c1', job_id: 'j1', title: 'Go Dev', company: 'Acme', adequation_grade: 80,
    depth_analysis: 'Lead with **Go**', locale: 'fr', answers: { motivation: 'I love Go', career_fit: '', offer_fit: '' },
    letter: 'Madame, Monsieur,\n\nJe postule.', created_at: '2026-10-24T08:00:00Z',
  };

  it('writes a letter from the CV picked on the CV page with the answers, then opens it', async () => {
    let listed = [];
    let sent = null;
    mockFetch({
      'GET /v1/me/generated-cvs': json([cv]),
      'GET /v1/me/cover-letters': () => json(listed),
      'POST /v1/me/cover-letters/generate': ({ body }) => {
        sent = body;
        return json({ generation_id: 'g1' }, 202);
      },
      'GET /v1/me/cover-letters/generate/g1': () => {
        listed = [letter];
        return json({ status: 'done', letter, error: null });
      },
    });
    const user = userEvent.setup();
    renderWithProviders(<CoverLetters />, { route: { pathname: '/cover-letters', state: { cvId: 'c1' } } });
    await screen.findByText('No cover letter written yet.');

    await user.type(screen.getByLabelText(/Why is this job interesting/), 'I love Go');
    await user.click(screen.getByRole('button', { name: 'Write letter' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('Letter')).toHaveValue(letter.letter);
    expect(sent).toEqual({ cv_id: 'c1', answers: { motivation: 'I love Go', career_fit: '', offer_fit: '' } });
  });

  it('saves an edited letter', async () => {
    let sent = null;
    mockFetch({
      'GET /v1/me/generated-cvs': json([cv]),
      'GET /v1/me/cover-letters': json([letter]),
      'PUT /v1/me/cover-letters/l1': ({ body }) => {
        sent = body;
        return json({ ...letter, letter: body.letter });
      },
    });
    const user = userEvent.setup();
    renderWithProviders(<CoverLetters />);

    await user.click(await screen.findByRole('button', { name: 'Review / edit' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Letter'), ' Merci.');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(sent).toEqual({ letter: `${letter.letter} Merci.` });
  });

  it('shows the job analysis and description in a drawer', async () => {
    mockFetch({
      'GET /v1/me/generated-cvs': json([cv]),
      'GET /v1/me/cover-letters': json([letter]),
      'GET /v1/me/jobs/j1': json({ job_id: 'j1', company: 'Acme', title: 'Go Dev', url: 'https://x',
        scraped_at: '2026-10-20T08:00:00Z', description: 'We need Go.' }),
    });
    const user = userEvent.setup();
    renderWithProviders(<CoverLetters />);

    // The first "Job details" is the form's, the second the letter row's.
    const [, rowButton] = await screen.findAllByRole('button', { name: 'Job details' });
    await user.click(rowButton);

    const drawer = await screen.findByRole('dialog');
    expect(within(drawer).getByText('Go')).toBeInTheDocument();
    expect(await within(drawer).findByText('We need Go.')).toBeInTheDocument();
  });

  it('offers no form before a CV is generated', async () => {
    mockFetch({ 'GET /v1/me/generated-cvs': json([]), 'GET /v1/me/cover-letters': json([]) });
    renderWithProviders(<CoverLetters />);

    expect(await screen.findByText(/Generate a CV first/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Write letter' })).not.toBeInTheDocument();
  });
});
