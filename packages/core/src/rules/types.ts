export enum RuleState {
  NORMAL = 'NORMAL',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  MUTED = 'MUTED',
}

export enum Severity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export enum ErrorStatus {
  NONE = 'NONE',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

export type RuleMetric = {
  readonly type: string;
  options: Record<string, any>;
  [propName: string]: any;
};

export enum RuleEventsEnum {
  ALERT_TRIGGERED = 'alert.triggered',
  ALERT_RESET = 'alert.reset',
  ALERT_DELETED = 'alert.deleted',
  ALERT_UPDATED = 'alert.updated',
  RULE_ADDED = 'rule.added',
  RULE_DELETED = 'rule.deleted',
  RULE_UPDATED = 'rule.updated',
  RULE_ALERTS_CLEARED = 'rule.alerts-cleared',
  RULE_ACTIVATED = 'rule.activated',
  RULE_DEACTIVATED = 'rule.deactivated',
  RULE_TRIGGERED = 'rule.triggered',
  RULE_RESET = 'rule.reset',
  STATE_CHANGED = 'rule.state-changed',
}
