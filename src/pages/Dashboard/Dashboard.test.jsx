import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Dashboard from './Dashboard.jsx';
import { json, mockFetch, page, renderWithProviders } from '../../test/utils.jsx';

const analysis = (id, grade, day = '2026-10-20') => ({
  job_id: id, adequation_grade: grade, company: `Co ${id}`, title: `Job ${id}`,
  url: `https://jobs/${id}`, analysed_at: `${day}T10:00:00Z`,
});

const stats = (count, average) => ({
  count,
  average,
  histogram: ['0-19', '20-39', '40-59', '60-79', '80-100'].map((range) => ({ range, count: 0 })),
  per_day: count ? [{ day: '2026-10-20', average }] : [],
});

const routes = (overrides = {}) => ({
  'GET /v1/me/analyses/candidates?window_days=1&limit=1': page([{ job_id: 'c0' }], 12),
  'GET /v1/me/analyses/stats?since_days=7': json(stats(4, 68)),
  // The server filters (grade >= 70) and orders (best first).
  'GET /v1/me/analyses?limit=5&min_grade=70&since_days=7': page([analysis('a', 90), analysis('c', 75)]),
  'GET /v1/me/cvs': json([{ id: 'cv', content_md: 'x', is_active: true }]),
  'GET /v1/me/generated-cvs': page([{ cv_id: 'g' }]),
  'GET /v1/me/keywords': json([{ id: 'k', term: 'go' }]),
  ...overrides,
});

const tile = (label) => screen.getByText(label).closest('.mantine-Paper-root');

describe('Dashboard', () => {
  it('shows the headline numbers', async () => {
    mockFetch(routes());
    renderWithProviders(<Dashboard />);

    expect(await within(tile('Waiting to be graded')).findByText('12')).toBeInTheDocument();
    expect(await within(tile('Graded, last 7 days')).findByText('4')).toBeInTheDocument();
    expect(within(tile('Graded, last 7 days')).getByText('Average grade 68')).toBeInTheDocument();
    expect(within(tile('Active CV')).getByText('Yes')).toBeInTheDocument();
    expect(within(tile('Generated CVs')).getByText('1')).toBeInTheDocument();
    expect(screen.queryByText('Finish setting up')).not.toBeInTheDocument();
  });

  it('lists the top matches, best first, with a Generate CV link', async () => {
    mockFetch(routes());
    renderWithProviders(<Dashboard />);

    const links = await screen.findAllByRole('link', { name: /^Job / });
    expect(links.map((l) => l.textContent)).toEqual(['Job a', 'Job c']);
    expect(screen.getAllByRole('link', { name: 'Generate CV' })).toHaveLength(2);
  });

  it('shows the application funnel when there are applications', async () => {
    mockFetch(routes({
      'GET /v1/me/applications': json([
        { job_id: 'x', status: 'interviews' },
        { job_id: 'y', status: 'rejected', rejected_from: 'applied' },
        { job_id: 'z', status: 'cv_generated' },
      ]),
    }));
    renderWithProviders(<Dashboard />);

    expect(await screen.findByText('1 of 2 applications got an interview (50%).')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open the board' })).toHaveAttribute('href', '/applications');
  });

  it('shows a setup checklist for a new account', async () => {
    mockFetch(routes({
      'GET /v1/me/keywords': json([]),
      'GET /v1/me/cvs': json([]),
      'GET /v1/me/analyses/stats?since_days=7': json(stats(0, null)),
      'GET /v1/me/analyses?limit=5&min_grade=70&since_days=7': page([]),
    }));
    renderWithProviders(<Dashboard />);

    expect(await screen.findByText('Finish setting up')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Add keywords/ })).toHaveAttribute('href', '/keywords');
    expect(screen.getByRole('link', { name: /Add or activate a CV/ })).toHaveAttribute('href', '/cvs');
    expect(screen.getByText(/No posting graded 70\+/)).toBeInTheDocument();
  });

  it('keeps the other tiles when one endpoint fails', async () => {
    mockFetch(routes({ 'GET /v1/me/generated-cvs': json({ detail: 'internal error' }, 500) }));
    renderWithProviders(<Dashboard />);

    expect(await within(tile('Generated CVs')).findByText('Failed to load')).toBeInTheDocument();
    expect(await within(tile('Waiting to be graded')).findByText('12')).toBeInTheDocument();
  });
});
