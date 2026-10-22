import { useCallback, useEffect, useRef, useState } from 'react';
import { analyze } from '../api/endpoints/analyses.js';
import { toStopReason } from '../api/stopReason.js';
import { t } from '../l10n.js';

const INITIAL_PROGRESS = { analysed: 0, failed: 0, skipped: 0 };

const LABELS = { doing: t('stop_labels_analysis_doing'), thing: t('stop_labels_analysis_thing') };

/**
 * Grades the picked postings in one request (the server allows one run per
 * user, and the daily cap is far below the 50 ids a request may carry).
 *
 * The request is aborted only on unmount.
 *
 * @return {{start: function({jobIds: string[], model?: string}): Promise<void>,
 *     status: ('idle'|'running'|'done'|'failed'),
 *     progress: {analysed: number, failed: number, skipped: number},
 *     results: Analysis[], stopReason: ?{kind: string, message: string, retryAfter: ?number}}}
 */
export function useAnalyzeRun() {
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(INITIAL_PROGRESS);
  const [results, setResults] = useState([]);
  const [stopReason, setStopReason] = useState(null);
  const running = useRef(false);
  const controller = useRef(null);

  useEffect(() => () => controller.current?.abort(), []);

  const start = useCallback(async (params) => {
    if (running.current) return;
    running.current = true;
    controller.current = new AbortController();
    const { signal } = controller.current;
    setStatus('running');
    setProgress(INITIAL_PROGRESS);
    setResults([]);
    setStopReason(null);

    try {
      const result = await analyze(params, { signal });
      setProgress({ analysed: result.analysed, failed: result.failed, skipped: result.skipped });
      setResults(result.results);
      return setStatus('done');
    } catch (error) {
      if (signal.aborted) return undefined; // unmounted
      setStopReason(toStopReason(error, LABELS));
      return setStatus('failed');
    } finally {
      running.current = false;
    }
  }, []);

  return { start, status, progress, results, stopReason };
}
