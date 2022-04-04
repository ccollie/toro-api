import { Center, Group, LoadingOverlay, Text } from '@mantine/core';
import React, { useState } from 'react';
import type { Job, JobFragment } from '@/types';
import { SadTearIcon } from 'src/components/Icons';
import { useGetJobLogsQuery } from 'src/types';
import s from './JobLogs.module.css';

interface JobLogsProps {
  job: Job | JobFragment;
}

export const JobLogs = ({ job }: JobLogsProps) => {
  const { queueId, id } = job;
  const [logs, setLogs] = useState<string[]>([]);

  const { loading, called } = useGetJobLogsQuery({
    variables: {
      queueId,
      id,
    },
    onCompleted: (data) => {
      if (data && data.job.logs?.items) {
        setLogs(data.job.logs?.items);
      }
    },
  });

  if (called && !logs?.length) {
    return (
      <Center style={{ minHeight: 200 }}>
        <Group mt={25}>
          <SadTearIcon size={36} style={{ opacity: 0.70 }}/>
          <Text>No logs found for job {job.name}#{job.id}.</Text>
        </Group>
      </Center>
    );
  }

  return (
    <div style={{ display: 'flex' }}>
      <LoadingOverlay visible={loading} />
      {(called && !logs?.length) ?
        <Center>
          <Group mt={10}>
            <SadTearIcon size={36} style={{ opacity: 0.75 }}/>
            <Text>No logs found for job {job.name}#{job.id}.</Text>
          </Group>
        </Center> :
        <ul className={s.jobLogs}>
          {logs.map((log, idx) => (
            <li key={idx}>{log}</li>
          ))}
        </ul>
      }
    </div>
  );
};
