import React, { useState } from 'react';
import { useToast } from 'src/hooks';
import { Queue, useAddJobLogMutation, useGetJobLogsQuery } from 'src/types';
import {
  Button,
  createStyles,
  Group,
  LoadingOverlay,
  Modal,
  ScrollArea,
  TextInput,
} from '@mantine/core';

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
      marginLeft: theme.spacing.sm,
    },
  },
  header: {
    position: 'sticky',
    top: 0,
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
    transition: 'box-shadow 150ms ease',

    '&::after': {
      content: '""',
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      borderBottom: `1px solid ${
        theme.colorScheme === 'dark' ? theme.colors.dark[3] : theme.colors.gray[2]
      }`,
    },
  },

  scrolled: {
    boxShadow: theme.shadows.sm,
  },
}));

type Props = {
  open: boolean;
  onClose: () => void;
  queue: Queue;
  jobId: string;
};

export const JobLogsModal = (props: Props) => {
  const { open, onClose, jobId, queue } = props;
  const [log, setLog] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [scrolled, setScrolled] = useState(false);

  const cls = useStyles();
  const toast = useToast();

  const readonly = !!queue?.isReadonly;
  const { loading, refetch } = useGetJobLogsQuery({
    variables: {
      queueId: queue.id,
      id: jobId,
    },
    onCompleted: (data) => {
      let logs: string[] = [];
      if (data?.job?.logs) {
        logs = data.job.logs?.messages ?? [];
      }
      setLogs(logs);
    },
  });

  const [createLogFn] = useAddJobLogMutation({
    onCompleted() {
      refetch();
      setLog('');
    },
    onError(error) {
      toast.error(error.message);
    },
  });

  const createJobLog = React.useCallback((message: string) => {
    createLogFn({
      variables: {
        queueId: queue.id,
        id: jobId,
        message,
      },
    });
  }, [refetch, jobId, queue.id, createLogFn]);

  const onSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    createJobLog(log);
  };

  return (
    <>
      <Modal
        opened={open}
        title={`Logs for ${jobId}`}
        onClose={onClose}
      >
        <form aria-disabled={readonly} onSubmit={onSubmit} autoComplete="off">
          <div className={cls.classes.inputRoot}>
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
                Submit
              </Button>
            </Group>
          </div>
          <div />
        </form>
        <div>
          <LoadingOverlay visible={loading} />
          <ScrollArea sx={{ height: 300 }}
                      onScrollPositionChange={({ y }) => setScrolled(y !== 0)}>
            <pre>
              <code>
                <ul style={{ marginTop: 5 }}>
                  {logs.map((log, idx) => (
                    <li key={idx}>{log}</li>
                  ))}
                </ul>
              </code>
            </pre>
          </ScrollArea>
        </div>
      </Modal>
      <div>
        <Button onClick={onClose}>Close</Button>
      </div>
    </>
  );
};

export default JobLogsModal;
