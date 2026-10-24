import { useEffect } from 'react';
import { Group, Pagination } from '@mantine/core';
import { PAGE_SIZE } from '../api/paging.js';

/**
 * Page buttons for a server-paged list; hidden while everything fits on one
 * page. A page past the end (rows were graded or removed) steps back to the
 * last one.
 *
 * @param {{total: ?number, page: number, onChange: function(number): void}} props
 */
export default function Pager({ total, page, onChange }) {
  const pages = Math.ceil((total ?? 0) / PAGE_SIZE);
  const past = total != null && page > Math.max(pages, 1);
  useEffect(() => {
    if (past) onChange(Math.max(pages, 1));
  }, [past, pages, onChange]);

  if (pages <= 1) return null;
  return (
    <Group justify="center">
      <Pagination size="sm" total={pages} value={page} onChange={onChange} />
    </Group>
  );
}
