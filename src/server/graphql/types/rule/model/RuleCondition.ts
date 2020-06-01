import { schemaComposer } from 'graphql-compose';
import {
  ChangeAggregationEnumType,
  Duration,
  PeakSignalDirectionType,
  RuleOperatorType,
} from '../../scalars';

const BaseFields = {
  errorThreshold: {
    type: 'Float!',
    description: 'The value needed to trigger an error notification',
  },
  warningThreshold: {
    type: 'Float',
    description: 'The value needed to trigger an warning notification',
  },
};

export const RuleConditionTC = schemaComposer.createInterfaceTC({
  name: 'RuleCondition',
  description: 'Describes a queue condition were monitoring.',
  fields: BaseFields,
});

export const ThresholdConditionTC = schemaComposer.createObjectTC({
  name: 'ThresholdCondition',
  description: 'A condition based on a simple threshold condition',
  interfaces: [RuleConditionTC],
  fields: {
    ...BaseFields,
    operator: {
      type: RuleOperatorType,
      makeRequired: true,
      description: 'The comparison operator',
    },
  },
});

export const ThresholdConditionInputITC = ThresholdConditionTC.getITC().setTypeName(
  'ThresholdConditionInput',
);

export const ChangeConditionTC = ThresholdConditionTC.clone(
  'ChangeCondition',
).addFields({
  ...BaseFields,
  timeWindow: {
    type: Duration,
    makeRequired: true,
    description: 'The sliding window for metric measurement',
  },
  timeShift: {
    type: Duration,
    makeRequired: true,
    description:
      'Lookback period (ms). How far back are we going to compare ' +
      'eg 1 hour means we\'re comparing now vs 1 hour ago',
  },
  changeType: {
    type: 'enum ChangeType { VALUE PCT }',
    makeRequired: true,
  },
  aggregationType: {
    type: ChangeAggregationEnumType,
    makeRequired: true,
  },
});

export const ChangeConditionInputTC = ChangeConditionTC.getITC().setTypeName(
  'ChangeConditionInput',
);

export const PeakConditionTC = schemaComposer.createObjectTC({
  name: 'PeakCondition',
  description: 'A condition based on a deviations from a rolling average',
  interfaces: [RuleConditionTC],
  fields: {
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
      type: PeakSignalDirectionType,
      makeRequired: true,
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
  },
});

export const PeakConditionInputITC = PeakConditionTC.getITC().setTypeName(
  'PeakConditionInput',
);

RuleConditionTC.addTypeResolver(
  ChangeConditionTC,
  (value) => !!value.timeWindow && value.aggregationType,
);

RuleConditionTC.addTypeResolver(PeakConditionTC, (value) => !!value.direction);

RuleConditionTC.setTypeResolverFallback(ThresholdConditionTC);
