import { createAggregator } from '../../../../src/server/metrics';
import { systemClock } from '../../../../src/server/lib';
import { AggregatorTypes } from '../../../../src/types';

describe('createAggregator', () => {
  it('can create an aggregator', () => {
    const aggregator = createAggregator(AggregatorTypes.Sum, systemClock);
    expect(aggregator).toBeDefined();
  });
});
