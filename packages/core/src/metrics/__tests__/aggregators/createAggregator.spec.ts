import { createAggregator} from '../../../metrics';
import { systemClock } from '../../../lib';
import { AggregatorTypes } from '../../types';

describe('createAggregator', () => {
  it('can create an aggregator', () => {
    const aggregator = createAggregator(AggregatorTypes.Sum, systemClock);
    expect(aggregator).toBeDefined();
  });
});
