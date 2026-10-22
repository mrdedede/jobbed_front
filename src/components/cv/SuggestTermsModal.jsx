import { useEffect, useState } from 'react';
import { Alert, Button, Checkbox, Group, Loader, Modal, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { addTerms, suggestCvTerms } from '../../api/endpoints/cvs.js';
import { useFetch } from '../../hooks/useFetch.js';
import { t } from '../../l10n.js';

function TermGroup({ label, terms, value, onChange }) {
  if (terms.length === 0) return null;
  return (
    <Checkbox.Group label={label} value={value} onChange={onChange}>
      <Group gap="xs" mt="xs">
        {terms.map((term) => <Checkbox key={term} value={term} label={term} />)}
      </Group>
    </Checkbox.Group>
  );
}

/**
 * Shown right after a CV is created: asks the model for keywords and blacklist
 * terms, then lets the user add the ones they keep. Closes on its own when
 * there is nothing new to suggest. Mount it only while open.
 *
 * @param {{cvId: string, onClose: function(): void}} props
 */
export default function SuggestTermsModal({ cvId, onClose }) {
  const { data, error } = useFetch((signal) => suggestCvTerms(cvId, { signal }));
  // null: nothing unticked yet, so everything suggested is selected.
  const [keywords, setKeywords] = useState(null);
  const [blacklist, setBlacklist] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const nothingNew = Boolean(data) && data.keywords.length === 0 && data.blacklist.length === 0;
  useEffect(() => {
    if (!nothingNew) return;
    notifications.show({ color: 'green', message: t('suggest_terms_cv_saved') });
    onClose();
  }, [nothingNew, onClose]);

  const chosen = {
    keywords: keywords ?? data?.keywords ?? [],
    blacklist: blacklist ?? data?.blacklist ?? [],
  };

  const confirm = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await addTerms(chosen);
      notifications.show({
        color: 'green',
        message: t('suggest_terms_added', { count: chosen.keywords.length + chosen.blacklist.length }),
      });
      onClose();
    } catch (caught) {
      setSaveError(caught.message);
      setSaving(false);
    }
  };

  let body;
  if (error) {
    body = (
      <>
        <Alert color="yellow">{t('suggest_terms_failed', { reason: error.message })}</Alert>
        <Group justify="flex-end"><Button onClick={onClose}>{t('common_close')}</Button></Group>
      </>
    );
  } else if (!data) {
    body = (
      <Group wrap="nowrap">
        <Loader size="sm" />
        <Text>{t('suggest_terms_loading')}</Text>
      </Group>
    );
  } else {
    const count = chosen.keywords.length + chosen.blacklist.length;
    body = (
      <>
        <Text size="sm">{t('suggest_terms_intro')}</Text>
        <TermGroup label={t('keywords_title')} terms={data.keywords}
          value={chosen.keywords} onChange={setKeywords} />
        <TermGroup label={t('blacklist_title')} terms={data.blacklist}
          value={chosen.blacklist} onChange={setBlacklist} />
        {saveError && <Alert color="red">{saveError}</Alert>}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>{t('suggest_terms_skip')}</Button>
          <Button loading={saving} disabled={count === 0} onClick={confirm}>
            {t('suggest_terms_confirm', { count })}
          </Button>
        </Group>
      </>
    );
  }

  return (
    <Modal opened onClose={onClose} size="lg" title={t('suggest_terms_title')}>
      <Stack>
        {!error && <Alert color="green">{t('suggest_terms_cv_saved')}</Alert>}
        {body}
      </Stack>
    </Modal>
  );
}
