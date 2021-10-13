import { JobStatusEnum } from '@alpen/core/queues';
import { GraphQLEnumType } from 'graphql';

export const JobStatusEnumType = new GraphQLEnumType({
  name: 'JobStatus',
  values: {
    COMPLETED: { value: JobStatusEnum.COMPLETED },
    WAITING: { value: JobStatusEnum.WAITING },
    ACTIVE: { value: JobStatusEnum.ACTIVE },
    DELAYED: { value: JobStatusEnum.DELAYED },
    FAILED: { value: JobStatusEnum.FAILED },
    // eslint-disable-next-line max-len
    PAUSED: { value: JobStatusEnum.PAUSED }, //TODO: в bull написано что устарело, теперь все WAITING
    WAITING_CHILDREN: { value: JobStatusEnum.WAITING_CHILDREN },
    UNKNOWN: { value: JobStatusEnum.UNKNOWN },
  },
});
