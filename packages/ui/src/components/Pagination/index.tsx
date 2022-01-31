import React from 'react';
import { Pagination as Pager } from '@mantine/core';
import { usePagination } from '@/hooks';

interface IPaginationProps {
  page?: number;
  pageCount: number;
}

const InnerPagination = (props: IPaginationProps) => {
  const { page: _page, gotoPage } = usePagination();
  const { page = _page, pageCount = 0 } = props;

  if (pageCount <= 1) {
    return null;
  }

  const pageIdx = (Number(page) || 1) - 1;

  return <Pager total={pageCount} page={pageIdx} onChange={gotoPage} />;
};

export const Pagination = InnerPagination;
export default Pagination;
