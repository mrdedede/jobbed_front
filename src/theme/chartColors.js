export const CATEGORICAL_PALETTE = [
  'violet.6',
  'teal.6',
  'orange.6',
  'blue.6',
  'pink.6',
  'yellow.6',
  'cyan.6',
  'red.6',
];

export const OTHER_COLOR = 'gray.5';

export function colorForIndex(index) {
  return CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length];
}
