import { StatsGranularity } from '../../../../types';
import { GraphQLEnumType } from 'graphql';

export const StatsGranularityEnum = new GraphQLEnumType({
  name: 'StatsGranularity',
  values: {
    [StatsGranularity.Day]: { value: StatsGranularity.Day },
    [StatsGranularity.Hour]: { value: StatsGranularity.Hour },
    [StatsGranularity.Minute]: { value: StatsGranularity.Minute },
    [StatsGranularity.Month]: { value: StatsGranularity.Month },
    [StatsGranularity.Week]: { value: StatsGranularity.Week },
  },
});
