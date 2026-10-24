import { Anchor, Badge, Drawer, Stack, Text, Title, Typography } from '@mantine/core';
import ReactMarkdown from 'react-markdown';
import QueryState from './QueryState.jsx';
import { getJob } from '../api/endpoints/analyses.js';
import { useFetch } from '../hooks/useFetch.js';
import { t } from '../l10n.js';

function JobBody({ job }) {
  const posting = useFetch((signal) => getJob(job.job_id, { signal }), [job.job_id]);

  return (
    <Stack>
      {job.adequation_grade != null && <Badge>{job.adequation_grade}</Badge>}
      <Title order={5}>{t('job_drawer_analysis')}</Title>
      {job.depth_analysis
        ? <Typography><ReactMarkdown>{job.depth_analysis}</ReactMarkdown></Typography>
        : <Text c="dimmed">{t('analysis_no_details')}</Text>}
      <Title order={5}>{t('job_drawer_posting')}</Title>
      <QueryState loading={posting.loading} error={posting.error} hasData={posting.data != null}
        onRetry={posting.refetch} label={t('candidates_job_label')}>
        {posting.data && (
          <>
            <Anchor href={posting.data.url} target="_blank" rel="noreferrer">{t('analysis_open_posting')}</Anchor>
            {/* Scraped text, not Markdown: keep its line breaks, render nothing as HTML. */}
            <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
              {posting.data.description || t('candidates_no_description')}
            </Text>
          </>
        )}
      </QueryState>
    </Stack>
  );
}

/**
 * A posting's AI analysis and full description, in a right-hand drawer.
 *
 * @param {{job: ?{job_id: string, title: string, company: string,
 *     adequation_grade: ?number, depth_analysis: ?string},
 *     onClose: function(): void}} props Closed while `job` is null.
 */
export default function JobDrawer({ job, onClose }) {
  return (
    <Drawer opened={job !== null} onClose={onClose} position="right" size="lg"
      title={job && t('analysis_drawer_title', { title: job.title, company: job.company })}>
      {job && <JobBody job={job} />}
    </Drawer>
  );
}
