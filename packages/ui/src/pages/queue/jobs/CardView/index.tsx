import React from 'react';
import { JobCard } from '../JobCard';
import type { JobFragment, JobState, Queue } from 'src/types';
import { useQueue } from '@/hooks';

interface CardViewProps {
  queueId: Queue['id'];
  jobs: JobFragment[];
  status: JobState;
  isReadOnly: boolean;
  onClick?: (job: JobFragment) => void;
  isSelected: (id: string) => boolean;
  toggleSelected: (id: string) => void;
  removeSelected: (id: string) => void;
}

export const CardView = (props: CardViewProps) => {
  const { status, jobs, queueId, isSelected, toggleSelected, removeSelected} = props;

  const { queue } = useQueue(queueId);
  return (
    <section>
      {jobs.map((job) => (
        <JobCard
          key={job.id}
          job={job}
          status={status}
          isSelected={isSelected(job.id)}
          toggleSelected={toggleSelected}
          removeSelected={removeSelected}
          queue={queue}/>
      ))}
    </section>
  );
};

export default CardView;
