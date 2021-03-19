import { RuleState } from '../../../../types';
import { GraphQLEnumType } from 'graphql';

export const RuleStateType = new GraphQLEnumType({
  name: 'RuleState',
  values: {
    WARNING: { value: RuleState.WARNING },
    NORMAL: { value: RuleState.NORMAL },
    ERROR: { value: RuleState.ERROR },
    MUTED: { value: RuleState.MUTED },
  },
});
