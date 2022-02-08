import { useDisclosure, useEscPressed, useWhyDidYouUpdate } from 'src/hooks';
import { SortOrderEnum } from 'src/types';
import { ActionIcon, Button, Center, Group, Paper } from '@mantine/core';
import { FilterDropdown } from 'src/pages/hosts/host/QueueFilterToolbar/FilterDropdown';
import RegisterQueueDialog from 'src/pages/hosts/host/QueueFilterToolbar/RegisterQueueDialog';
import { useHostActions } from 'src/services/host/hooks';
import React, { useCallback, useRef } from 'react';
import type { Queue, QueueFilter, QueueHost } from 'src/types';
import {
  DEFAULT_SORT_FIELDS,
  filtersEqual,
  normalizeFilter,
} from 'src/services';
import { useClickOutside } from '@mantine/hooks';

interface FilterToolbarProps {
  hostId: QueueHost['id'];
  filter: QueueFilter;
  onFilterUpdated: (filter: Partial<QueueFilter>) => void;
}

const DEFAULT_SORT = 'name';
export const SORT_FIELDS = DEFAULT_SORT_FIELDS;

const QueueFilterToolbar: React.FC<FilterToolbarProps> = (props) => {
  const { onFilterUpdated, filter, hostId } = props;
  const savedState = useRef<QueueFilter>(normalizeFilter(filter));
  const actions = useHostActions(hostId);

  const {
    isOpen: isDropdownOpen,
    onClose: closeDropdown,
    onToggle: toggleDropdown,
  } = useDisclosure({ defaultIsOpen: false });

  const {
    isOpen: isRegisterQueueOpen,
    onClose: closeRegisterQueue,
    onToggle: toggleRegisterQueue,
  } = useDisclosure({ defaultIsOpen: false });

  // Create a ref that we add to the element for which we want to detect outside clicks
  const dropdownRef = useClickOutside(closeDropdown);

  useEscPressed(closeDropdown);

  useWhyDidYouUpdate('QueueFilterToolbar', props);

  const onQueuesChanged = useCallback(
    (delta: Partial<QueueFilter>) => {
      const curr = savedState.current;
      const update = {
        ...delta,
        sortBy: curr.sortBy,
        sortOrder: curr.sortOrder,
      };
      onFilterUpdated(update);
    },
    [hostId],
  );

  const onQueueAdded = useCallback(
    (queue: Queue) => {
      console.log('onQueueAdded', queue);
    },
    [hostId],
  );

  function onSortChange(sortBy: string, sortOrder: SortOrderEnum) {
    const filter = savedState.current;
    const delta = {
      sortBy,
      sortOrder,
    };
    filter.sortOrder = sortOrder;
    filter.sortBy = sortBy;
    onFilterUpdated(delta);
  }

  function sort(order: SortOrderEnum) {
    const filter = savedState.current;
    onSortChange(filter.sortBy ?? DEFAULT_SORT, order);
  }

  function toggleSort() {
    const filter = savedState.current;
    if (filter.sortOrder === SortOrderEnum.Asc) {
      sort(SortOrderEnum.Desc);
    } else {
      sort(SortOrderEnum.Asc);
    }
  }

  function SortIcon() {
    const filter = savedState.current;
    const ascending = filter.sortOrder === SortOrderEnum.Asc;
    return (
      <ActionIcon onClick={toggleSort} aria-label="Sort">
        {ascending ? (
          <i
            className="i-la-sort-alpha-up text-3xl"
            style={{ width: 24, height: 24 }}
          />
        ) : (
          <i
            className="i-la-sort-alpha-down-alt text-3xl"
            style={{ width: 24, height: 24 }}
          />
        )}
      </ActionIcon>
    );
  }

  const onSortFieldClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, name: string) => {
      e.preventDefault();
      closeDropdown();
      onSortChange(name, savedState.current.sortOrder ?? SortOrderEnum.Asc);
    },
    [filter],
  );

  function ToolbarControl() {
    const filter = savedState.current;
    return (
      <Paper shadow="xs" radius="sm" padding="sm" className="px-3">
        <Group>
          <div>
            <div className="flex">
              <div style={{ position: 'relative' }}>
                <div className="flex">
                  <Button
                    onClick={toggleDropdown}
                    variant="subtle"
                    aria-label={`Sort by ${filter.sortBy}`}
                    id="sort-dropdown-button"
                    className="font-medium text-md px-4 flex-1 grow"
                    type="button"
                  >
                    {filter.sortBy}
                    <i className="i-la-angle-down text-2xl ml-2" />
                  </Button>
                  <Center className={'left-0'}>
                    <SortIcon />
                  </Center>
                </div>

                {isDropdownOpen && (
                  <div
                    ref={dropdownRef}
                    className={'absolute z-400 w-44 text-base list-none bg-white rounded divide-y divide-gray-100 shadow dark:bg-gray-700'}
                  >
                    <ul className="py-1" aria-labelledby="dropdownButton">
                      {SORT_FIELDS.map((name) => (
                        <li key={name}>
                          <a
                            href="#"
                            onClick={(e) => onSortFieldClick(e, name)}
                            className="block py-2 px-4 text-sm text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-200 dark:hover:text-white"
                          >
                            {name}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div>
            <span className="sr-only">Filter</span>
            <FilterDropdown
              onFilterUpdated={onQueuesChanged}
              filter={savedState.current}
              hostId={hostId}
            />
          </div>
          <Button
            variant="filled"
            compact={true}
            aria-label="Add Queue"
            id="add-queue-button"
            onClick={toggleRegisterQueue}
          >
            Add
          </Button>
        </Group>
      </Paper>
    );
  }

  function Actions() {
    return (
      <div className="flex justify-between sm:items-center mb-8">
        <div></div>
        {/* Right: Actions */}
        <div className="flex justify-start gap-2">
          <ToolbarControl />
        </div>
      </div>
    );
  }

  return (
    <>
      <Actions />
      <RegisterQueueDialog
        actions={actions}
        onQueueAdded={onQueueAdded}
        isOpen={isRegisterQueueOpen}
        onClose={closeRegisterQueue}
      />
    </>
  );
};

function arePropsEqual(a: FilterToolbarProps, b: FilterToolbarProps): boolean {
  if (a.onFilterUpdated !== b.onFilterUpdated) {
    return false;
  }
  if (a.hostId !== b.hostId) {
    return false;
  }
  return filtersEqual(a.filter, b.filter);
}

export default React.memo(QueueFilterToolbar, arePropsEqual);
