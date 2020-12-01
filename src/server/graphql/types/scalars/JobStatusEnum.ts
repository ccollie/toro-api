import { JobStatusEnum } from '../../../../types';
import { GraphQLEnumType } from 'graphql';

export const JobStatusEnumType = new GraphQLEnumType({
  name: 'JobStatus',
  values: {
    [JobStatusEnum.COMPLETED]: { value: JobStatusEnum.COMPLETED },
    [JobStatusEnum.WAITING]: { value: JobStatusEnum.WAITING },
    [JobStatusEnum.ACTIVE]: { value: JobStatusEnum.ACTIVE },
    [JobStatusEnum.DELAYED]: { value: JobStatusEnum.DELAYED },
    [JobStatusEnum.FAILED]: { value: JobStatusEnum.FAILED },
    // eslint-disable-next-line max-len
    [JobStatusEnum.PAUSED]: { value: JobStatusEnum.PAUSED }, //TODO: в bull написано что устарело, теперь все WAITING
  },
});
