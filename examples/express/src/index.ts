import { ExpressServerAdapter } from '@alpen/express';
import Express from 'express';
import { DemoHosts } from './hosts';

const isProduction = process.env.NODE_ENV === 'production';

const port = process.env.port || 4000;
const baseUrl = '/';

(async () => {
  const app = Express();
  const adapter = new ExpressServerAdapter({
    hosts: DemoHosts,
    showPlayground: !isProduction,
  });
  const { router } = await adapter.setOptions({cors: true}).build({app});
  app.use(baseUrl, router);
  app.listen(port, () => console.log(`http://localhost:${port}${baseUrl}`));
})();
