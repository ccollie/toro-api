import { RuleType } from '../../../../types';
import { GraphQLEnumType } from 'graphql';

export const RuleTypeEnum = new GraphQLEnumType({
  name: 'RuleType',
  values: {
    CHANGE: { value: RuleType.CHANGE },
    PEAK: { value: RuleType.PEAK },
    THRESHOLD: { value: RuleType.THRESHOLD },
  },
});
