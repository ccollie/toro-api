import { ErrorLevel } from '../../../../types';
import { GraphQLEnumType } from 'graphql';

export const ErrorLevelEnum = new GraphQLEnumType({
  name: 'ErrorLevel',
  values: {
    CRITICAL: { value: ErrorLevel.CRITICAL },
    WARNING: { value: ErrorLevel.WARNING },
    NONE: { value: ErrorLevel.NONE },
  },
});
