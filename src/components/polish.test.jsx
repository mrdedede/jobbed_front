import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import QueryState from './QueryState.jsx';
import AnalysisTable from './analysis/AnalysisTable.jsx';
import GeneratedCvEditor from './cv/GeneratedCvEditor.jsx';
import { GENERATED } from '../cv/fixture.js';
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

  const analysis = {
    job_id: 'j', adequation_grade: 0, company: 'Acme', title: 'Dev', place: 'Paris',
    url: 'https://x', depth_analysis: 'Old verdict', has_cv: false,
  };
  const openDrawer = async (props) => {
    const user = userEvent.setup();
    renderWithProviders(<AnalysisTable analyses={[{ ...analysis, ...props.row }]}
      onRegrade={props.onRegrade} regradeDisabled={props.disabled} />);
    await user.click(screen.getByRole('button', { name: 'Open the analysis of Dev at Acme' }));
    await screen.findByText('Old verdict');
    return user;
  };

  it('regrades after confirming, and closes the drawer', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const onRegrade = vi.fn();
    const user = await openDrawer({ onRegrade });

    await user.click(screen.getByRole('button', { name: 'Regrade' }));

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("one of today's analyses"));
    expect(onRegrade).toHaveBeenCalledWith('j');
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Regrade' })).not.toBeInTheDocument());
  });

  it('does not regrade when the confirmation is declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const onRegrade = vi.fn();
    const user = await openDrawer({ onRegrade });

    await user.click(screen.getByRole('button', { name: 'Regrade' }));

    expect(onRegrade).not.toHaveBeenCalled();
  });

  it('explains why a posting with a generated CV cannot be regraded', async () => {
    await openDrawer({ onRegrade: vi.fn(), row: { has_cv: true } });

    expect(screen.getByRole('button', { name: 'Regrade' })).toBeDisabled();
    expect(screen.getByText(/already has a generated CV/)).toBeInTheDocument();
  });

  it('cannot regrade while a run is in progress', async () => {
    await openDrawer({ onRegrade: vi.fn(), disabled: true });

    expect(screen.getByRole('button', { name: 'Regrade' })).toBeDisabled();
  });

  it('offers no regrade where nothing handles it, as in onboarding', async () => {
    await openDrawer({});

    expect(screen.queryByRole('button', { name: 'Regrade' })).not.toBeInTheDocument();
  });
});

describe('GeneratedCvEditor certifications', () => {
  it('opens a CV generated before the field existed, and hides the section', () => {
    renderWithProviders(<GeneratedCvEditor generated={GENERATED} onClose={vi.fn()} onSave={vi.fn()} />);

    expect(screen.queryByText('Certifications')).not.toBeInTheDocument();
  });

  it('edits and removes a certification', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue();
    const cv = { ...GENERATED.cv, certifications: [
      { name: 'CKA', issuer: 'CNCF', year: '2024' }, { name: 'PMP', issuer: '', year: '' }] };
    renderWithProviders(<GeneratedCvEditor generated={{ ...GENERATED, cv }} onClose={vi.fn()} onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: 'Remove certification 2' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave.mock.calls[0][0].certifications).toEqual([{ name: 'CKA', issuer: 'CNCF', year: '2024' }]);
  });
});

describe('loadProfile', () => {
  it('survives a corrupted stored profile', () => {
    window.localStorage.setItem('jobbed.cvProfile', JSON.stringify({ name: 3, languages: 'fr' }));
    expect(loadProfile()).toEqual({ name: '', contact: '', languages: [] });
  });
});
