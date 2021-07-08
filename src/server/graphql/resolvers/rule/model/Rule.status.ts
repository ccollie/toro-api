import { createEnumFromTS, getQueueManager } from '../../../helpers';
import { FieldConfig } from '../../utils';
import { schemaComposer } from 'graphql-compose';
import { Rule } from '@server/rules';
import {
  RuleCircuitState,
  RuleState,
  RuleStatus,
} from '@server/graphql/typings';
import { CircuitState } from '@server/commands';
import { RuleStateEnum } from '@server/graphql/scalars';

const RuleCircuitStateTC = createEnumFromTS(CircuitState, 'RuleCircuitState');

const RuleStatusTC = schemaComposer.createObjectTC({
  name: 'RuleStatus',
  description: 'Real time status of a Rule',
  fields: {
    circuitState: {
      type: RuleCircuitStateTC,
      description: 'Circuit breaker state.',
    },
    state: {
      type: RuleStateEnum,
      description: 'The rule state.',
    },
    failures: {
      type: 'Int!',
      description:
        'The number of failures for the current event (from trigger to close)',
    },
    totalFailures: {
      type: 'Int!',
      description: 'The total number of failures in the lifetime of the rule',
    },
    successes: {
      type: 'Int!',
      description:
        'The number of successful rule invocations after an alert has triggered.',
    },
    alertCount: {
      type: 'Int!',
      description:
        'The number of alerts raised for the current failure event (between trigger and close)',
    },
    lastFailure: {
      type: 'Date',
      description: 'The last time the rule triggered',
    },
    lastNotification: {
      type: 'Date',
      description: 'The last time a notification was sent',
    },
  },
});

export const ruleStatus: FieldConfig = {
  type: RuleStatusTC.NonNull,
  args: {},
  async resolve(parent: Rule): Promise<RuleStatus> {
    const manager = getQueueManager(parent.queueId);
    const ruleManager = manager.ruleManager;
    const val = await ruleManager.getRuleStatus(parent);
    let state: RuleCircuitState;
    switch (val.state) {
      case CircuitState.CLOSED:
        state = RuleCircuitState.Closed;
        break;
      case CircuitState.HALF_OPEN:
        state = RuleCircuitState.HalfOpen;
        break;
      case CircuitState.OPEN:
        state = RuleCircuitState.Open;
        break;
    }
    return {
      circuitState: state,
      state: val.state as any as RuleState,
      failures: val.failures,
      totalFailures: val.totalFailures,
      successes: val.successes,
      alertCount: val.alertCount,
      lastFailure: new Date(val.lastFailure),
      lastNotification: new Date(val.lastNotify),
    };
  },
};
