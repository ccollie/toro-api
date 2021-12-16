import { schemaComposer } from 'graphql-compose';

export const RuleAlertOptionsTC = schemaComposer.createObjectTC({
  name: 'RuleAlertOptions',
  description: 'Options for raising alerts for a Rule',
  fields: {
    triggerDelay: {
      type: 'Duration',
      // eslint-disable-next-line max-len
      description: 'Wait a certain duration between first encountering a failure and triggering an alert'
    },
    failureThreshold: {
      type: 'Int',
      description:
        'The minimum number of violations before an alert can be raised',
    },
    successThreshold: {
      type: 'Int',
      description:
        // eslint-disable-next-line max-len
        'Optional number of consecutive successful method executions to close then alert. Default 1',
    },
    maxAlertsPerEvent: {
      type: 'Int',
      description:
        'The max number of alerts to receive per event trigger in case the condition is met.\n ' +
        'In this case the "event" is a single period between the rule VIOLATION and RESET states.',
    },
    recoveryWindow: {
      type: 'Duration',
      description:
        'How long an triggered rule must be without failures before resetting it ' +
        'to NORMAL. In conjunction with "alertOnReset", this can be used to prevent ' +
        'a possible storm of notifications when a rule condition passes and fails in ' +
        'rapid succession ("flapping")',
    },
    notifyInterval: {
      type: 'Duration',
      description:
        'If specified, the minimum time between alerts for the same incident',
    },
    alertOnReset: {
      type: 'Boolean',
      description:
        'Raise an alert after an event trigger when the situation returns to normal',
    },
  },
});

export const RuleAlertOptionsInputTC = RuleAlertOptionsTC.getITC().setTypeName(
  'RuleAlertOptionsInput',
);
