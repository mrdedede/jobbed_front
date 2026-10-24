import TermList from '../../components/TermList/TermList.jsx';
import {
  createBlacklistTerm, listBlacklist, removeBlacklistTerm, updateBlacklistTerm,
} from '../../api/endpoints/blacklist.js';
import { t } from '../../l10n.js';

const api = {
  list: listBlacklist, create: createBlacklistTerm, update: updateBlacklistTerm, remove: removeBlacklistTerm,
};

export default function Blacklist() {
  return <TermList title={t('blacklist_title')} help={t('help_blacklist')} api={api} />;
}
