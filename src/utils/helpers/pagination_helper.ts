export interface Pagination {
  page: number;
  limit: number;
  skip: number;
}

export const parsePagination = (
  pageRaw: unknown,
  limitRaw: unknown,
  defaultLimit = 10,
  maxLimit = 100
): Pagination => {
  const page = Math.max(1, Number(pageRaw) || 1);
  const limit = Math.max(1, Math.min(maxLimit, Number(limitRaw) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
};

export const buildPaginationMeta = (total: number, page: number, limit: number) => ({
  total,
  page,
  limit,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});
