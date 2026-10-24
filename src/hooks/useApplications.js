import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import { useFetch } from './useFetch.js';
import { listApplications, updateApplication } from '../api/endpoints/applications.js';
import { t } from '../l10n.js';

/** The board's columns, in order. 'rejected' cards are off the board. */
export const STAGES = ['cv_generated', 'applied', 'interviews', 'jobbed'];
export const REASONS = ['no_reply', 'rejected', 'withdrew', 'other'];

/** @param {string} stage One of STAGES. */
export const stageLabel = (stage) => ({
  cv_generated: t('applications_stage_cv_generated'),
  applied: t('applications_stage_applied'),
  interviews: t('applications_stage_interviews'),
  jobbed: t('applications_stage_jobbed'),
})[stage];

/** @param {string} reason One of REASONS. */
export const reasonLabel = (reason) => ({
  no_reply: t('applications_reason_no_reply'),
  rejected: t('applications_reason_rejected'),
  withdrew: t('applications_reason_withdrew'),
  other: t('applications_reason_other'),
})[reason];

/**
 * How far the user's applications got, for the dashboard. A rejected card
 * counts as having reached the stage it was rejected at.
 *
 * @param {Application[]} applications
 * @return {{reached: Object<string, number>, rejectedFrom: Object<string, number>,
 *     reasons: Object<string, number>}} `reached[stage]`: cards that got at
 *     least that far.
 */
export function funnel(applications) {
  const zero = (keys) => Object.fromEntries(keys.map((key) => [key, 0]));
  const result = {
    reached: zero(STAGES),
    rejectedFrom: zero(STAGES.slice(0, -1)),
    reasons: zero(REASONS),
  };
  for (const { status, rejected_from: from, rejection_reason: reason } of applications) {
    const furthest = STAGES.indexOf(status === 'rejected' ? from : status);
    STAGES.slice(0, furthest + 1).forEach((stage) => { result.reached[stage] += 1; });
    if (status === 'rejected') {
      result.rejectedFrom[from] += 1;
      if (reason) result.reasons[reason] += 1;
    }
  }
  return result;
}

/**
 * The tracking board with optimistic moves: a card moves at once, takes the
 * server's version when the PUT answers, and moves back (with a toast) if it
 * fails.
 *
 * @return {{applications: Application[], loaded: boolean, loading: boolean,
 *     error: ?ApiError, refetch: function(): void,
 *     move: function(string, ApplicationStatus, Object=): Promise<void>}}
 *     `move(jobId, status, {rejection_reason, feedback})`.
 */
export function useApplications() {
  const { data, loading, error, refetch } = useFetch((signal) => listApplications({ signal }));
  // Optimistic edits over `data`, dropped when a refetch brings new data.
  const [local, setLocal] = useState(null);
  const [localFor, setLocalFor] = useState(data);
  if (localFor !== data) {
    setLocalFor(data);
    setLocal(null);
  }
  const applications = local ?? data ?? [];
  const replace = (jobId, card) => setLocal((previous) => (previous ?? data ?? [])
    .map((a) => (a.job_id === jobId ? card : a)));

  const move = async (jobId, status, extra = {}) => {
    const original = applications.find((a) => a.job_id === jobId);
    if (!original || (original.status === status && status !== 'rejected')) return;
    const rejectedFrom = original.status === 'rejected' ? original.rejected_from : original.status;
    replace(jobId, {
      ...original,
      status,
      rejected_from: status === 'rejected' ? rejectedFrom : null,
      rejection_reason: extra.rejection_reason ?? null,
      feedback: extra.feedback ?? null,
    });
    try {
      replace(jobId, await updateApplication(jobId, { status, ...extra }));
    } catch (caught) {
      replace(jobId, original);
      notifications.show({
        color: 'red',
        title: t('common_request_failed'),
        message: caught.detail ?? caught.message,
      });
      if (caught.status === 404) refetch();
    }
  };

  return { applications, loaded: data !== null, loading, error, refetch, move };
}
