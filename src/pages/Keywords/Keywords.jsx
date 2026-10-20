import TermList from '../../components/TermList/TermList.jsx';
import { createKeyword, listKeywords, removeKeyword, updateKeyword } from '../../api/endpoints/keywords.js';

const api = { list: listKeywords, create: createKeyword, update: updateKeyword, remove: removeKeyword };

export default function Keywords() {
  return <TermList title="Keywords" api={api} />;
}
