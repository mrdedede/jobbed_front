import { getAnalysis, startAnalysis } from '../api/endpoints/analyses.js';
import { useAsyncJob } from './useAsyncJob.js';
import { stopReasonOf } from './useGenerateCv.js';
import { t } from '../l10n.js';

const LABELS = { doing: t('stop_labels_analysis_doing'), thing: t('stop_labels_analysis_thing') };
const POLL_INTERVAL_MS = 2000;

/**
 * Grades the picked postings in one server-side run (the server allows one
 * run per user, and the daily cap is far below the 50 ids a request may
 * carry), polled until it ends so a long batch never hits a request timeout.
 *
 * Unmounting stops tracking only; the server finishes the run.
 *
 * @return {{start: function({jobIds: string[], model?: string}): Promise<void>,
 *     status: ('idle'|'running'|'done'|'failed'),
 *     progress: {done: number, total: number, analysed: number, failed: number,
 *         skipped: number},
 *     results: Analysis[], stopReason: ?{kind: string, message: string, retryAfter: ?number}}}
 *     `done` of `total` grows while running; the other counts arrive at the end.
 */
export function useAnalyzeRun() {
  const job = useAsyncJob(
    (params, signal) => startAnalysis(params, { signal }),
    (started, signal) => getAnalysis(started.analysis_id, { signal }),
    { interval: POLL_INTERVAL_MS },
  );
  const run = job.latest;
  const outcome = run?.result;
  const status = job.status === 'starting' ? 'running' : job.status;

  return {
    // The server allows one run per user; a second start would only 409.
    start: async (params) => (status === 'running' ? undefined : job.start(params)),
    status,
    progress: {
      done: run?.done ?? 0,
      total: run?.total ?? 0,
      analysed: outcome?.analysed ?? 0,
      failed: outcome?.failed ?? 0,
      skipped: outcome?.skipped ?? 0,
    },
    results: outcome?.results ?? [],
    stopReason: job.status === 'failed' ? stopReasonOf(job, LABELS) : null,
  };
}
