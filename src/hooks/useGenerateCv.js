import { useEffect } from 'react';
import {
  getCvGeneration, listGeneratedCvs, startCvGeneration,
} from '../api/endpoints/generatedCvs.js';
import { toStopReason } from '../api/stopReason.js';
import { useAsyncJob } from './useAsyncJob.js';
import { useFetch } from './useFetch.js';
import { usePolling } from './usePolling.js';

const LABELS = { doing: 'generating a CV', thing: 'CV generation' };
const POLL_INTERVAL_MS = 3000;
/** While another generation (e.g. from a previous visit) runs, watch the list. */
const BUSY_INTERVAL_MS = 5000;

/**
 * Why a generation stopped: an API failure (start or poll) or the error the
 * finished job reported. A 404 while polling means the API restarted, or the
 * job is older than an hour.
 */
function stopReasonOf(job) {
  if (job.errorWhilePolling && job.error.status === 404) {
    return { kind: 'interrupted', message: 'The generation was interrupted. Try again.', retryAfter: null };
  }
  if (job.error) return toStopReason(job.error, LABELS);
  if (job.result?.status === 'failed') {
    const { status = 500, detail = 'generation failed' } = job.result.error ?? {};
    return toStopReason({ status, detail }, LABELS);
  }
  return null;
}

/**
 * Generates a CV for a graded posting (background job on the server) and keeps
 * the list of generated CVs fresh. The list is refetched when a job ends, and
 * watched while a generation started elsewhere is still running.
 *
 * Example:
 *   const { generate, status, cvs } = useGenerateCv();
 *   generate(analysis.job_id);
 *
 * @return {{generate: function(string): Promise<void>,
 *     status: ('idle'|'starting'|'running'|'done'|'failed'),
 *     stopReason: ?{kind: string, message: string, retryAfter: ?number},
 *     cvs: GeneratedCv[], loaded: boolean, loading: boolean, listError: ?ApiError}}
 */
export function useGenerateCv() {
  const job = useAsyncJob(
    (jobId, signal) => startCvGeneration(jobId, { signal }),
    (started, signal) => getCvGeneration(started.generation_id, { signal }),
    { interval: POLL_INTERVAL_MS },
  );
  const { data, loading, error: listError, refetch } = useFetch(
    (signal) => listGeneratedCvs({ signal }),
  );
  const cvs = data ?? [];
  const stopReason = job.status === 'failed' ? stopReasonOf(job) : null;

  // A done job may carry cv: null (stored but not read back); the list has it.
  const finished = job.status === 'done' || job.status === 'failed';
  useEffect(() => {
    if (finished) refetch();
  }, [finished, refetch]);

  // 409 "already running": the server finishes it on its own, so wait for a
  // new row, then clear the alert.
  const busy = stopReason?.kind === 'busy';
  const watch = usePolling((signal) => listGeneratedCvs({ signal }), {
    enabled: busy,
    key: busy,
    interval: BUSY_INTERVAL_MS,
    isDone: (list) => list.length !== cvs.length,
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
    cvs,
    loaded: data !== null,
    loading,
    listError,
  };
}
