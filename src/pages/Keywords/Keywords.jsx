import TermList from '../../components/TermList/TermList.jsx';
import { createKeyword, listKeywords, removeKeyword, updateKeyword } from '../../api/endpoints/keywords.js';
import { t } from '../../l10n.js';

const api = { list: listKeywords, create: createKeyword, update: updateKeyword, remove: removeKeyword };

export default function Keywords() {
  return <TermList title={t('keywords_title')} api={api} />;
}
