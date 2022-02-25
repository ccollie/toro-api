import { ErrorStatus, Rule, CircuitState } from '@alpen/core';
import { schemaComposer } from 'graphql-compose';
import { EZContext } from 'graphql-ez';
import { createEnumFromTS, RuleStateEnum } from '../../../scalars';
import { RuleCircuitState, RuleState, RuleStatus } from '../../../typings';
import { FieldConfig } from '../../utils';

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

export const status: FieldConfig = {
  type: RuleStatusTC.NonNull,
  args: {},
  async resolve(
    parent: Rule,
    _: unknown,
    { accessors }: EZContext,
  ): Promise<RuleStatus> {
    const manager = accessors.getQueueManager(parent.queueId);
    const ruleManager = manager.ruleManager;
    const val = await ruleManager.getRuleStatus(parent);
    let state: RuleCircuitState;
    switch (val.circuitState) {
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
    let status: RuleState;
    if (!parent.isActive) {
      status = RuleState.Muted;
    } else if (val.circuitState === CircuitState.CLOSED) {
      status = RuleState.Normal;
    } else if (val.errorStatus === ErrorStatus.ERROR) {
      status = RuleState.Error;
    } else if (val.errorStatus === ErrorStatus.WARNING) {
      status = RuleState.Warning;
    } else {
      status = RuleState.Normal;
    }
    return {
      circuitState: state,
      state: status,
      failures: val.failures,
      totalFailures: val.totalFailures,
      successes: val.successes,
      alertCount: val.alertCount,
      lastFailure: new Date(val.lastFailure),
      lastNotification: new Date(val.lastNotify),
    };
  },
};
