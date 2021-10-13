import {AggregatorTypes, createAggregator} from '../../../src/metrics';
import { systemClock } from '../../../src/lib';

describe('createAggregator', () => {
  it('can create an aggregator', () => {
    const aggregator = createAggregator(AggregatorTypes.Sum, systemClock);
    expect(aggregator).toBeDefined();
  });
});
