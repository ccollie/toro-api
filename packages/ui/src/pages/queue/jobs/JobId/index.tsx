import { Tooltip } from '@mantine/core';
import React from 'react';

interface JobIdProps {
  id?: string;
  maxLen?: number;
}

export const JobId = ({ id, maxLen = 10 }: JobIdProps) => {
  const _id = id || '';
  const displayShortId = id && String(id).length > maxLen;
  if (displayShortId) {
    const shortId = _id.substring(0, maxLen) + '...';
    return (
      <Tooltip withArrow label={_id} aria-label={`job id ${_id}`}>
        <span>#{shortId}</span>
      </Tooltip>
    );
  }
  if (id) {
    return <span>#{id}</span>;
  }
  return null;
};

export default JobId;
