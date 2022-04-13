import { Center, Group, Text } from '@mantine/core';
import React from 'react';
import { SadTearIcon } from 'src/components/Icons';
import { TabsType } from 'src/pages/queue/jobs/hooks/useDetailsTabs';
import { Highlight } from 'src/components/Highlight/Highlight';
import { JobLogs } from './JobLogs/JobLogs';
import type { Job, JobFragment } from 'src/types';

interface DetailsContentProps {
  job: Job | JobFragment;
  selectedTab: TabsType;
}

function stringify(data: any) {
  if (typeof data === 'object') {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { __typename, ...rest } = data;
    data = rest;
  }
  return JSON.stringify(data, null, 2);
}

interface ReturnValueProps {
  value: any;
}

const ReturnValue = ({ value }: ReturnValueProps) => {
  const hasValue = !(value === null || value === undefined);
  if (!hasValue) {
    value = {};
  } else if (typeof (value) === 'string') {
    try {
      value = JSON.parse(value);
    } catch (e) {
      // do nothing
    }
  }
  const isObj = typeof value === 'object';
  const code = isObj ? JSON.stringify(value, null, 2) : null;
  if (!hasValue)
    return (
      <Center style={{ minHeight: 200 }}>
        <Group mt={20}>
          <SadTearIcon size={36} style={{ opacity: 0.75 }}/>
          <Text>No Return Value.</Text>
        </Group>
      </Center>
    );

  return (
    <>
      {isObj ? (
        <Highlight language="json">{code}</Highlight>
      ) : (
        <div>{value}</div>
      )}
    </>
  );
};

export const DetailsContent = ({ selectedTab, job }: DetailsContentProps) => {
  const { stacktrace, data, returnvalue, opts, failedReason } = job;

  switch (selectedTab) {
    case 'Data':
      return (
        <Highlight language="json">{stringify(data)}</Highlight>
      );
    case 'Options':
      return <Highlight language="json">{stringify(opts)}</Highlight>;
    case 'Error':
      return (
        <>
          {stacktrace.length === 0 ? (
            <div className="error mt-3">{!!failedReason ? `${failedReason}` : 'NA'}</div>
          ) : (
            <Highlight language="stacktrace" key="stacktrace">
              {stacktrace.join('\n')}
            </Highlight>
          )}
        </>
      );
    case 'Logs':
      return <JobLogs job={job} />;
    case 'Return Value': {
      return <ReturnValue value={returnvalue} />;
    }
    default:
      return null;
  }
};
