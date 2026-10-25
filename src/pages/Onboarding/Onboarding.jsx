import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Group, List, Stack, Stepper, Text, Title } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { listCandidates } from '../../api/endpoints/analyses.js';
import { listKeywords } from '../../api/endpoints/keywords.js';
import CvEditor from '../../components/CvEditor/CvEditor.jsx';
import QueryState from '../../components/QueryState.jsx';
import StopAlert from '../../components/StopAlert.jsx';
import AnalysisTable from '../../components/analysis/AnalysisTable.jsx';
import CvProfileForm from '../../components/cv/CvProfileForm.jsx';
import SuggestTermsModal from '../../components/cv/SuggestTermsModal.jsx';
import { useAnalyzeRun } from '../../hooks/useAnalyzeRun.js';
import { useCvs } from '../../hooks/useCvs.js';
import { useFetch } from '../../hooks/useFetch.js';
import { t } from '../../l10n.js';
import { markOnboardingDone } from '../../onboarding.js';
import Blacklist from '../Blacklist/Blacklist.jsx';
import Keywords from '../Keywords/Keywords.jsx';

/** How far back the first run looks, and how many postings it grades. */
const FIRST_RUN_DAYS = 7;
const FIRST_RUN_COUNT = 5;

const noop = () => {};

/** Step 1: write a CV, then keep the keywords and blacklist terms the AI suggests. */
function CvStep() {
  const { cvs, loaded, loading, error, refetch, create } = useCvs();
  const [editing, setEditing] = useState(false);
  const [suggestFor, setSuggestFor] = useState(null);
  const hasActive = cvs.some((cv) => cv.is_active);

  return (
    <Stack>
      <Text>{t('onboarding_cv_text')}</Text>
      <QueryState loading={loading} error={error} hasData={loaded} onRetry={refetch} label={t('cvs_query_label')}>
        {hasActive
          ? <Alert color="green">{t('onboarding_cv_done')}</Alert>
          : <Group><Button onClick={() => setEditing(true)}>{t('onboarding_cv_write')}</Button></Group>}
      </QueryState>
      {editing && (
        <CvEditor cv={null} onClose={() => setEditing(false)}
          onSave={(markdown, makeActive) => create(markdown, makeActive).then((created) => setSuggestFor(created.id))} />
      )}
      {suggestFor && <SuggestTermsModal cvId={suggestFor} onClose={() => setSuggestFor(null)} />}
    </Stack>
  );
}

/** Step 5: grade a handful of matching postings. Uses the daily quota. */
function AnalysisStep() {
  const { cvs, loaded: cvsLoaded } = useCvs();
  const keywords = useFetch((signal) => listKeywords({ signal }));
  const ready = cvs.some((cv) => cv.is_active) && keywords.data?.length > 0;
  const candidates = useFetch((signal) => listCandidates(FIRST_RUN_DAYS, { limit: FIRST_RUN_COUNT }, { signal }));
  const run = useAnalyzeRun();
  const items = candidates.data?.items ?? [];

  if (!cvsLoaded || !keywords.data) {
    return <QueryState loading error={keywords.error} hasData={false} onRetry={keywords.refetch} />;
  }
  if (!ready) return <Alert color="yellow">{t('onboarding_analysis_needs_setup')}</Alert>;

  return (
    <Stack>
      <Text>{t('onboarding_analysis_text')}</Text>
      {run.status === 'done' ? <AnalysisTable analyses={run.results} /> : (
        <QueryState loading={candidates.loading} error={candidates.error} hasData={candidates.data !== null}
          onRetry={candidates.refetch} label={t('onboarding_analysis_query_label')}
          empty={items.length === 0 && t('onboarding_analysis_none', { days: FIRST_RUN_DAYS })}>
          <List size="sm">
            {items.map((c) => <List.Item key={c.job_id}>{c.title} · {c.company}</List.Item>)}
          </List>
          <Text size="sm" c="dimmed">{t('onboarding_analysis_quota', { count: items.length })}</Text>
          <Group>
            <Button loading={run.status === 'running'}
              onClick={() => run.start({ jobIds: items.map((c) => c.job_id), model: 'haiku' })}>
              {t('onboarding_analysis_start', { count: items.length })}
            </Button>
          </Group>
        </QueryState>
      )}
      {run.stopReason && <StopAlert reason={run.stopReason} />}
    </Stack>
  );
}

/** `ownTitle`: the step's page already shows a heading, so the wizard adds none. */
const STEPS = [
  { label: t('onboarding_step_cv'), Body: CvStep },
  { label: t('onboarding_step_keywords'), Body: Keywords, text: t('help_keywords'), ownTitle: true },
  { label: t('onboarding_step_blacklist'), Body: Blacklist, text: t('help_blacklist'), ownTitle: true },
  { label: t('onboarding_step_profile'), Body: () => <CvProfileForm onChange={noop} />, text: t('onboarding_profile_text') },
  { label: t('onboarding_step_analysis'), Body: AnalysisStep },
];

/** Guided first setup at /welcome: CV, keywords, blacklist, profile, first analysis. */
export default function Onboarding() {
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const last = active === STEPS.length - 1;

  // Each new step takes focus, so screen readers announce it by name. Not on
  // mount (or StrictMode's re-run): the app shell already moves focus to the page.
  const stepRef = useRef(null);
  const shownStep = useRef(active);
  useEffect(() => {
    if (shownStep.current !== active) stepRef.current?.focus();
    shownStep.current = active;
  }, [active]);

  const leave = () => {
    markOnboardingDone();
    navigate('/');
  };

  const { label, Body, text, ownTitle } = STEPS[active];

  return (
    <Stack maw={720}>
      <Title order={2}>{t('onboarding_title')}</Title>
      <Text c="dimmed">{t('onboarding_intro')}</Text>

      <Stepper active={active} onStepClick={setActive} size="sm">
        {STEPS.map((step) => <Stepper.Step key={step.label} label={step.label} />)}
      </Stepper>

      <Stack component="section" ref={stepRef} tabIndex={-1} aria-label={label} style={{ outline: 'none' }}>
        {!ownTitle && <Title order={3}>{label}</Title>}
        {text && <Text>{text}</Text>}
        <Body />
      </Stack>

      <Group justify="space-between" mt="md">
        <Button variant="subtle" onClick={leave}>{t('onboarding_skip')}</Button>
        <Group>
          {active > 0 && <Button variant="default" onClick={() => setActive(active - 1)}>{t('onboarding_back')}</Button>}
          {last
            ? <Button onClick={leave}>{t('onboarding_finish')}</Button>
            : <Button onClick={() => setActive(active + 1)}>{t('onboarding_next')}</Button>}
        </Group>
      </Group>
    </Stack>
  );
}
