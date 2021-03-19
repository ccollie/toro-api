import { createAggregator } from '../../../../src/server/metrics';
import { systemClock } from '../../../../src/server/lib';

describe('createAggregator', () => {
  it('can create an aggregator', () => {
    const aggregator = createAggregator('max', systemClock);
    expect(aggregator).toBeDefined();
  });
});
