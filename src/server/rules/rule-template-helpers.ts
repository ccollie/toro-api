import { ErrorLevel, RuleEventsEnum } from '../../types';

export function createRuleTemplateHelpers(
  event: RuleEventsEnum,
  data: Record<string, any>,
): Record<string, any> {
  const level = (data['errorLevel'] ?? ErrorLevel.NONE) as ErrorLevel;

  const isAlert = (options) => {
    if (event === RuleEventsEnum.ALERT_TRIGGERED) {
      return options.fn(this);
    } else {
      return options.inverse(this);
    }
  };

  const isRecovery = (options) => {
    if (event === RuleEventsEnum.ALERT_RESET) {
      return options.fn(this);
    } else {
      return options.inverse(this);
    }
  };

  const isWarning = (options) => {
    if (level === ErrorLevel.WARNING) {
      return options.fn(this);
    } else {
      return options.inverse(this);
    }
  };

  return {
    // eslint-disable-next-line camelcase
    is_alert: isAlert,
    // eslint-disable-next-line camelcase
    is_recovery: isRecovery,
    // eslint-disable-next-line camelcase
    is_warning: isWarning,
  };
}
