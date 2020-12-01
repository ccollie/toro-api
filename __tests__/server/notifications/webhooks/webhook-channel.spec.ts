import { WebhookChannelConfig } from '../../../../src/types';
import { WebhookChannel } from '../../../../src/server/notifications';
import createTestServer from 'create-test-server';
import { createNotificationContext } from '../helpers';
import nanoid from 'nanoid';
import { registerHelpers } from '../../../../src/server/lib/hbs';

describe('WebhookChannel', () => {
  const URL = 'http://localhost:4000/hooks/rule-alerts';

  registerHelpers();

  describe('constructor', () => {
    it('can construct an instance', () => {
      let config: WebhookChannelConfig = {
        id: 'hook1',
        name: 'hook1',
        timeout: 400,
        type: 'webhook',
        url: URL,
        method: 'GET',
        responseType: 'json'
      };

      const instance = new WebhookChannel(config);
      expect(instance).toBeDefined();
    });
  });

  describe('.fetch', () => {
    function createChannel(url: string, opts?: Partial<WebhookChannelConfig>): WebhookChannel {
      let config: WebhookChannelConfig = {
        id: 'hook-' + nanoid(),
        name: 'names-' + nanoid(),
        timeout: 1400,
        type: 'webhook',
        url,
        method: 'POST',
        responseType: 'json',
      };
      if (opts) {
        config = Object.assign(config, opts);
      }
      return new WebhookChannel(config);
    }

    interface DispatchResult {
      instance: WebhookChannel,
      received: Record<string, any>
    }
    async function dispatch(
      message: Record<string, any>,
      config: Partial<WebhookChannelConfig>
    ): Promise<DispatchResult> {
      const server = await createTestServer();
      const url = `${server.url}/webhook`;

      const instance = createChannel(url, config);
      const context = createNotificationContext();
      const isPost = config.method.toUpperCase() === 'POST';

      const received = await new Promise(async (resolve, reject) => {
        const requestHandler = (req, res) => {
          const source = isPost ? req.body : req.query;
          const result = {
            ...(source || {})
          }
          res.status(200);
          resolve(result);
        }
        if (isPost) {
          server.post('/webhook', requestHandler);
        } else {
          server.get('/webhook', requestHandler);
        }

        await instance.dispatch(context, message, 'test');
      })

      await server.close();

      return { instance, received };
    }

    it('can make a GET client', async () => {

      const message = {
        str: 'string',
        num: 10,
        bool: true,
        fl: 10.29
      }

      const { received } = await dispatch(message, { method: 'GET' });

      expect(received).toBeDefined();
      expect(received.str).toBe(message.str);
      expect(received.num).toBe(message.num.toString());
      expect(received.bool).toBe('true');
      expect(received.fl).toBe('10.29');
    });

    it('can make a POST client', async () => {

      const message = {
        str: 'string',
        num: 10,
        bool: true,
        fl: 10.29,
        obj: {
          level: {
            one: 1,
            two: {
              three: 4
            }
          }
        }
      }

      const { received } = await dispatch(message, {
        method: 'POST',
        timeout: 2000
      });

      expect(received).toStrictEqual(message);
    });

    it('supports an additional payload', async () => {

      const message = {
        str: 'string',
        num: 10,
        bool: true,
        fl: 10.29,
      }

      const payload = {
        'here': nanoid(),
        'is': false,
        'some': 41,
        'data': {
          num: 1,
          str: 'two'
        }
      };

      const expected = { ...message, ... payload };

      const { received } = await dispatch(message, { method: 'POST', payload });

      expect(received).toStrictEqual(expected);

    });

    it('supports an output object mapper', async () => {

      const message = {
        id: 1000,
        name: 'cheetos',
        tax: 10,
        price: 1000,
        count: 3
      };

      const payload = {
        'here': nanoid(),
        'meta': {
          createdAt: new Date(),
          serialNumber: nanoid()
        }
      };

      const mapper = {
        'id': 'id',
        'serialNumber': 'meta.serialNumber',
        'items[0].name': 'name',
        'items[0].count': 'count',
        'items[0].price': 'price',
        'items[0].total': '{{multiply (get "count") (get "price")}}',
      };

      const expected = {
        id: message.id,
        serialNumber: payload.meta.serialNumber,
        items: [
          {
            name: message.name,
            count: message.count,
            price: message.price,
            total: (message.price * message.count).toString()
          }
        ]
      }

      const { received } = await dispatch(message, {
        method: 'POST',
        payload,
        resultMap: mapper,
      });

      expect(received).toStrictEqual(expected);

    }, 7000 );
  });

});
