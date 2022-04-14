import { LoadingOverlay, ScrollArea } from '@mantine/core';
import React from 'react';
import { useJobQueryParameters } from '../hooks';
import { StatusMenu } from './StatusMenu/StatusMenu';
import { useJobListQuery } from '../hooks/use-job-list-query';
import { useWhyDidYouUpdate } from '@/hooks';
import CardView from './CardView';
import TableView from './TableView';
import JobsToolbar from '../Toolbar';

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
  const { pageCount, jobs, loading } = useJobListQuery({
    queueId,
    status,
    page,
    filter
  });

  useWhyDidYouUpdate('JobList', {
    status,
    filter,
    page,
    jobView,
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
          queue={queue}
          page={page}
          jobs={jobs}
          pageCount={pageCount}
          status={status}
          view={jobView}
          filter={filter}
        />
      </div>
      <div
        style={{
          width: '100%',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh'
        }}
      >
        <LoadingOverlay visible={loading} />
        {jobView === 'card' && (
          <ScrollArea sx={{ flex: 1 }}>
            <CardView
              queue={queue}
              jobs={jobs}
              status={status}
              isReadOnly={!!queue?.isReadonly}
            />
          </ScrollArea>
        )}
        {jobView === 'table' && (
          <TableView
            queue={queue}
            jobs={jobs}
            status={status}
            loading={loading}
            isReadOnly={!!queue?.isReadonly}
          />
        )}
      </div>
    </section>
  );
};

export default Jobs;
