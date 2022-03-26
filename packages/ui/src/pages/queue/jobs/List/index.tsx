import { LoadingOverlay, ScrollArea } from '@mantine/core';
import React, { useEffect } from 'react';
import { useMatch } from 'react-location';
import { LocationGenerics } from 'src/types';
import { useJobQueryParameters } from '../hooks';
import { StatusMenu } from './StatusMenu/StatusMenu';
import { useJobListQuery } from '../hooks/use-job-list-query2';
import { useUpdateEffect, useWhyDidYouUpdate } from '@/hooks';
import { useInterval } from '@mantine/hooks';
import { useJobsStore, useNetworkSettingsStore } from '@/stores';
import CardView from '../CardView';
import TableView from '../TableView';
import JobsToolbar from '../Toolbar';
import shallow from 'zustand/shallow';

export const Jobs = () => {
  const {
    queueId,
    status,
    page,
    jobView,
    jobFilter: filter,
  } = useJobQueryParameters();

  const { data: { queue } } = useMatch<LocationGenerics>();

  const pollingInterval = useNetworkSettingsStore((state) => state.pollingInterval);

  useWhyDidYouUpdate('JobList', {
    queueId,
    status,
    filter,
    page,
    jobView,
  });

  // todo: load
  const { loading, called, jobs, fetchJobs, pageCount } = useJobListQuery({
    queueId,
    filter,
  });

  const [selectedJobs, isSelected, toggleSelected, removeSelected] =
    useJobsStore(
      (state) => [
        state.selectedJobs,
        state.isSelected,
        state.toggleSelectJob,
        state.unselectJob,
      ],
      shallow,
    );

  function exec() {
    if (!loading) {
      interval.stop();
      fetchJobs(status, page).finally(() => interval.start());
    }
  }

  const interval = useInterval(exec, pollingInterval);

  useEffect(() => {
    exec();
    interval.start();
    return () => interval.stop();
  }, []);

  useUpdateEffect(exec, [status, page]);

  // todo: error page
  if (!queue) {
    return <>
      <div> Queue Not Found</div>
    </>;
  }

  return (
    <section className="flex-1">
      <div>
        <StatusMenu queue={queue} status={status} />
        <JobsToolbar
          queueId={queueId}
          page={page}
          pageCount={pageCount}
          status={status}
          view={jobView}
          filter={filter}
          selected={selectedJobs}
        />
      </div>
      <div
        style={{
          width: '100%',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <LoadingOverlay visible={!called} />
        {jobView === 'card' && (
          <ScrollArea sx={{ flex: 1 }}>
            <CardView
              queueId={queueId}
              jobs={jobs}
              status={status}
              isSelected={isSelected}
              removeSelected={removeSelected}
              toggleSelected={toggleSelected}
              isReadOnly={!!queue?.isReadonly}
            />
          </ScrollArea>
        )}
        {jobView === 'table' && (
          <TableView
            queueId={queueId}
            jobs={jobs}
            status={status}
            isSelected={isSelected}
            removeSelected={removeSelected}
            toggleSelected={toggleSelected}
            isReadOnly={!!queue?.isReadonly}
          />
        )}
      </div>
    </section>
  );
};

export default Jobs;
