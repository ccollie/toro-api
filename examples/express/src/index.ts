import Express from 'express';
import { ExpressServerAdapter } from '@alpen/express';
import { Consumer } from './consumer';
import { Producer } from './producer';

const isProduction = process.env.NODE_ENV === 'production';

const port = 3000;
const baseUrl = '/';
(async () => {
  const app = Express();
  const consumer = new Consumer();
  const producer = new Producer();
  await producer.run();
  const adapter = new ExpressServerAdapter({
    hosts: Producer.hosts,
    showPlayground: !isProduction,
  });
  const { router } = await adapter.setOptions({ cors: true }).build({ app });
  app.use(baseUrl, router);
  app.listen(port, () => console.log(`http://localhost:${port}${baseUrl}`));
})();
