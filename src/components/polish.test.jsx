import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import QueryState from './QueryState.jsx';
import AnalysisTable from './analysis/AnalysisTable.jsx';
import { loadProfile } from '../cv/profileStore.js';
import { renderWithProviders } from '../test/utils.jsx';

const failure = { status: 500, detail: 'internal error' };

describe('QueryState', () => {
  it('shows a labelled loader before the first data', () => {
    renderWithProviders(<QueryState loading error={null} hasData={false} label="CVs">x</QueryState>);
    expect(screen.getByLabelText('Loading CVs')).toBeInTheDocument();
  });

  it('shows the error with a retry before the first data', async () => {
    const retry = vi.fn();
    renderWithProviders(
      <QueryState loading={false} error={failure} hasData={false} onRetry={retry} label="CVs">x</QueryState>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load CVs: internal error');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalled();
  });

  it('keeps the data on screen when a refresh fails', () => {
    renderWithProviders(<QueryState loading={false} error={failure} hasData label="CVs">the list</QueryState>);
    expect(screen.getByText('the list')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Could not refresh CVs');
  });

  it('shows the empty message instead of the children', () => {
    renderWithProviders(
      <QueryState loading={false} error={null} hasData empty="No CVs yet.">the list</QueryState>,
    );
    expect(screen.getByText('No CVs yet.')).toBeInTheDocument();
    expect(screen.queryByText('the list')).not.toBeInTheDocument();
  });
});

describe('AnalysisTable', () => {
  it('opens an analysis from the keyboard', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AnalysisTable analyses={[{
      job_id: 'j', adequation_grade: 80, company: 'Acme', title: 'Dev', place: 'Paris',
      url: 'https://x', depth_analysis: 'Strong **match**',
    }]} />);

    const row = screen.getByRole('button', { name: 'Open the analysis of Dev at Acme' });
    row.focus();
    await user.keyboard('{Enter}');

    expect(await screen.findByText('match')).toBeInTheDocument();
  });
});

describe('loadProfile', () => {
  it('survives a corrupted stored profile', () => {
    window.localStorage.setItem('jobbed.cvProfile', JSON.stringify({ name: 3, languages: 'fr' }));
    expect(loadProfile()).toEqual({ name: '', contact: '', languages: [] });
  });
});
