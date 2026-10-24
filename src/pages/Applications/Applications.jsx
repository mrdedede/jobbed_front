import { useState } from 'react';
import {
  ActionIcon, Anchor, Badge, Button, Drawer, Group, Menu, Modal, Paper, Radio, SimpleGrid, Stack,
  Table, Text, Textarea, Title, UnstyledButton,
} from '@mantine/core';
import { Link } from 'react-router-dom';
import { getJob } from '../../api/endpoints/analyses.js';
import { GradeBadge } from '../../components/analysis/AnalysisTable.jsx';
import QueryState from '../../components/QueryState.jsx';
import { REASONS, STAGES, reasonLabel, stageLabel, useApplications } from '../../hooks/useApplications.js';
import { useFetch } from '../../hooks/useFetch.js';
import { t } from '../../l10n.js';

const FEEDBACK_MAX = 2000;

/**
 * One card. Drag it to another column, or use its menu (keyboard and touch
 * can't drag); clicking the title opens the posting.
 */
function ApplicationCard({ card, onMove, onReject, onOpen }) {
  return (
    <Paper withBorder p="sm" draggable style={{ cursor: 'grab' }}
      onDragStart={(event) => event.dataTransfer.setData('text/plain', card.job_id)}>
      <Group justify="space-between" wrap="nowrap" align="flex-start" gap="xs">
        <UnstyledButton onClick={() => onOpen(card)} style={{ minWidth: 0 }}>
          <Text fw={600} size="sm" lineClamp={2}>{card.title}</Text>
          <Text size="xs" c="dimmed">{[card.company, card.place].filter(Boolean).join(' · ')}</Text>
        </UnstyledButton>
        <Menu position="bottom-end" withinPortal>
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray" aria-label={t('applications_card_actions', { title: card.title })}>⋯</ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>{t('applications_move_to')}</Menu.Label>
            {STAGES.filter((stage) => stage !== card.status).map((stage) => (
              <Menu.Item key={stage} onClick={() => onMove(card.job_id, stage)}>{stageLabel(stage)}</Menu.Item>
            ))}
            <Menu.Divider />
            <Menu.Item color="red" onClick={() => onReject(card)}>{t('applications_mark_rejected')}</Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
      <Group gap="xs" mt="xs">
        <GradeBadge grade={card.adequation_grade} />
        <Text size="xs" c="dimmed">{new Date(card.updated_at ?? card.cv_created_at).toLocaleDateString()}</Text>
      </Group>
    </Paper>
  );
}

function Column({ stage, cards, onMove, children }) {
  const [over, setOver] = useState(false);
  return (
    <Paper withBorder p="sm" bg={over ? 'var(--mantine-primary-color-light)' : 'var(--mantine-color-default-hover)'}
      role="region" aria-label={stageLabel(stage)}
      onDragOver={(event) => { event.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        onMove(event.dataTransfer.getData('text/plain'), stage);
      }}>
      <Group justify="space-between" mb="sm">
        <Title order={5}>{stageLabel(stage)}</Title>
        <Badge variant="light" color="gray">{cards.length}</Badge>
      </Group>
      <Stack gap="xs" mih={80}>{children}</Stack>
    </Paper>
  );
}

function JobDrawer({ card, onClose }) {
  const job = useFetch((signal) => (card ? getJob(card.job_id, { signal }) : Promise.resolve(null)), [card?.job_id]);
  return (
    <Drawer opened={card !== null} onClose={onClose} position="right" size="lg"
      title={card && t('analysis_drawer_title', { title: card.title, company: card.company })}>
      {card && (
        <Stack>
          <Group>
            <GradeBadge grade={card.adequation_grade} />
            <Badge variant="light">{stageLabel(card.status)}</Badge>
          </Group>
          <Group>
            <Anchor href={card.url} target="_blank" rel="noreferrer">{t('analysis_open_posting')}</Anchor>
            <Anchor component={Link} to="/cv-generation">{t('applications_open_cv')}</Anchor>
          </Group>
          <QueryState loading={job.loading} error={job.error} hasData={job.data !== null}
            label={t('applications_description_label')} onRetry={job.refetch}
            empty={job.data && !job.data.description && t('applications_no_description')}>
            <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{job.data?.description}</Text>
          </QueryState>
        </Stack>
      )}
    </Drawer>
  );
}

function RejectModal({ card, onClose, onConfirm }) {
  const [reason, setReason] = useState(null);
  const [feedback, setFeedback] = useState('');
  const close = () => {
    setReason(null);
    setFeedback('');
    onClose();
  };
  return (
    <Modal opened={card !== null} onClose={close} title={t('applications_reject_title')}>
      {card && (
        <Stack>
          <Text size="sm">{t('applications_reject_intro', { title: card.title, company: card.company })}</Text>
          <Radio.Group label={t('applications_reject_reason')} value={reason} onChange={setReason}>
            <Stack gap="xs" mt="xs">
              {REASONS.map((r) => <Radio key={r} value={r} label={reasonLabel(r)} />)}
            </Stack>
          </Radio.Group>
          <Textarea label={t('applications_reject_feedback')} autosize minRows={3}
            maxLength={FEEDBACK_MAX} value={feedback} onChange={(event) => setFeedback(event.currentTarget.value)} />
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>{t('common_cancel')}</Button>
            <Button color="red" onClick={() => {
              onConfirm(card.job_id, {
                ...(reason && { rejection_reason: reason }),
                ...(feedback.trim() && { feedback: feedback.trim() }),
              });
              close();
            }}>{t('applications_reject_confirm')}</Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}

export default function Applications() {
  const { applications, loaded, loading, error, refetch, move } = useApplications();
  const [opened, setOpened] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [showRejected, setShowRejected] = useState(false);
  const rejected = applications.filter((a) => a.status === 'rejected');

  return (
    <Stack>
      <Title order={2}>{t('applications_title')}</Title>
      <Text c="dimmed" size="sm">{t('applications_intro')}</Text>

      <QueryState loading={loading} error={error} hasData={loaded} onRetry={refetch}
        label={t('applications_label')}
        empty={loaded && applications.length === 0 && t('applications_empty')}>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
          {STAGES.map((stage) => {
            const cards = applications.filter((a) => a.status === stage);
            return (
              <Column key={stage} stage={stage} cards={cards} onMove={move}>
                {cards.map((card) => (
                  <ApplicationCard key={card.job_id} card={card} onMove={move}
                    onReject={setRejecting} onOpen={setOpened} />
                ))}
              </Column>
            );
          })}
        </SimpleGrid>

        {rejected.length > 0 && (
          <Stack gap="xs">
            <Button variant="subtle" color="gray" w="fit-content" onClick={() => setShowRejected((s) => !s)}>
              {t(showRejected ? 'applications_hide_rejected' : 'applications_show_rejected', { count: rejected.length })}
            </Button>
            {showRejected && (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t('applications_col_posting')}</Table.Th>
                    <Table.Th>{t('applications_col_stage')}</Table.Th>
                    <Table.Th>{t('applications_col_reason')}</Table.Th>
                    <Table.Th />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rejected.map((card) => (
                    <Table.Tr key={card.job_id}>
                      <Table.Td>
                        <Text size="sm">{card.title}</Text>
                        <Text size="xs" c="dimmed">{card.company}</Text>
                      </Table.Td>
                      <Table.Td>{stageLabel(card.rejected_from)}</Table.Td>
                      <Table.Td>
                        {card.rejection_reason && <Text size="sm">{reasonLabel(card.rejection_reason)}</Text>}
                        {card.feedback && <Text size="xs" c="dimmed">{card.feedback}</Text>}
                      </Table.Td>
                      <Table.Td>
                        <Button size="xs" variant="light" onClick={() => move(card.job_id, card.rejected_from)}
                          aria-label={t('applications_restore_label', { title: card.title })}>
                          {t('applications_restore')}
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Stack>
        )}
      </QueryState>

      <JobDrawer card={opened} onClose={() => setOpened(null)} />
      <RejectModal card={rejecting} onClose={() => setRejecting(null)}
        onConfirm={(jobId, extra) => move(jobId, 'rejected', extra)} />
    </Stack>
  );
}
