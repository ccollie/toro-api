import React from 'react';
import { useMatch } from 'react-location';
import { LocationGenerics } from 'src/types';
import MetricList from 'src/pages/queue/metrics/List/metric-list';

export const Metrics = () => {
  const {
    params: { queueId },
  } = useMatch<LocationGenerics>();

  return (
    <div>
      <MetricList queueId={queueId} />
    </div>
  );
};

export default Metrics;
