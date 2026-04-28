import { buildPaginationMeta, parsePagination } from '../../src/utils/helpers/pagination_helper';

describe('parsePagination', () => {
  it('returns safe defaults', () => {
    expect(parsePagination(undefined, undefined)).toEqual({ page: 1, limit: 10, skip: 0 });
  });

  it('caps limit and computes skip', () => {
    expect(parsePagination('3', '999', 10, 50)).toEqual({ page: 3, limit: 50, skip: 100 });
  });
});

describe('buildPaginationMeta', () => {
  it('calculates total pages', () => {
    expect(buildPaginationMeta(101, 2, 10)).toEqual({
      total: 101,
      page: 2,
      limit: 10,
      totalPages: 11,
    });
  });
});
