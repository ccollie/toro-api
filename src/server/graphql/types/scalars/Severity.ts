import { Severity } from '../../../../types';
import { GraphQLEnumType } from 'graphql';

export const SeverityType = new GraphQLEnumType({
  name: 'Severity',
  values: {
    WARNING: { value: Severity.WARNING },
    CRITICAL: { value: Severity.CRITICAL },
    ERROR: { value: Severity.ERROR },
    INFO: { value: Severity.INFO },
  },
});
