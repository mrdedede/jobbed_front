/** Rows per page on every paged listing (the API allows 1-100). */
export const PAGE_SIZE = 20;

/** `{limit, offset}` for a 1-based page. */
export const pageQuery = (page) => ({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
