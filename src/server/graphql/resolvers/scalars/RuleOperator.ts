import { RuleOperator } from '../../../../types';
import { GraphQLEnumType } from 'graphql';

export const RuleOperatorType = new GraphQLEnumType({
  name: 'RuleOperator',
  values: {
    GT: { value: RuleOperator.gt },
    GTE: { value: RuleOperator.gte },
    LT: { value: RuleOperator.lt },
    LTE: { value: RuleOperator.lte },
    EQ: { value: RuleOperator.eq },
    NE: { value: RuleOperator.ne },
  },
});
