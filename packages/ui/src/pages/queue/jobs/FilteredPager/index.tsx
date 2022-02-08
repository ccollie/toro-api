import { Button, Group } from '@mantine/core';
import React from 'react';
import { usePagination } from '@/hooks';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  RetryIcon,
} from '@/components/Icons';

interface FilteredJobToolbarProps {
  queueId: string;
  pageCount: number;
  onRefresh?: () => void;
}

export const FilteredPager = (props: FilteredJobToolbarProps) => {
  const { page, gotoPage } = usePagination();
  const { pageCount, onRefresh } = props;

  const hasNext = (page < pageCount);

  function doRefresh() {
    onRefresh && onRefresh();
  }

  function gotoNext() {
    gotoPage(page + 1);
  }

  function gotoPrev() {
    gotoPage(page + 1);
  }

  function Toolbar() {
    return (
      <Group spacing="sm" position="center">
        <Button
          size="sm"
          disabled={page <= 1}
          leftIcon={<ArrowLeftIcon />}
          onClick={gotoPrev}
        />
        <span>{page}</span>
        <Button
          size="sm"
          disabled={!hasNext}
          leftIcon={<ArrowRightIcon />}
          onClick={gotoNext}
        />
        <Button
          size="sm"
          disabled={!hasNext}
          leftIcon={<RetryIcon />}
          onClick={doRefresh}
        />
      </Group>
    );
  }

  return <Toolbar />;
};

export default FilteredPager;
