import { NotificationContext } from '../../../types';
import { getMessage } from '../messages';
import { createNotificationContext } from '../../__tests__/helpers';
import { random } from '@alpen/shared';
import ms from 'ms';
import { nanoid } from 'nanoid';
import {
  ErrorStatus,
  RuleAlert,
  RuleEventsEnum,
  RuleOperator,
  RuleType,
  Severity,
} from '../../../types';


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
      return {
        isRead: false,
        ruleId: nanoid(),
        raisedAt: 0,
        status: 'open',
        value: 0,
        id: nanoid(),
        errorLevel: ErrorStatus.WARNING,
        failures: random(1, 5), // violations
        state: {
          ruleType: RuleType.THRESHOLD,
          errorThreshold: 100,
          errorLevel: ErrorStatus.ERROR,
          value: 110,
          comparator: RuleOperator.GT,
          unit: 'jobs/sec',
        },
        severity: Severity.WARNING,
      };
    }

    // todo: fails if queue not given for rule events
    // fails if host not given .....
    // it converts markdown
    it('can make a POST client', async () => {
      const markdown = `
  - *event*: _{{event}}_
  - *threshold:* _{{threshold}}_
  - *severity:* _{{severity}}_
`;

      const alert = createRuleAlert(RuleEventsEnum.ALERT_TRIGGERED);
      alert.message = markdown;

      const msg = getMessage(context, RuleEventsEnum.ALERT_TRIGGERED, alert);
      expect(msg).toBeDefined();
    });
  });
});
