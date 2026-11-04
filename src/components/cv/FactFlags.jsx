import { Alert, Text } from '@mantine/core';

const allStrings = (value) => {
  if (typeof value === 'string') return [value];
  return value && typeof value === 'object' ? Object.values(value).flatMap(allStrings) : [];
};

const stillThere = ({ kind, value }, text) => {
  if (kind !== 'number') return text.includes(value);
  // A whole number: "5" is not still there because the draft says "2015".
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<!\\w)${escaped}(?!\\d)`).test(text);
};

/**
 * What the fact check could not find in a document's sources, while the draft
 * still says it: a flag clears as soon as the user edits its value away.
 *
 * @param {{flags: (Array<{kind: string, value: string}>|undefined),
 *     draft: (string|Object), message: string}} props `draft`: the text being
 *     edited, or any object holding it. `message` introduces the values.
 */
export default function FactFlags({ flags = [], draft, message }) {
  const text = allStrings(draft).join('\n');
  const shown = flags.filter((flag) => stillThere(flag, text));
  if (shown.length === 0) return null;
  return (
    <Alert color="yellow">
      {message}
      <Text size="sm" fw={700}>{shown.map((flag) => flag.value).join(', ')}</Text>
    </Alert>
  );
}
