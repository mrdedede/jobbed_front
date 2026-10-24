import { useState } from 'react';
import { Anchor, Button, Checkbox, Drawer, ScrollArea, Stack, Table, Text } from '@mantine/core';
import { getJob } from '../../api/endpoints/analyses.js';
import QueryState from '../QueryState.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { t } from '../../l10n.js';

function JobDetail({ jobId, picked, onToggle }) {
  const job = useFetch((signal) => getJob(jobId, { signal }), [jobId]);

  return (
    <Stack>
      <Button variant={picked ? 'light' : 'filled'} onClick={onToggle}>
        {picked ? t('candidates_unpick') : t('candidates_pick')}
      </Button>
      <QueryState loading={job.loading} error={job.error} hasData={job.data != null} onRetry={job.refetch}
        label={t('candidates_job_label')}>
        {job.data && (
          <>
            <Anchor href={job.data.url} target="_blank" rel="noreferrer">{t('analysis_open_posting')}</Anchor>
            {/* Scraped text, not Markdown: keep its line breaks, render nothing as HTML. */}
            <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
              {job.data.description || t('candidates_no_description')}
            </Text>
          </>
        )}
      </QueryState>
    </Stack>
  );
}

/**
 * One page of ungraded postings to pick from. The checkbox picks a row; clicking the row
 * (or Enter / Space on it) opens its description in a drawer.
 *
 * @param {{candidates: Candidate[], picked: Set<string>,
 *     onPickedChange: function(Set<string>): void, disabled?: boolean}} props
 */
export default function CandidateTable({ candidates, picked, onPickedChange, disabled = false }) {
  const [open, setOpen] = useState(null);

  if (candidates.length === 0) return <Text c="dimmed">{t('candidates_none')}</Text>;

  const toggle = (jobId) => {
    const next = new Set(picked);
    if (!next.delete(jobId)) next.add(jobId);
    onPickedChange(next);
  };
  const all = candidates.every((c) => picked.has(c.job_id));
  const some = !all && candidates.some((c) => picked.has(c.job_id));
  // Picks on other pages survive (un)picking all of this one.
  const pickPage = () => {
    const next = new Set(picked);
    for (const { job_id: jobId } of candidates) {
      if (all) next.delete(jobId);
      else next.add(jobId);
    }
    onPickedChange(next);
  };

  return (
    <>
      <ScrollArea.Autosize mah={420}>
        <Table highlightOnHover stickyHeader>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={40}>
                <Checkbox aria-label={t('candidates_pick_all')} checked={all} indeterminate={some} disabled={disabled}
                  onChange={pickPage} />
              </Table.Th>
              <Table.Th>{t('analysis_col_title')}</Table.Th><Table.Th>{t('analysis_col_company')}</Table.Th>
              <Table.Th>{t('analysis_col_place')}</Table.Th><Table.Th>{t('candidates_col_scraped')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {candidates.map((candidate) => (
              <Table.Tr key={candidate.job_id} style={{ cursor: 'pointer' }}
                tabIndex={0} role="button"
                aria-label={t('candidates_row_label', { title: candidate.title, company: candidate.company })}
                onClick={() => setOpen(candidate)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return; // keys on the checkbox are its own
                  if (event.key !== 'Enter' && event.key !== ' ') return;
                  event.preventDefault();
                  setOpen(candidate);
                }}>
                <Table.Td onClick={(event) => event.stopPropagation()}>
                  <Checkbox aria-label={t('candidates_pick_one', { title: candidate.title })}
                    checked={picked.has(candidate.job_id)} disabled={disabled}
                    onChange={() => toggle(candidate.job_id)} />
                </Table.Td>
                <Table.Td>{candidate.title}</Table.Td>
                <Table.Td>{candidate.company}</Table.Td>
                <Table.Td>{candidate.place}</Table.Td>
                <Table.Td>{new Date(candidate.scraped_at).toLocaleDateString()}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea.Autosize>

      <Drawer opened={open !== null} onClose={() => setOpen(null)} position="right" size="lg"
        title={open && t('analysis_drawer_title', { title: open.title, company: open.company })}>
        {open && <JobDetail jobId={open.job_id} picked={picked.has(open.job_id)}
          onToggle={() => toggle(open.job_id)} />}
      </Drawer>
    </>
  );
}
