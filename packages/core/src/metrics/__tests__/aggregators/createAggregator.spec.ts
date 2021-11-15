import {AggregatorTypes, createAggregator} from '../../../metrics';
import { systemClock } from '../../../lib';

describe('createAggregator', () => {
  it('can create an aggregator', () => {
    const aggregator = createAggregator(AggregatorTypes.Sum, systemClock);
    expect(aggregator).toBeDefined();
  });
});
