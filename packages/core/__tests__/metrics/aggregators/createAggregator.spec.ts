import { createAggregator } from '@src/../../../../packages/core/src/metrics';
import { systemClock } from '@src/../../../../packages/core/src/lib';
import { AggregatorTypes } from '@src/../../../../packages/core/types';

describe('createAggregator', () => {
  it('can create an aggregator', () => {
    const aggregator = createAggregator(AggregatorTypes.Sum, systemClock);
    expect(aggregator).toBeDefined();
  });
});
