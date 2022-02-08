import type { JobFilter } from 'src/types';
import { useDisclosure, useUpdateEffect } from 'src/hooks';
import {
  ActionIcon,
  Button,
  Divider,
  Group,
  Popover,
  SegmentedControl,
  Space,
  Text,
  TextInput,
} from '@mantine/core';
import React, { ChangeEvent, useCallback, useEffect, useState, Fragment } from 'react';
import { ClockIcon, SearchIcon, TrashIcon } from 'src/components/Icons';
import { getFuzzyRegex } from 'src/lib';
import { useQueueJobFilters } from 'src/services';
import QuerySaveDialog from './QuerySaveDialog';

interface QueryHistoryPopoverOpts {
  queueId: string;
  currentFilter?: string;
  isOpen: boolean;
  toggleOpen: () => void;
  onClose: () => void;
  onFilterClick?: (filter: JobFilter) => void;
}

export type ViewType = 'recent' | 'favorites';

interface FilterRowProps {
  filter: JobFilter;
  onCopy: (id: string) => void;
  onClick: (id: string) => void;
  onDelete: (id: string) => Promise<void> | void;
}

const FilterRow = (props: FilterRowProps) => {
  const { filter, onClick, onDelete, onCopy } = props;
  const { name, id } = filter;
  const [isDeleting, setIsDeleting] = useState(false);

  const clickHandler = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      onClick(id);
    },
    [onClick, id]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      setIsDeleting(true);
      Promise.resolve(onDelete(id)).finally(() => setIsDeleting(false));
    },
    [onDelete, id]
  );

  const handleCopy = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      onCopy(id);
    },
    [onCopy, id]
  );

  return (
    <div className="flex flex-col justify-between" onClick={clickHandler}>
      <div className="flex-1">{name}</div>
      <div className="flex-none float-right">
        <ActionIcon onClick={handleCopy}>
          <i className="i-la-copy" />
        </ActionIcon>
        <ActionIcon onClick={handleDelete} color="red" loading={isDeleting}>
          <TrashIcon />
        </ActionIcon>
      </div>
    </div>
  );
};

const QueryHistoryPopover = (props: QueryHistoryPopoverOpts) => {
  const { queueId, onClose, isOpen, toggleOpen } = props;
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<JobFilter[]>([]);
  const [view, setView] = useState<ViewType>('recent');
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [editName, setEditName] = useState<string>();
  const [editTitle, setEditTitle] = useState<string>('');
  const [editExpression, setEditExpression] = useState<string>('');

  const {
    isOpen: isSaveDialogOpen,
    onClose: closeSaveDialog,
    onOpen: openSaveDialog,
  } = useDisclosure({
    defaultIsOpen: false,
  });

  const { getFilters, history, deleteFilter, removeFromHistory } = useQueueJobFilters(
    props.queueId
  );

  const [data, setData] = useState<JobFilter[]>(history);

  function updateData() {
    let items = view === 'recent' ? history : filters;
    if (items.length && searchText && !!searchText.length) {
      const lowerText = searchText.toLowerCase();
      const fuzzyRegex = getFuzzyRegex(lowerText);
      items = items.filter((f) => {
        const found = fuzzyRegex.test(f.name || '');
        return found || f.expression.includes(searchText);
      });
    }
    setData(items);
  }

  useUpdateEffect(() => {
    if (view !== 'recent' && !filtersLoaded) {
      setIsLoading(true);
      getFilters()
        .then((val) => {
          setFilters(val);
          setData(val);
          setFiltersLoaded(true);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [view, filtersLoaded]);

  useEffect(() => {
    if (view === 'recent') {
      setData(history);
    } else {
      setData(filters);
    }
  }, [view]);

  useEffect(updateData, [view, searchText, filtersLoaded]);

  function onFilterCreated(created: JobFilter) {
    setFilters([created, ...filters]);
  }

  function onFilterDeleted(filter: JobFilter): void {
    setFilters(filters.filter((x) => x.id !== filter.id));
  }

  function onSearchTextChange(e: ChangeEvent<HTMLInputElement>) {
    setSearchText(e.target.value);
  }

  function handleDelete(id: string) {
    const filter = data.find((x) => x.id === id);
    if (!filter) return;
    if (view === 'recent') {
      removeFromHistory(id);
      onFilterDeleted(filter);
    } else {
      return deleteFilter(id).then(() => {
        onFilterDeleted(filter);
      });
    }
  }

  function validateName(name: string): boolean {
    name = name?.trim() ?? '';
    if (name && name.length >= 3) {
      return !data.find((x) => x.name === name);
    }
    return false;
  }

  function saveCurrent() {
    setEditName('Save Query');
    setEditName('');
    setEditExpression(props.currentFilter ?? '');
    openSaveDialog();
  }

  const handleCopy = useCallback((id: string) => {
    const found = data.find((x) => x.id === id);
    if (found) {
      setEditTitle('Create a Copy');
      setEditExpression(found.expression);
      setEditName(found.name);
      openSaveDialog();
    }
  }, []);

  const onFilterClick = useCallback(
    (id: string) => {
      const filter = data.find((x) => x.id === id);
      if (filter) {
        props.onFilterClick?.(filter);
        props.onClose();
      }
    },
    [props.onClose, props.onFilterClick]
  );

  function FilterList() {
    if (isLoading) {
      return <div>Loading</div>;
    }
    return (
      <div className="flow-root p-6 overflow-y-auto h-96">
        {data.map((filter) => (
          <FilterRow
            key={filter.id}
            filter={filter}
            onClick={onFilterClick}
            onCopy={handleCopy}
            onDelete={handleDelete}
          />
        ))}
      </div>
    );
  }

  function onViewChange(value: ViewType) {
    setView(value);
  }

  function Trigger() {
    return (
      <ActionIcon onClick={toggleOpen} aria-label="Saved Queries popover">
        <ClockIcon size={24} className="inline-block" />
      </ActionIcon>
    );
  }

  return (
    <Fragment>
      <Popover
        withArrow
        opened={isOpen}
        onClose={onClose}
        title={<Text>SAVED QUERIES</Text>}
        target={<Trigger />}
        withCloseButton
      >
        <div>
          <Text size="sm" color="gray" weight={300} mb={2}>
            Save query text and filters that you want to use again.
          </Text>
          <div>
            <SegmentedControl
              fullWidth={true}
              value={view}
              onChange={onViewChange}
              mb={4}
              data={[
                { label: 'Recent', value: 'recent' },
                { label: 'Favorites', value: 'favorites' },
              ]}
            />
            <TextInput
              icon={<SearchIcon />}
              placeholder="Type to search"
              onChange={onSearchTextChange}
              aria-label="search"
              className="w-full"
            />
          </div>
          <FilterList />
          <Space h="md" />
          <Divider />
          <Space h="sm" />
          <Group position="right" mt={3}>
            {props.currentFilter && props.currentFilter.length ? (
              <Button className="text-sm" onClick={saveCurrent}>
                Save Current Query
              </Button>
            ) : undefined}
            <Button variant="default" onClick={onClose}>Close</Button>
          </Group>
        </div>
      </Popover>
      <QuerySaveDialog
        isOpen={isSaveDialogOpen}
        queueId={queueId}
        name={editName}
        title={editTitle}
        expression={editExpression}
        validateName={validateName}
        onCreated={onFilterCreated}
        onClose={closeSaveDialog}
      />
    </Fragment>
  );
};

export default QueryHistoryPopover;
