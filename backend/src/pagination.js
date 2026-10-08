const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

/**
 * Parse pagination parameters from an Express query object.
 * Returns 1-based page number, clamped limit and 0-based SQL offset.
 */
export function parsePagination(query) {
  const rawPage = Number(query.page);
  const rawLimit = Number(query.limit);

  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(Math.floor(rawLimit), MAX_LIMIT)
    : DEFAULT_LIMIT;
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Build the standard paginated list response shape.
 */
export function buildListResponse(rows, total, page, limit) {
  return {
    data: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
