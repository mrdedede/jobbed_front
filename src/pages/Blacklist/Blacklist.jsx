import TermList from '../../components/TermList/TermList.jsx';
import {
  createBlacklistTerm, listBlacklist, removeBlacklistTerm, updateBlacklistTerm,
} from '../../api/endpoints/blacklist.js';

const api = {
  list: listBlacklist, create: createBlacklistTerm, update: updateBlacklistTerm, remove: removeBlacklistTerm,
};

export default function Blacklist() {
  return <TermList title="Blacklist" api={api} />;
}
