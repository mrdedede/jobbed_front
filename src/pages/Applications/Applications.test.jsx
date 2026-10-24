import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import Applications from './Applications.jsx';
import { funnel } from '../../hooks/useApplications.js';
import { json, mockFetch, renderWithProviders } from '../../test/utils.jsx';

const card = (id, status, extra = {}) => ({
  job_id: id, cv_id: `cv-${id}`, title: `Job ${id}`, company: `Co ${id}`, place: 'Paris',
  url: `https://jobs/${id}`, adequation_grade: 80, cv_created_at: '2026-10-20T10:00:00Z',
  status, rejected_from: null, rejection_reason: null, feedback: null, updated_at: null, ...extra,
});

const board = () => [
  card('a', 'cv_generated'),
  card('b', 'applied'),
  card('c', 'rejected', { rejected_from: 'interviews', rejection_reason: 'no_reply' }),
];

const column = (name) => screen.getByRole('region', { name });

async function openMenu(user, title) {
  await user.click(await screen.findByRole('button', { name: `Actions for ${title}` }));
}

describe('Applications', () => {
  it('puts each card in its column and hides rejected ones', async () => {
    mockFetch({ 'GET /v1/me/applications': json(board()) });
    renderWithProviders(<Applications />);

    await screen.findByText('Job a');
    expect(within(column('CV generated')).getByText('Job a')).toBeInTheDocument();
    expect(within(column('Applied')).getByText('Job b')).toBeInTheDocument();
    expect(screen.queryByText('Job c')).not.toBeInTheDocument();
  });

  it('moves a card from its menu', async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch({
      'GET /v1/me/applications': json(board()),
      'PUT /v1/me/applications/a': ({ body }) => json(card('a', body.status)),
    });
    renderWithProviders(<Applications />);

    await openMenu(user, 'Job a');
    await user.click(await screen.findByRole('menuitem', { name: 'Applied' }));

    expect(await within(column('Applied')).findByText('Job a')).toBeInTheDocument();
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(JSON.parse(put[1].body)).toEqual({ status: 'applied' });
  });

  it('moves the card back when the move fails', async () => {
    const user = userEvent.setup();
    mockFetch({
      'GET /v1/me/applications': json(board()),
      'PUT /v1/me/applications/a': json({ detail: 'boom' }, 500),
    });
    renderWithProviders(<Applications />);

    await openMenu(user, 'Job a');
    await user.click(await screen.findByRole('menuitem', { name: 'Interviews' }));

    expect(await screen.findByText('boom')).toBeInTheDocument();
    expect(within(column('CV generated')).getByText('Job a')).toBeInTheDocument();
  });

  it('rejects with a reason, then lists and restores it', async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch({
      'GET /v1/me/applications': json(board()),
      'PUT /v1/me/applications/b': ({ body }) => json(card('b', body.status, body.status === 'rejected'
        ? { rejected_from: 'applied', rejection_reason: body.rejection_reason, feedback: body.feedback }
        : {})),
    });
    renderWithProviders(<Applications />);

    await openMenu(user, 'Job b');
    await user.click(await screen.findByRole('menuitem', { name: 'Mark as rejected' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByLabelText('I withdrew'));
    await user.type(within(dialog).getByLabelText('Feedback (optional)'), 'too far');
    await user.click(within(dialog).getByRole('button', { name: 'Mark as rejected' }));

    await waitFor(() => expect(within(column('Applied')).queryByText('Job b')).not.toBeInTheDocument());
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(JSON.parse(put[1].body)).toEqual({ status: 'rejected', rejection_reason: 'withdrew', feedback: 'too far' });

    await user.click(await screen.findByRole('button', { name: 'Show rejected (2)' }));
    expect(screen.getByText('too far')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Restore Job b' }));

    expect(await within(column('Applied')).findByText('Job b')).toBeInTheDocument();
  });

  it('points to CV generation when there is nothing to track', async () => {
    mockFetch({ 'GET /v1/me/applications': json([]) });
    renderWithProviders(<Applications />);

    expect(await screen.findByText(/No generated CVs yet/)).toBeInTheDocument();
  });
});

describe('funnel', () => {
  it('counts the stages reached, rejected ones up to where they stopped', () => {
    const result = funnel([
      ...board(),
      card('d', 'jobbed'),
      card('e', 'rejected', { rejected_from: 'cv_generated' }),
    ]);

    expect(result.reached).toEqual({ cv_generated: 5, applied: 3, interviews: 2, jobbed: 1 });
    expect(result.rejectedFrom).toEqual({ cv_generated: 1, applied: 0, interviews: 1 });
    expect(result.reasons).toEqual({ no_reply: 1, rejected: 0, withdrew: 0, other: 0 });
  });
});
