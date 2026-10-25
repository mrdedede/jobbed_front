import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Onboarding from './Onboarding.jsx';
import { isOnboardingDone } from '../../onboarding.js';
import { json, mockFetch, page, renderWithProviders } from '../../test/utils.jsx';

const candidate = (id) => ({ job_id: id, company: `Co ${id}`, title: `Job ${id}`, url: `https://jobs/${id}` });

const routes = {
  'GET /v1/me/cvs': json([{ id: 'cv', content_md: '# Me', is_active: true }]),
  'GET /v1/me/keywords': json([{ id: 'k', term: 'go' }]),
  'GET /v1/me/blacklist': json([]),
  'GET /v1/me/analyses/candidates?window_days=7&limit=5': page([candidate('a'), candidate('b')], 9),
  'POST /v1/me/analyze': ({ body }) => json({
    analysed: body.job_ids.length, failed: 0, skipped: 0,
    results: body.job_ids.map((id) => ({
      ...candidate(id), adequation_grade: 80, analysed_at: '2026-10-24T10:00:00Z',
    })),
  }),
};

const renderWizard = () => renderWithProviders(
  <Routes>
    <Route path="/welcome" element={<Onboarding />} />
    <Route path="/" element={<p>Dashboard page</p>} />
  </Routes>,
  { route: '/welcome' },
);

describe('Onboarding', () => {
  it('skipping remembers it and goes to the dashboard', async () => {
    mockFetch(routes);
    const user = userEvent.setup();
    renderWizard();

    await user.click(screen.getByRole('button', { name: 'Skip for now' }));

    expect(await screen.findByText('Dashboard page')).toBeInTheDocument();
    expect(isOnboardingDone()).toBe(true);
  });

  it('walks the steps, focusing each one, and grades the first postings', async () => {
    const fetchMock = mockFetch(routes);
    const user = userEvent.setup();
    renderWizard();

    expect(await screen.findByText(/You have an active CV/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('region', { name: 'Keywords' })).toHaveFocus();
    expect(await screen.findByText('go')).toBeInTheDocument();

    for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Grade these 2' }));

    expect(await screen.findAllByText('80')).toHaveLength(2);
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(JSON.parse(post[1].body)).toEqual({ job_ids: ['a', 'b'], model: 'haiku' });
  });

  it('asks for a CV and keywords before the first analysis', async () => {
    mockFetch({ ...routes, 'GET /v1/me/cvs': json([]), 'GET /v1/me/keywords': json([]) });
    const user = userEvent.setup();
    renderWizard();

    await user.click(await screen.findByRole('button', { name: 'Write my CV' }));
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: /First analysis/ }));

    expect(await screen.findByText('Add a CV and at least one keyword first.')).toBeInTheDocument();
  });
});

describe('InfoTip', () => {
  it('opens on click and closes with Escape', async () => {
    mockFetch(routes);
    const user = userEvent.setup();
    renderWizard();
    await user.click(screen.getByRole('button', { name: 'Next' }));

    const button = await screen.findByRole('button', { name: 'About Keywords' });
    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(await screen.findByRole('dialog')).toHaveTextContent(/Keywords decide which new postings/);

    await user.keyboard('{Escape}');
    await waitFor(() => expect(button).toHaveAttribute('aria-expanded', 'false'));
  });
});
