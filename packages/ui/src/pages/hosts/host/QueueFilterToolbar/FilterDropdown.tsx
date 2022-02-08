import {
  ActionIcon,
  Checkbox,
  ScrollArea,
  TextInput,
  Popover,
  Group,
  CloseButton,
  Chips,
  Chip,
  Space,
  MultiSelect,
  Button,
} from '@mantine/core';
import { FilterIcon } from 'src/components/Icons';
import { QueueStateBadge } from '@/pages/queue/QueueStateBadge';
import {
  useDisclosure,
  useSelection,
  useUpdateEffect,
  useWhyDidYouUpdate,
} from 'src/hooks';
import {
  AllStatuses,
  filterQueues,
  normalizeExclusions,
  normalizeFilter,
  stringEqual,
  useHost,
  useQueuePrefixes,
} from 'src/services';
import { useStore } from 'src/stores';
import type { Queue, QueueFilter, QueueHost } from 'src/types';
import { QueueFilterStatus } from 'src/types';
import React, {
  ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

interface FilterDropdownProps {
  isOpen?: boolean;
  hostId: QueueHost['id'];
  filter: QueueFilter;
  onFilterUpdated: (filter: Partial<QueueFilter>) => void;
}

const QueuesForm = (props: FilterDropdownProps) => {
  const { hostId, filter } = props;
  const [filtered, setFiltered] = useState<Queue[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(false);

  const getHostQueues = useStore((state) => state.getHostQueues);
  const { host } = useHost(hostId);
  const [searchTerm, setSearchTerm] = useState(filter.search);
  const [statuses, setStatuses] = useState<QueueFilterStatus[]>(
    filter.statuses ?? AllStatuses,
  );
  const [prefixes, setPrefixes] = useState<string[]>(filter.prefixes ?? []);

  // todo: we may need to go to server to get all prefixes, since we may be filtered
  const allPrefixes = useQueuePrefixes(hostId);

  const {
    selectedItems,
    toggleSelection,
    isSelected,
    selectItem,
    unselectItem,
    isAllSelected,
    totalSelected,
    setSelected,
  } = useSelection<Queue>(queues);

  useEffect(() => {
    const queues = host?.queues || [];
    setQueues(queues);
    setFiltered(queues);
    if (!loading) {
      setLoading(true);
      getHostQueues(hostId).then((queues) => {
        setQueues(queues);
        setFiltered(queues);
        const selected = calculateSelected(queues);
        setSelected(selected ?? []);
        setLoading(false);
      });
    }
  }, [hostId]);

  function handleNotify() {
    if (props.onFilterUpdated) {
      const include = selectedItems.map((queue) => queue.id);
      props.onFilterUpdated({
        prefixes,
        search: searchTerm,
        statuses,
        include,
      });
    }
  }

  useUpdateEffect(() => {
    handleNotify();
  }, [selectedItems, statuses, prefixes]);

  useWhyDidYouUpdate('QueuesSelectable', props);

  function calculateSelected(queues: Queue[]) {
    normalizeExclusions(filter);
    if (filter.include?.length) {
      return filter.include;
    }
    if (filter.exclude?.length) {
      const allIds = new Set(queues.map((x) => x.id));
      filter.exclude.forEach((id) => allIds.delete(id));
      return Array.from(allIds);
    }
    return [];
  }

  // todo: debounce this
  function filterOptions() {
    let filtered: Queue[];
    if (statuses.length === 0 && !prefixes.length && !searchTerm) {
      filtered = [...queues];
    } else {
      const filter: QueueFilter = {
        statuses,
        prefixes,
        search: searchTerm,
      };
      filtered = filterQueues(queues, filter);
    }
    setFiltered(filtered);
  }

  useEffect(() => {
    filterOptions();
  }, [statuses, prefixes, searchTerm]);

  useWhyDidYouUpdate('QueuesSelectable', props);

  function onStatusChanged(statuses: string[]) {
    setStatuses(statuses as QueueFilterStatus[]);
  }

  function onSearchTermChange(e: ChangeEvent<HTMLInputElement>) {
    const term = e.currentTarget.value;
    if (!stringEqual(searchTerm, term)) {
      setSearchTerm(term);
    }
  }

  const onSelectAllClicked = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const checked = e.currentTarget.checked;
      // clicked select all
      if (checked) {
        setSelected(queues.map((x) => x.id));
      } else {
        setSelected([]);
      }
      console.log('All clicked');
    },
    [queues],
  );

  function QueueItem({ queue, selected }: { queue: Queue; selected: boolean }) {
    const id = queue.id;
    const onChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.currentTarget.checked;
        if (checked) {
          selectItem(id);
        } else {
          unselectItem(id);
        }
      },
      [id],
    );

    return (
      <li className="py-1" onClick={(_) => toggleSelection(id)}>
        <Group position="apart">
          <div style={{ display: 'inherit' }}>
            <Checkbox
              defaultChecked={selected}
              onChange={onChange}
              className="inline"
            />
            <span className="text-sm ml-2">{queue.name}</span>
          </div>
          <QueueStateBadge queue={queue} size="xs" />
        </Group>
      </li>
    );
  }

  return (
    <div style={{ minHeight: '425px' }}>
      <form className="form">
        <div className="mt-4 mb-2">
          <Chips multiple value={statuses} onChange={onStatusChanged}>
            <Chip value={QueueFilterStatus.Active} aria-label="Active">
              Active
            </Chip>
            <Chip value={QueueFilterStatus.Inactive} aria-label="Inactive">
              Inactive
            </Chip>
            <Chip value={QueueFilterStatus.Running} aria-label="Running">
              Running
            </Chip>
            <Chip value={QueueFilterStatus.Paused} aria-label="Paused">
              Paused
            </Chip>
          </Chips>
        </div>
        <div className="mt-4" aria-label="Queue selections">
          <div className="flex justify-center">
            <TextInput
              type="search"
              icon={
                <i className="i-la-search text-gray-600 dark:text-gray-400 text-xl" />
              }
              label="Filter Queues"
              className="w-full"
              placeholder="Filter By Name"
              aria-label="queue name filter"
              onChange={onSearchTermChange}
            />
          </div>
          <Space h="md" />
          <MultiSelect
            width="100%"
            value={prefixes}
            data={allPrefixes}
            onChange={setPrefixes}
            label="Queue prefixes"
            placeholder="Select prefix(es)"
          />
          <Space h="md" />
          <div className="flex flex-row justify-between mb-3 ml-2 mt-1">
            <div className="border border-gray-400 flex-shrink">
              <Checkbox
                defaultChecked={isAllSelected}
                onChange={onSelectAllClicked}
              />
            </div>
            <div className="flex-1">
              <span className="ml-2">{totalSelected}</span> queues selected
            </div>
          </div>
          <div id="queue-list">
            <ScrollArea aria-label="Queue selections">
              <div className="pl-2">
                <ul className="list-reset flex-row">
                  {filtered.map((queue) => (
                    <QueueItem
                      key={queue.id}
                      queue={queue}
                      selected={isSelected(queue.id)}
                    />
                  ))}
                </ul>
              </div>
            </ScrollArea>
          </div>
        </div>
      </form>
    </div>
  );
};

export const FilterDropdown = (props: FilterDropdownProps) => {
  const { onFilterUpdated, hostId, filter } = props;
  const {
    isOpen: isPopoverOpen,
    onClose: closePopover,
    onToggle: togglePopover,
  } = useDisclosure();
  const savedState = useRef<QueueFilter>(normalizeFilter(filter));

  useWhyDidYouUpdate('QueueFilterToolbar', props);

  function handleNotify() {
    if (onFilterUpdated) {
      const curr = savedState.current;
      normalizeExclusions(curr);
      onFilterUpdated(curr);
    }
  }

  const pushUpdate = useCallback(
    (delta: Partial<QueueFilter>) => {
      Object.assign(savedState.current, delta);
    },
    [hostId],
  );

  const applyFilter = useCallback(() => {
    handleNotify();
    closePopover();
  }, []);

  function onPopoverTriggerClicked(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    togglePopover();
  }

  return (
    <Popover
      withArrow
      opened={isPopoverOpen}
      onClose={closePopover}
      position="bottom"
      placement="center"
      target={
        <ActionIcon
          aria-controls="Queue Filter Popup"
          aria-expanded={isPopoverOpen}
          aria-haspopup="true"
          aria-label="Queue Filter"
          onClick={onPopoverTriggerClicked}
        >
          <FilterIcon />
        </ActionIcon>
      }
    >
      <div className="flex flex-col">
        <Group position="apart">
          <h4>Filter</h4>
          <CloseButton
            title="Close popover"
            size="xl"
            iconSize={20}
            onClick={closePopover}
          />
        </Group>
        <div className="mb-4">
          <QueuesForm
            hostId={hostId}
            filter={savedState.current}
            onFilterUpdated={pushUpdate}
          />
        </div>
      </div>
      <div className="py-2 border-gray-200 bg-gray-50">
        <Group position="right">
          <Button variant="default">Clear</Button>
          <Button variant="filled" onClick={applyFilter}>
            Apply
          </Button>
        </Group>
      </div>
    </Popover>
  );
};
