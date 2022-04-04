import React, { useEffect, useState } from 'react';
import { Metric, MetricFragment, useGetQueueMetricsQuery } from 'src/types';
import {
  useCallbackRef,
  useDisclosure,
  useUnmountEffect,
  useWhyDidYouUpdate,
} from 'src/hooks';

import DataTable from 'react-data-table-component';
import { useNavigate } from '@tanstack/react-location';
import { AddIcon, SearchIcon } from 'src/components/Icons';
import { useDebouncedCallback } from 'use-debounce';
import {
  Button,
  Group, TextInput,
} from '@mantine/core';
import { MetricDialog } from '../MetricDialog';

interface MetricListProps {
  queueId: string;
}

const MetricList = (props: MetricListProps) => {
  const { queueId } = props;
  const navigate = useNavigate();

  useWhyDidYouUpdate('MetricList', props);
  const [skip, setSkip] = useState(false);
  const [toggledClearRows, setToggledClearRows] = useState(false);
  const [metrics, setMetrics] = useState<MetricFragment[]>([]);
  const [filtered, setFiltered] = useState<MetricFragment[]>([]);
  const [selected, setSelected] = useState<MetricFragment[]>([]);
  const [filterText, setFilterText] = useState('');
  const [isSearching, setSearching] = useState(false);

  const {
    isOpen: isAddMetricDialogOpen,
    onOpen: openAddMetricDialog,
    onClose: closeAddMetricDialog,
  } = useDisclosure();

  const { loading, data, called, startPolling, stopPolling, fetchMore } =
    useGetQueueMetricsQuery({
      fetchPolicy: 'cache-and-network',
      notifyOnNetworkStatusChange: true,
      skip,
      pollInterval: 15000,
      variables: {
        id: queueId,
      },
      onError(err) {
        console.log(err);
      },
    });

  useEffect(() => {
    if (data && !loading) {
      setMetrics(data.queue?.metrics ?? []);
    }
  }, [data, loading]);

  useEffect(() => {
    setFiltered(handleFilter(filterText));
  }, [metrics, filterText]);

  function handleFilter(text: string): MetricFragment[] {
    if (!text) return metrics;
    text = text.toLowerCase();
    return metrics.filter(m => {
      const normalizedName = `${m.name} ${m.description}`.toLowerCase();
      return normalizedName.indexOf(text) !== -1;
    });
  }

  const searchFn = useDebouncedCallback(({ query }) => {
    setSearching(true);
    if (!query) {
      setSearching(false);
      setFiltered(metrics);
      return;
    }
    const items = handleFilter(query.text);

    setSearching(false);
    setFiltered(items);
  }, 150);

  useUnmountEffect(searchFn.cancel);

  function clearSearch() {
    setFilterText('');
  }

  function refresh() {
    if (skip) return;
    if (called && !loading) {
      fetch();
    }
  }

  function getVariables() {
    return {
      id: queueId,
    };
  }

  function fetch(): void {
    if (skip) return;
    stopPolling();
    const variables = getVariables();
    fetchMore({
      variables,
    }).finally(() => startPolling(5000));
  }

  function handleSelectionChange(state) {
    setSelected(state.selectedRows);
    console.log('Selected Rows: ', state.selectedRows);
  }

  // Toggle the state so React Table Table changes to `clearSelectedRows` are triggered
  const handleClearRows = useCallbackRef(() => {
    setToggledClearRows(!toggledClearRows);
  });

  const onMetricCreated = useCallbackRef((metric: Metric) => {
    const items = [...metrics, metric];
    setMetrics(items);
  });

  const rowSelectCriteria = useCallbackRef(
    (x: MetricFragment) => !!selected.find(selected => selected.id === x.id)
  );

  function handleBulkAction() {
    console.log('bulk');
  }

  function gotoMetric(id: string) {
    navigate({ to: `/queues/${queueId}/metrics/${id}` });
  }

  const onRowClicked = useCallbackRef(row => {
    gotoMetric(row.id);
  });

  const FilterComponent = ({ filterText, onFilter }) => (
    <>
      <TextInput
        id="search"
        type="text"
        icon={<SearchIcon />}
        placeholder="Filter By Name"
        aria-label="Search Input"
        value={filterText}
        onChange={onFilter}
        clearable={true}
      />
    </>
  );

  const subHeaderComponentMemo = React.useMemo(() => {
    return (
      <Group spacing="sm">
        <div>
          <FilterComponent
            onFilter={e => setFilterText(e.target.value)}
            filterText={filterText}
          />
        </div>
        <div>
          <Button leftIcon={<AddIcon />} onClick={openAddMetricDialog}>
            Add Metric
          </Button>
        </div>
      </Group>
    );
  }, [filterText]);

  function HeaderActions() {
    return (
      <Button variant="outline" leftIcon={<AddIcon />} onClick={openAddMetricDialog}>
        Add
      </Button>
    );
  }

  function TableView() {
    return (
      <>
        <DataTable
          title="Metrics"
          columns={MetricsColumns}
          data={metrics}
          fixedHeader={true}
          progressPending={loading && !called}
          selectableRows
          highlightOnHover={true}
          persistTableHead={true}
          clearSelectedRows={toggledClearRows}
          selectableRowSelected={rowSelectCriteria}
          subHeaderComponent={subHeaderComponentMemo}
          onRowClicked={onRowClicked}
          actions={<HeaderActions />}
        />
        {isAddMetricDialogOpen && (
          <MetricDialog
            queueId={queueId}
            isOpen={isAddMetricDialogOpen}
            onClose={closeAddMetricDialog}
            onCreated={onMetricCreated}
            onUpdated={refresh}
          />
        )}
      </>
    );
  }

  return <TableView />;
};

export default MetricList;
