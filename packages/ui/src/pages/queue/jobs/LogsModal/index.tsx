import React from 'react';
import shallow from 'zustand/shallow';
import { useJobLogsStore } from '@/stores/job-logs';
import { useNetwork } from '@/hooks/use-network';
import NetworkRequest from '@/components/NetworkRequest';
import { useQueueData } from '@/hooks/use-queue-data';
import { Button, createStyles, Group, List, Modal, TextInput } from '@mantine/core';

const useStyles = createStyles((theme) => ({
  root: {
    width: 500,
    '@media(max-width: 540px)': {
      width: 'auto',
    },
  },
  inputRoot: {
    display: 'flex',
    alignItems: 'center',
    '& button': {
      marginLeft: theme.spacing(1),
    },
  },
}));

const JobLogs = () => {
  const [log, setLog] = React.useState('');

  const cls = useStyles();
  const {
    queries: { getJobLogs },
    mutations: { createJobLog },
  } = useNetwork();
  const [onClose, jobIdentity] = useJobLogsStore(
    (state) => [
      state.close,
      state.jobIdentity as NonNullable<typeof state.jobIdentity>,
    ],
    shallow
  );
  const readonly = !!useQueueData(jobIdentity.queue)?.readonly;
  const { status, refetch, data } = useQuery(
    [QueryKeysConfig.jobLogs, jobIdentity],
    () => getJobLogs(jobIdentity),
    {
      enabled: Boolean(jobIdentity),
    }
  );
  const mutation = useAbstractMutation({
    mutation: createJobLog,
    toast: 'Created',
    onSuccess: () => {
      refetch();
      setLog('');
    },
  });
  const onSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    mutation.mutate({
      ...jobIdentity,
      row: log,
    });
  };
  return (
    <>
      <Modal
        title={`Logs for ${jobIdentity.jobId}`}
        className={cls.root}>
        <form aria-disabled={readonly} onSubmit={onSubmit} autoComplete="off">
          <div className={cls.inputRoot}>
            <Group spacing={2}>
              <TextInput
                disabled={readonly}
                value={log}
                onChange={(e) => setLog(e.target.value)}
                required
                id="job-log-input"
                label="Log"
                style={{ width: '100%' }}
              />
              <Button color="inherit" disabled={readonly} type="submit">
                submit
              </Button>
            </Group>
          </div>
          <div>


          </div>
        </form>
        <NetworkRequest status={status} refetch={refetch}>
          <List withPadding size="md">
            {data?.job?.logs?.logs.map((log, idx) => (
              <List.Item key={idx}>{log}</List.Item>
            ))}
          </List>
        </NetworkRequest>
      </Modal>
      <div>
        <Button onClick={onClose}>Close</Button>
      </div>
    </>
  );
};
export default function JobLogsModal() {
  const [isOpen, onClose] = useJobLogsStore(
    (state) => [state.isOpen, state.close],
    shallow
  );
  return (
    <Dialog open={isOpen} onClose={onClose}>
      <JobLogs />
    </Dialog>
  );
}
