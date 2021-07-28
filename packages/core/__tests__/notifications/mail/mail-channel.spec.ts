import type { MailChannelConfig } from '../../../src/notifications';
import { MailChannel } from '../../../src/notifications';
import { createNotificationContext } from '../helpers';
import { nanoid } from 'nanoid';
import * as mailer from '../../../src/lib/mail';
import { registerHelpers } from '../../../src/lib/hbs';

describe('MailChannel', () => {
  registerHelpers();

  const sendMailSpy = jest.spyOn(mailer, 'sendMail');

  describe('constructor', () => {
    it('can construct an instance', () => {
      const cfg: MailChannelConfig = {
        type: 'mail',
        name: 'channel',
        recipients: ['test@gmail.com'],
      };
      const instance = new MailChannel(cfg);
      expect(instance).toBeDefined();
    });
  });

  describe('.fetch', () => {
    function createChannel(opts?: Partial<MailChannelConfig>): MailChannel {
      let config: MailChannelConfig = {
        id: 'hook-' + nanoid(),
        name: 'names-' + nanoid(),
        type: 'mail',
        recipients: ['test@gmail.com'],
      };
      if (opts) {
        config = Object.assign(config, opts);
      }
      return new MailChannel(config);
    }

    interface DispatchResult {
      instance: MailChannel;
      received: Record<string, any>;
    }
    async function dispatch(
      data: Record<string, any>,
      config?: Partial<MailChannelConfig>,
      event = 'test',
    ): Promise<DispatchResult> {
      const instance = createChannel(config);
      const context = createNotificationContext();

      await instance.dispatch(context, data, event);

      const call = sendMailSpy.mock.calls[0];
      sendMailSpy.mockClear();
      const [message] = call;

      return { instance, received: message };
    }

    it('can fetch an email', async () => {
      const message = {
        str: 'string',
        num: 10,
        bool: true,
        fl: 10.29,
      };

      const opts = {
        recipients: ['test@dev.co'],
      };

      const { received } = await dispatch(message, opts);

      expect(received).toBeDefined();
      expect(received.html).toBeDefined();
      expect(received.subject).toBeDefined();
      expect(received.to).toStrictEqual(opts.recipients);
    });

    const DELIMITER = '@@@';

    function extractContent(content: string) {
      const rx = /@@@\s*(.*)@@@/g;
      const arr = rx.exec(content);
      return arr[1];
    }

    it('renders a message if given', async () => {
      const id = nanoid();
      const underlined = nanoid();
      const msgText = `# Test: **${id}** is _${underlined}_ for your delight`;
      const markdown = `${DELIMITER} ${msgText} ${DELIMITER}`;
      const message = {
        bool: true,
        fl: 10.29,
        message: markdown,
      };

      const opts = {
        recipients: ['test@dev.co'],
      };

      const { received } = await dispatch(message, opts);
      const temp = extractContent(received.html);

      expect(temp).toBeDefined();
      expect(temp.includes(`<strong>${id}</strong>`)).toBe(true);
      expect(temp.includes(`<em>${underlined}</em>`)).toBe(true);
    });

    it('renders data property as a props table', async () => {
      const data = {
        bool: true,
        fl: 10.29,
        threshold: 100,
        value: 201,
        name: 'mary berry',
        meta: {
          start: Date.now(),
          state: {},
          severity: undefined,
          violations: 0,
        },
      };

      const msg = {
        message: 'look at me now',
        data,
      };

      const { received } = await dispatch(msg, {
        recipients: ['resident@whitehouse.gov'],
      });

      const temp = received.html;

      expect(temp).toBeDefined();
    });
  });
});
