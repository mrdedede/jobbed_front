import { useCallback, useEffect, useRef, useState } from 'react';
import { analyze } from '../api/endpoints/analyses.js';
import { toStopReason } from '../api/stopReason.js';
import { t } from '../l10n.js';

/** Safety cap: 50 batches of up to 50 postings is far beyond the daily cap. */
const MAX_BATCHES = 50;

const INITIAL_PROGRESS = { batches: 0, analysed: 0, failed: 0, remaining: null };

const LABELS = { doing: t('stop_labels_analysis_doing'), thing: t('stop_labels_analysis_thing') };

/**
 * Runs analysis batches back to back until nothing remains, one request at a
 * time (the server allows only one run per user).
 *
 * `stop()` is a soft stop: the batch in flight finishes, then the loop ends.
 * Aborting the request instead would leave the server marked as running and
 * the next start would get a 409, so the request is only aborted on unmount.
 *
 * @return {{start: function({limit?: number, windowDays?: number, model?: string}): Promise<void>,
 *     stop: function(): void,
 *     status: ('idle'|'running'|'stopping'|'done'|'stopped'|'failed'),
 *     progress: {batches: number, analysed: number, failed: number, remaining: ?number},
 *     results: Analysis[], stopReason: ?{kind: string, message: string, retryAfter: ?number}}}
 */
export function useAnalyzeRun() {
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(INITIAL_PROGRESS);
  const [results, setResults] = useState([]);
  const [stopReason, setStopReason] = useState(null);
  const stopRequested = useRef(false);
  const running = useRef(false);
  const controller = useRef(null);

  useEffect(() => () => controller.current?.abort(), []);

  const stop = useCallback(() => {
    if (!running.current) return;
    stopRequested.current = true;
    setStatus('stopping');
  }, []);

  const start = useCallback(async (params) => {
    if (running.current) return;
    running.current = true;
    stopRequested.current = false;
    controller.current = new AbortController();
    const { signal } = controller.current;
    setStatus('running');
    setProgress(INITIAL_PROGRESS);
    setResults([]);
    setStopReason(null);

    let totals = INITIAL_PROGRESS;
    try {
      for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
        const result = await analyze(params, { signal });
        totals = {
          batches: totals.batches + 1,
          analysed: totals.analysed + result.analysed,
          failed: totals.failed + result.failed,
          remaining: result.remaining,
        };
        setProgress(totals);
        setResults((previous) => [...previous, ...result.results]);

        if (result.remaining === 0) return setStatus('done');
        if (result.analysed === 0) {
          setStopReason({
            kind: 'no-progress',
            message: t('stop_no_progress'),
            retryAfter: null,
          });
          return setStatus('failed');
        }
        if (stopRequested.current) return setStatus('stopped');
      }
      return setStatus('stopped');
    } catch (error) {
      if (signal.aborted) return undefined; // unmounted
      setStopReason(toStopReason(error, LABELS));
      return setStatus('failed');
    } finally {
      running.current = false;
    }
  }, []);

  return { start, stop, status, progress, results, stopReason };
}
