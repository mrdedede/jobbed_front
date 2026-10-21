import { useCallback, useEffect, useRef, useState } from 'react';
import { useCallbackRef } from '@mantine/hooks';
import { usePolling } from './usePolling.js';

/**
 * A background job: start it, poll until it finishes, optionally cancel.
 *
 * Example (CV generation):
 *   const job = useAsyncJob(
 *       (jobId, signal) => startCvGeneration(jobId, { signal }),
 *       (started, signal) => getCvGeneration(started.generation_id, { signal }));
 *   job.start(jobId);
 *   // job.status: 'idle' | 'starting' | 'running' | 'done' | 'failed'
 *
 * @param {function(*, AbortSignal): Promise<*>} start Creates the job from the
 *     input given to `start()`. Its result is handed to `poll`.
 * @param {function(*, AbortSignal): Promise<*>} poll Receives what `start`
 *     returned and fetches the job's current state.
 * @param {Object=} options
 * @param {number=} options.interval Polling delay, in milliseconds.
 * @param {function(*): ('running'|'done'|'failed')=} options.getStatus Maps a
 *     poll result to a status. Defaults to reading `result.status`, where any
 *     value other than 'done' or 'failed' means still running.
 * @return {{start: function(*): Promise<void>, cancel: function(): void,
 *     status: string, result: *, error: ?ApiError, errorWhilePolling: boolean}}
 *     `result` is the final poll result. `error` is why the job could not
 *     start or be polled; `errorWhilePolling` says which.
 *     `cancel` only stops tracking; it does not stop the work server-side.
 */
export function useAsyncJob(
  start,
  poll,
  { interval, getStatus = (result) => result.status } = {},
) {
  const latestStart = useCallbackRef(start);
  const latestGetStatus = useCallbackRef(getStatus);
  const startController = useRef(null);
  const [job, setJob] = useState(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(null);

  // `key: job` keeps a previous job's result from showing for the new one.
  const polling = usePolling((signal) => poll(job, signal), {
    interval,
    enabled: job !== null,
    key: job,
    isDone: (result) => latestGetStatus(result) !== 'running',
  });

  useEffect(() => () => startController.current?.abort(), []);

  const cancel = useCallback(() => {
    startController.current?.abort();
    setJob(null);
    setStarting(false);
    setStartError(null);
  }, []);

  const run = useCallback(
    async (input) => {
      cancel(); // drops the previous job and its polling
      const controller = new AbortController();
      startController.current = controller;
      setStarting(true);
      try {
        const startedJob = await latestStart(input, controller.signal);
        if (!controller.signal.aborted) setJob(startedJob);
      } catch (error) {
        if (!controller.signal.aborted) setStartError(error);
      } finally {
        if (!controller.signal.aborted) setStarting(false);
      }
    },
    [cancel, latestStart],
  );

  const error = startError ?? (job !== null ? polling.error : null);
  let status = 'idle';
  if (starting) status = 'starting';
  else if (error) status = 'failed';
  else if (job !== null) {
    status = polling.data === null ? 'running' : latestGetStatus(polling.data);
  }

  return {
    start: run,
    cancel,
    status,
    result: status === 'done' || status === 'failed' ? polling.data : null,
    error,
    // Lets callers tell "could not start" from "lost track while polling".
    errorWhilePolling: error !== null && startError === null,
  };
}
