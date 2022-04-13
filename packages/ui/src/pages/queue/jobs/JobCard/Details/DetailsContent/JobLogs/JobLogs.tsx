import { Center, Group, LoadingOverlay, Text } from '@mantine/core';
import React, { useEffect, useState } from 'react';
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

  const { loading, data, called } = useGetJobLogsQuery({
    variables: {
      queueId,
      id,
      start: 0,
      end: -1,
    }
  });

  useEffect(() => {
    const items = !called ? [] : ((data && data.job.logs?.messages) || []) as string[];
    setLogs(items);
  }, [called, data]);

  return (
    <div>
      <LoadingOverlay visible={loading} />
      {(called && !logs.length && !loading) ?
        <Center style={{ minHeight: 200 }}>
          <Group mt={20}>
            <SadTearIcon size={36} style={{ opacity: 0.75 }}/>
            <Text>No logs found for job {job.name}#{job.id}.</Text>
          </Group>
        </Center> :
        <pre>
          <code>
            <ul className={s.jobLogs} style={{ marginTop: 5 }}>
              {logs.map((log, idx) => (
                <li key={idx}>{log}</li>
              ))}
            </ul>
          </code>
        </pre>
      }
    </div>
  );
};
