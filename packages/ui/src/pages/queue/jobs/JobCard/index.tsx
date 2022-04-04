import { Paper, Checkbox, Group } from '@mantine/core';
import React, { ChangeEvent, useCallback, useEffect, useState } from 'react';
import CircularProgress from 'src/components/CircularProgress';
import { isJobFailed } from 'src/lib';
import { Details } from './Details/Details';
import JobActions from '../JobActions';
import { Timeline } from './Timeline/Timeline';
import type { Job, Queue, JobFragment, JobState } from '@/types';

import s from './JobCard.module.css';

const greenStatuses: JobState[] = ['active', 'completed'];

interface JobCardProps {
  job: Job | JobFragment;
  queue: Queue;
  isReadOnly?: boolean;
  status: JobState;
  onClick?: (job: Job | JobFragment) => void;
  isSelected?: boolean;
  toggleSelected?: (id: string) => void;
  removeSelected?: (id: string) => void;
}

export const JobCard = (props: JobCardProps) =>
{
  const { job, queue, status, isSelected } = props;
  const isFailed = isJobFailed(job);

  const [progressColor, setProgressColor] = useState<string>('teal');
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    const color = isFailed && !greenStatuses.includes(status) ? '#F56565' : 'teal';
    setProgressColor(color);
  }, [status]);

  const handleChange = useCallback((evt: ChangeEvent<HTMLInputElement>) => {
    const checked = evt.currentTarget.checked;
    const id = job.id;
    props.toggleSelected?.(id);
  }, [job.id]);

  useEffect(() => {
    let progress = job.progress;
    if (typeof progress === 'number') {
      progress = Math.round(progress);
      if (progress > 100) {
        progress = 100;
      }
      setProgress(progress);
    }
  }, [job.progress]);

  return (
  <Paper
    p="md"
    shadow="md"
    mb={10}
    withBorder={isSelected}
    style={{
      minHeight: '320px',
      maxHeight: '370px',
      display: 'flex'
    }}>
    <div className={s.sideInfo}>
      <span title={`#${job.id}`}>#{job.id}</span>
      <Timeline job={job} status={status} />
    </div>
    <div className={s.contentWrapper}>
      <div className={s.title}>
        <h4>
          {job.name}
          {job.attemptsMade > 0 && <span>attempt #{job.attemptsMade + 1}</span>}
          {!!job.opts?.repeat?.count && (
            <span>
              repeat {job.opts?.repeat?.count}
              {!!job.opts?.repeat?.limit && ` / ${job.opts?.repeat?.limit}`}
            </span>
          )}
        </h4>
        <Group>
          <Checkbox size="md" checked={isSelected} onChange={handleChange}/>
          <JobActions status={status} queueId={queue.id} job={job} />
        </Group>
      </div>
      <div className={s.content}>
        <Details status={status} job={job} />
        {typeof job.progress === 'number' && (
          <CircularProgress
            percentage={progress}
            color={progressColor}
            className={s.progress}
          />
        )}
      </div>
    </div>
  </Paper>
);};

export default JobCard;
