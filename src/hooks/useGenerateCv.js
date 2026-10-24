import { useEffect } from 'react';
import {
  getCvGeneration, listGeneratedCvs, startCvGeneration,
} from '../api/endpoints/generatedCvs.js';
import { toStopReason } from '../api/stopReason.js';
import { useAsyncJob } from './useAsyncJob.js';
import { useFetch } from './useFetch.js';
import { usePolling } from './usePolling.js';
import { t } from '../l10n.js';

const CV_LABELS = { doing: t('stop_labels_generation_doing'), thing: t('stop_labels_generation_thing') };
const POLL_INTERVAL_MS = 3000;
/** While another generation (e.g. from a previous visit) runs, watch the list. */
const BUSY_INTERVAL_MS = 5000;

/**
 * Why a generation stopped: an API failure (start or poll) or the error the
 * finished job reported. A 404 while polling means the API restarted, or the
 * job is older than an hour.
 */
function stopReasonOf(job, labels) {
  if (job.errorWhilePolling && job.error.status === 404) {
    return { kind: 'interrupted', message: t('stop_generation_interrupted'), retryAfter: null };
  }
  if (job.error) return toStopReason(job.error, labels);
  if (job.result?.status === 'failed') {
    const { status = 500, detail = t('stop_generation_failed') } = job.result.error ?? {};
    return toStopReason({ status, detail }, labels);
  }
  return null;
}

/**
 * A server-side generation (CV, cover letter) started, polled to the end, and
 * the list of what it produces kept fresh. The list is refetched when a job
 * ends, and watched while a generation started elsewhere is still running.
 *
 * @param {{start: function(*, Object): Promise<{generation_id: string}>,
 *     poll: function(string, Object): Promise<Object>,
 *     list: function(Object): Promise<Array>,
 *     labels: {doing: string, thing: string}}} kind
 * @return {{generate: function(*): Promise<void>,
 *     status: ('idle'|'starting'|'running'|'done'|'failed'),
 *     stopReason: ?{kind: string, message: string, retryAfter: ?number},
 *     items: Array, loaded: boolean, loading: boolean, listError: ?ApiError,
 *     refetch: function(): void}}
 */
export function useGeneration({ start, poll, list, labels }) {
  const job = useAsyncJob(
    (input, signal) => start(input, { signal }),
    (started, signal) => poll(started.generation_id, { signal }),
    { interval: POLL_INTERVAL_MS },
  );
  const { data, loading, error: listError, refetch } = useFetch(
    (signal) => list({ signal }),
  );
  const items = data ?? [];
  const stopReason = job.status === 'failed' ? stopReasonOf(job, labels) : null;

  // A done job may carry a null result (stored but not read back); the list has it.
  const finished = job.status === 'done' || job.status === 'failed';
  useEffect(() => {
    if (finished) refetch();
  }, [finished, refetch]);

  // 409 "already running": the server finishes it on its own, so wait for a
  // new row, then clear the alert.
  const busy = stopReason?.kind === 'busy';
  const watch = usePolling((signal) => list({ signal }), {
    enabled: busy,
    key: busy,
    interval: BUSY_INTERVAL_MS,
    isDone: (rows) => rows.length !== items.length,
  });
  const { cancel } = job;
  const appeared = busy && !watch.polling && watch.data !== null;
  useEffect(() => {
    if (!appeared) return;
    refetch();
    cancel();
  }, [appeared, refetch, cancel]);

  return {
    generate: job.start,
    status: job.status,
    stopReason,
    items,
    loaded: data !== null,
    loading,
    listError,
    refetch,
  };
}

const CV_KIND = {
  start: startCvGeneration, poll: getCvGeneration, list: listGeneratedCvs, labels: CV_LABELS,
};

/**
 * Generates a CV for a graded posting and keeps the list of generated CVs fresh.
 *
 * Example:
 *   const { generate, status, cvs } = useGenerateCv();
 *   generate(analysis.job_id);
 *
 * @return {Object} What `useGeneration` returns, with `items` also as `cvs`.
 */
export function useGenerateCv() {
  const gen = useGeneration(CV_KIND);
  return { ...gen, cvs: gen.items };
}
