import { LoadingOverlay, ScrollArea } from '@mantine/core';
import React, { useCallback, useEffect } from 'react';
import { useJobQueryParameters } from '../hooks';
import { StatusMenu } from './StatusMenu/StatusMenu';
import { useJobListQuery } from '../hooks/use-job-list-query';
import { useQueue, useUnmountEffect, useWhyDidYouUpdate } from '@/hooks';
import { useInterval } from '@mantine/hooks';
import { useJobsStore, usePreferencesStore } from '@/stores';
import CardView from '../CardView';
import TableView from '../TableView';
import JobsToolbar from '../Toolbar';
import shallow from 'zustand/shallow';

export const Jobs = () => {
  const { queueId, status, page, jobView, jobFilter: filter } = useJobQueryParameters();
  const pollingInterval = usePreferencesStore((state) => state.pollingInterval);

  const { queue } = useQueue(queueId);

  useWhyDidYouUpdate('JobList', {
    queueId,
    status,
    filter,
    page,
    jobView,
    queue,
  });

  // todo: load
  const {
    loading,
    called,
    jobs,
    fetchJobs,
    pageCount
  } = useJobListQuery({
    queueId,
    status,
    filter
  });

  const [selectedJobs, isSelected, toggleSelected, removeSelected] = useJobsStore(
    (state) => [state.selectedJobs, state.isSelected, state.toggleSelectJob, state.unselectJob],
    shallow
  );

  const exec = useCallback(() => {
    !loading && fetchJobs(page);
  }, [page]);

  const interval = useInterval(exec, pollingInterval);

  useEffect(() => {
    exec();
    interval.start();
  }, [queue, exec]);

  useUnmountEffect(() => {
    interval.stop();
  });

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
          selected={selectedJobs}
        />
      </div>
      <div style={{ width: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
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
              isReadOnly={queue.isReadonly}
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
            isReadOnly={queue.isReadonly}
          />
        )}
      </div>
    </section>
  );
};

export default Jobs;
