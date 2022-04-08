import React from 'react';
import { useJobsStore } from 'src/stores';
import shallow from 'zustand/shallow';
import { JobCard } from '../JobCard';
import type { JobFragment, JobSearchStatus, Queue } from 'src/types';

interface CardViewProps {
  queue: Queue;
  jobs: JobFragment[];
  status: JobSearchStatus;
  isReadOnly: boolean;
  onClick?: (job: JobFragment) => void;
}

export const CardView = (props: CardViewProps) => {
  const { status, jobs, queue } = props;

  const [
    selected,
    removeSelected,
    toggleSelected,
  ] = useJobsStore(
    (state) => [
      state.selected,
      state.unselectJob,
      state.toggleSelectJob
    ],
    shallow
  );

  function isSelected(job: JobFragment) {
    return selected.has(job.id);
  }

  return (
    <section>
      {jobs.map((job) => (
        <JobCard
          key={job.id}
          job={job}
          status={status}
          isSelected={isSelected(job)}
          toggleSelected={toggleSelected}
          removeSelected={removeSelected}
          queue={queue}/>
      ))}
    </section>
  );
};

export default CardView;
