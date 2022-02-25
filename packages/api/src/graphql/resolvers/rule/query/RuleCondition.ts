import { schemaComposer } from 'graphql-compose';
import {
  ChangeAggregationEnum,
  ConditionChangeEnum,
  Duration,
  PeakSignalDirectionEnum,
  RuleOperatorEnum,
  RuleTypeEnum,
} from '../../../scalars';
import { has } from '@alpen/shared';

const BaseFields = {
  errorThreshold: {
    type: 'Float!',
    description: 'The value needed to trigger an error notification',
  },
  warningThreshold: {
    type: 'Float',
    description: 'The value needed to trigger an warning notification',
  },
  operator: {
    type: RuleOperatorEnum.NonNull,
    makeRequired: true,
    description: 'The comparison operator',
  },
};

export const RuleConditionInterfaceTC = schemaComposer.createInterfaceTC({
  name: 'RuleConditionInterface',
  description: 'Describes a queue condition were monitoring.',
  fields: BaseFields,
});

export const ThresholdConditionTC = schemaComposer
  .createObjectTC({
    name: 'ThresholdCondition',
    description: 'A condition based on a simple threshold condition',
    interfaces: [RuleConditionInterfaceTC],
    fields: {
      ...BaseFields,
    },
  })
  .makeFieldNonNull('operator');

export const ThresholdConditionInputITC =
  ThresholdConditionTC.getITC().setTypeName('ThresholdConditionInput');

export const ChangeConditionTC = ThresholdConditionTC.clone('ChangeCondition')
  .addFields({
    ...BaseFields,
    windowSize: {
      type: Duration,
      description: 'The sliding window for metric measurement',
    },
    timeShift: {
      type: Duration,
      description:
        'Lookback period (ms). How far back are we going to compare ' +
        "eg 1 hour means we're comparing now vs 1 hour ago",
    },
    changeType: {
      type: ConditionChangeEnum,
    },
    aggregationType: {
      type: ChangeAggregationEnum,
    },
  })
  .makeFieldNonNull([
    'operator',
    'windowSize',
    'changeType',
    'timeShift',
    'aggregationType',
  ]);

export const ChangeConditionInputTC = ChangeConditionTC.getITC().setTypeName(
  'ChangeConditionInput',
);

export const PeakConditionTC = ThresholdConditionTC.clone('PeakCondition')
  .setDescription('A condition based on deviations from a rolling average')
  .addFields({
    errorThreshold: {
      type: 'Float!',
      description:
        'Standard deviations at which to trigger an error notification.',
    },
    warningThreshold: {
      type: 'Float',
      description:
        'Standard deviations at which to trigger an warning notification.',
    },
    direction: {
      type: PeakSignalDirectionEnum,
      description:
        'Signal if peak is above the threshold, below the threshold or either',
    },
    influence: {
      type: 'Float',
      description:
        'the influence (between 0 and 1) of new signals on the mean and standard deviation ' +
        'where 1 is normal influence, 0.5 is half',
    },
    lag: {
      type: Duration,
      description:
        'The lag of the moving window (in milliseconds). ' +
        ' For example, a lag of 5000 will use the last 5 seconds of observations' +
        'to smooth the data.',
    },
  })
  .makeFieldNonNull('direction');

export const PeakConditionInputITC =
  PeakConditionTC.getITC().setTypeName('PeakConditionInput');

// Resolvers
export const thresholdConditionPredicate = (value) =>
  has(value, 'operator') && has(value, 'errorThreshold');
export const peakConditionPredicate = (value) =>
  thresholdConditionPredicate(value) && has(value, 'direction');
export const changeConditionPredicate = (value) =>
  thresholdConditionPredicate(value) &&
  has(value, 'timeShift') &&
  has(value, 'changeType');

RuleConditionInterfaceTC.addTypeResolver(
  ChangeConditionTC,
  changeConditionPredicate,
);

RuleConditionInterfaceTC.addTypeResolver(
  PeakConditionTC,
  peakConditionPredicate,
);

RuleConditionInterfaceTC.addTypeResolver(
  ThresholdConditionTC,
  thresholdConditionPredicate,
);

RuleConditionInterfaceTC.setTypeResolverFallback(ThresholdConditionTC);

export const RuleConditionUnionTC = schemaComposer
  .createUnionTC({
    name: 'RuleCondition',
    types: [ThresholdConditionTC, PeakConditionTC, ChangeConditionTC],
  })
  .addTypeResolver(ChangeConditionTC, changeConditionPredicate)
  .addTypeResolver(PeakConditionTC, peakConditionPredicate)
  .addTypeResolver(ThresholdConditionTC, thresholdConditionPredicate);

export const RuleConditionInputTC = schemaComposer
  .createInputTC({
    name: 'RuleConditionInput',
    fields: {
      type: {
        type: RuleTypeEnum,
      },
      changeCondition: ChangeConditionInputTC,
      peakCondition: PeakConditionInputITC,
      thresholdCondition: ThresholdConditionInputITC,
    },
  })
  .makeFieldNonNull('type');
