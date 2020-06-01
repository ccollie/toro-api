import { PeakSignalDirection } from '../../../../types';
import { GraphQLEnumType } from 'graphql';

export const PeakSignalDirectionType = new GraphQLEnumType({
  name: 'PeakSignalDirection',
  values: {
    ABOVE: { value: PeakSignalDirection.ABOVE },
    BELOW: { value: PeakSignalDirection.BELOW },
    BOTH: { value: PeakSignalDirection.BOTH },
  },
});
