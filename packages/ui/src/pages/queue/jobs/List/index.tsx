import { LoadingOverlay, ScrollArea } from '@mantine/core';
import React from 'react';
import { useJobQueryParameters } from '../hooks';
import { StatusMenu } from './StatusMenu/StatusMenu';
import { useJobListQuery } from '../hooks/use-job-list-query';
import { useWhyDidYouUpdate } from '@/hooks';
import { useJobsStore } from '@/stores';
import CardView from '../CardView';
import TableView from '../TableView';
import JobsToolbar from '../Toolbar';
import shallow from 'zustand/shallow';

export const Jobs = () => {
  const {
    queue,
    queueId,
    status,
    page,
    jobView,
    jobFilter: filter,
  } = useJobQueryParameters();

  // todo: load
  const { called, pageCount, jobs } = useJobListQuery({
    queueId,
    status,
    page,
    filter
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

  useWhyDidYouUpdate('JobList', {
    status,
    filter,
    page,
    jobView,
    selectedJobs,
  });

  // todo: error page
  if (!queue) {
    return <>
      <div> Queue Not Found</div>
    </>;
  }

  return (
    <section className="flex-1">
      <div>
        <StatusMenu queue={queue} status={status} page={page}/>
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
