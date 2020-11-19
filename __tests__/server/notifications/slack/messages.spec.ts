import {
  NotificationContext,
  ErrorLevel,
  RuleAlert,
  RuleEventsEnum,
  Severity
} from '../../../../src/types';
import { getMessage } from '../../../../src/server/notifications/slack/messages';
import { createNotificationContext } from '../helpers';
import { random } from 'lodash';
import ms from 'ms';
import nanoid = require('nanoid');

const ONE_HOUR = ms('1 hour');
const ONE_MINUTE = ms('1 minute');

process.env.QUEUE_URI_TEMPLATE = 'http://localhost:8080/queues/{{queue.id}}';
process.env.HOST_URI_TEMPLATE = 'http://localhost:8080/hosts/{{host.id}}';

describe('messages', () => {

  describe('getMessage', () => {
    let context: NotificationContext;

    beforeEach(async () => {
      context = createNotificationContext();
    });

    function createRuleAlert(event: RuleEventsEnum): RuleAlert {
      const start = (+new Date() - random(15 * ONE_MINUTE, ONE_HOUR));
      const end = start + random(ONE_MINUTE, 30 * ONE_MINUTE);
      const context: RuleAlert = {
        id: nanoid(),
        event,
        errorLevel: ErrorLevel.WARNING,
        start,
        end,
        threshold: random(10, 100),
        value: random(10, 100),
        violations: random(1, 5), // violations
        alerts: random(1, 5),
        state: { },
        severity: Severity.WARNING
      };
      if (event === RuleEventsEnum.ALERT_RESET) {
        context.resetValue = random(10, 100);
      }
      return context;
    }

    // todo: fails if queue not given for rule events
    // fails if host not given .....
    // it converts markdown
    it('can make a POST client', async () => {

      const markdown = `
  - *event*: _{{event}}_
  - *threshold:* _{{threshold}}_
  - *severity:* _{{severity}}_
`

      const alert = createRuleAlert(RuleEventsEnum.ALERT_TRIGGERED);
      alert.message = markdown;

      const msg = getMessage(context, RuleEventsEnum.ALERT_TRIGGERED, alert);
      expect(msg).toBeDefined();
    });
  });

});
