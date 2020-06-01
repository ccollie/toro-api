import { schemaComposer } from 'graphql-compose';

export const RuleAlertOptionsTC = schemaComposer.createObjectTC({
  name: 'RuleAlertOptions',
  description: 'Options for raising alerts for a Rule',
  fields: {
    warmupWindow: {
      type: 'Duration',
      description:
        'a timeout after startup (in ms) during which no alerts are raised, irrespective of ' +
        'the truthiness of the rule condition.',
    },
    minViolations: {
      type: 'Int',
      description:
        'The minimum number of violations before an alert can be raised',
    },
    maxAlertsPerEvent: {
      type: 'Int',
      description:
        'The max number of alerts to receive per event trigger in case the condition is met.\n ' +
        'In this case the "event" is a single period between the rule VIOLATION and RESET states.',
    },
    triggerWindow: {
      type: 'Duration',
      description:
        'Duration (ms) for which a metric is anomalous before triggering a violation.\n' +
        'After a rule violation is encountered, no alerts are dispatched until this period ' +
        'has passed. This is useful for events which are normally transient by may periodically ' +
        'persist longer than usual, or for not sending notifications out too quickly.',
    },
    recoveryWindow: {
      type: 'Duration',
      description:
        'How long an anomalous metric must be normal before resetting an alert\'s states ' +
        'to NORMAL. In conjunction with "alertOnReset", this can be used to prevent ' +
        'a possible storm of notifications when a rule condition passes and fails in ' +
        'rapid succession ("flapping")',
    },
    renotifyInterval: {
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
