import { useEffect } from 'react';
import {
  getCvGeneration, listGeneratedCvs, startCvGeneration,
} from '../api/endpoints/generatedCvs.js';
import { toStopReason } from '../api/stopReason.js';
import { useAsyncJob } from './useAsyncJob.js';
import { useFetch } from './useFetch.js';

const LABELS = { doing: 'generating a CV', thing: 'CV generation' };
const POLL_INTERVAL_MS = 3000;

/**
 * Why a generation stopped: an API failure (start or poll) or the error the
 * finished job reported. A 404 while polling means the API restarted and lost
 * the job.
 */
function stopReasonOf(error, result) {
  if (error?.status === 404) {
    return { kind: 'interrupted', message: 'The generation was interrupted. Try again.', retryAfter: null };
  }
  if (error) return toStopReason(error, LABELS);
  if (result?.status === 'failed') {
    return toStopReason({ status: result.error.status, detail: result.error.detail }, LABELS);
  }
  return null;
}

/**
 * Generates a CV for a graded posting (background job on the server) and keeps
 * the list of generated CVs fresh. The list is refetched when a job ends.
 *
 * Example:
 *   const { generate, status, cvs } = useGenerateCv();
 *   generate(analysis.job_id);
 *
 * @return {{generate: function(string): Promise<void>, cancel: function(): void,
 *     status: ('idle'|'starting'|'running'|'done'|'failed'),
 *     stopReason: ?{kind: string, message: string, retryAfter: ?number},
 *     latest: ?GeneratedCv, cvs: GeneratedCv[], loading: boolean,
 *     listError: ?ApiError, refetch: function(): void}} `latest` is the CV the
 *     last successful run produced. `cancel` only stops tracking; the server
 *     still finishes the CV, which then shows up in `cvs`.
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

  const finished = job.status === 'done' || job.status === 'failed';
  useEffect(() => {
    if (finished) refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.status]);

  return {
    generate: job.start,
    cancel: job.cancel,
    status: job.status,
    stopReason: job.status === 'failed' ? stopReasonOf(job.error, job.result) : null,
    latest: job.status === 'done' ? job.result.cv : null,
    cvs: data ?? [],
    loading,
    listError,
    refetch,
  };
}
