import EmptyStates from '@/components/EmptyStates/EmptyStates';
import React from 'react';
import { DbExclamationIcon } from '@/components/Icons';
import { JobSearchStatus } from '@/types';

export const NoJobsData = ( { status } : { status?: JobSearchStatus }) => {
  const title = `No${(status ? status : '') + ' '}jobs found`;
  return (
    <EmptyStates title={title} customIcon={<DbExclamationIcon size={48}/>}/>
  );
};
