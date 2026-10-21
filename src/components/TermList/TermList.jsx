import { useState } from 'react';
import { ActionIcon, Badge, Button, Group, Loader, Paper, Stack, Text, TextInput, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useFetch } from '../../hooks/useFetch.js';

const TERM_MAX_LENGTH = 100;
let tempCounter = 0;

/** Same normalisation the API applies. */
const normalize = (value) => value.trim().toLowerCase();

function checkTerm(term, terms, ignoreId) {
  if (!term) return 'Enter a term';
  if (term.length > TERM_MAX_LENGTH) return `At most ${TERM_MAX_LENGTH} characters`;
  if (terms.some((t) => t.term === term && t.id !== ignoreId)) return 'Already in the list';
  return null;
}

/** Shows 409s inline (the caller does); anything else becomes a toast. */
function toastUnexpected(error) {
  notifications.show({ color: 'red', title: 'Request failed', message: error.detail ?? error.message });
}

/**
 * Editable list of terms with optimistic add / edit / remove. Used for both
 * keywords and the blacklist.
 *
 * @param {{title: string, max?: number, api: {
 *   list: function(Object=): Promise<Array<{id: string, term: string}>>,
 *   create: function(string): Promise<{id: string, term: string}>,
 *   update: function(string, string): Promise<{id: string, term: string}>,
 *   remove: function(string): Promise<null>}}} props
 */
export default function TermList({ title, api, max = 200 }) {
  const { data, loading, error, refetch } = useFetch((signal) => api.list({ signal }));
  // `local` holds optimistic edits; null means "show what the server sent".
  // A new server response (a refetch) replaces them.
  const [local, setLocal] = useState(null);
  const [localFor, setLocalFor] = useState(data);
  if (localFor !== data) {
    setLocalFor(data);
    setLocal(null);
  }
  const terms = local ?? data ?? [];
  const update = (change) => setLocal((previous) => change(previous ?? data ?? []));

  const [draft, setDraft] = useState('');
  const [addError, setAddError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState('');
  const [rowError, setRowError] = useState(null);

  const atLimit = terms.length >= max;

  const resync = () => {
    setLocal(null);
    refetch();
  };

  const add = async (event) => {
    event.preventDefault();
    const term = normalize(draft);
    const problem = atLimit ? `Limit reached (${max})` : checkTerm(term, terms);
    setAddError(problem);
    if (problem) return;

    const tempId = `tmp-${++tempCounter}`;
    update((previous) => [...previous, { id: tempId, term, pending: true }]);
    setDraft('');
    try {
      const created = await api.create(term);
      update((previous) =>
        previous.some((t) => t.id === created.id)
          ? previous.filter((t) => t.id !== tempId)
          : previous.map((t) => (t.id === tempId ? created : t)));
    } catch (caught) {
      update((previous) => previous.filter((t) => t.id !== tempId));
      setDraft(term);
      if (caught.status === 409) setAddError(`Limit reached (${max})`);
      else toastUnexpected(caught);
    }
  };

  const saveEdit = async (item) => {
    const term = normalize(editDraft);
    setRowError(null);
    if (term === item.term) return setEditingId(null);
    const problem = checkTerm(term, terms, item.id);
    if (problem) return setRowError({ id: item.id, message: problem });

    setEditingId(null);
    update((previous) => previous.map((t) => (t.id === item.id ? { ...t, term, pending: true } : t)));
    try {
      const updated = await api.update(item.id, term);
      update((previous) => previous.map((t) => (t.id === item.id ? updated : t)));
    } catch (caught) {
      if (caught.status === 404) return resync();
      update((previous) => previous.map((t) => (t.id === item.id ? item : t)));
      if (caught.status === 409) setRowError({ id: item.id, message: 'Already in the list' });
      else toastUnexpected(caught);
    }
  };

  const remove = async (item) => {
    const index = terms.findIndex((t) => t.id === item.id);
    update((previous) => previous.filter((t) => t.id !== item.id));
    try {
      await api.remove(item.id);
    } catch (caught) {
      if (caught.status === 404) return; // already gone
      update((previous) => {
        const restored = [...previous];
        restored.splice(Math.min(index, restored.length), 0, item);
        return restored;
      });
      toastUnexpected(caught);
    }
  };

  if (loading && data === null) return <Loader />;
  if (error && data === null) {
    return <Button color="red" variant="light" onClick={refetch}>Failed to load, retry</Button>;
  }

  return (
    <Stack maw={520}>
      <Group justify="space-between">
        <Title order={2}>{title}</Title>
        <Badge variant="light" color={atLimit ? 'red' : 'violet'}>{terms.length} / {max}</Badge>
      </Group>

      <form onSubmit={add}>
        <Group align="flex-start" wrap="nowrap">
          <TextInput flex={1} placeholder="Add a term" value={draft} error={addError}
            disabled={atLimit} maxLength={TERM_MAX_LENGTH * 2}
            onChange={(event) => setDraft(event.currentTarget.value)} />
          <Button type="submit" disabled={atLimit}>Add</Button>
        </Group>
      </form>

      {terms.length === 0 && <Text c="dimmed">Nothing here yet.</Text>}
      {terms.map((item) => (
        <Paper key={item.id} withBorder p="xs" opacity={item.pending ? 0.5 : 1}>
          {editingId === item.id ? (
            <form onSubmit={(event) => { event.preventDefault(); saveEdit(item); }}>
              <Group wrap="nowrap" align="flex-start">
                <TextInput flex={1} autoFocus value={editDraft}
                  error={rowError?.id === item.id ? rowError.message : null}
                  onChange={(event) => setEditDraft(event.currentTarget.value)} />
                <Button type="submit" size="xs">Save</Button>
                <Button size="xs" variant="default"
                  onClick={() => { setEditingId(null); setRowError(null); }}>Cancel</Button>
              </Group>
            </form>
          ) : (
            <>
              <Group justify="space-between" wrap="nowrap">
                <Text style={{ overflowWrap: 'anywhere' }}>{item.term}</Text>
                <Group gap="xs" wrap="nowrap">
                  <Button size="xs" variant="subtle" disabled={item.pending}
                    onClick={() => { setEditingId(item.id); setEditDraft(item.term); setRowError(null); }}>
                    Edit
                  </Button>
                  <ActionIcon color="red" variant="subtle" disabled={item.pending}
                    aria-label={`Remove ${item.term}`} onClick={() => remove(item)}>
                    ×
                  </ActionIcon>
                </Group>
              </Group>
              {rowError?.id === item.id && <Text size="xs" c="red">{rowError.message}</Text>}
            </>
          )}
        </Paper>
      ))}
    </Stack>
  );
}
