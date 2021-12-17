import { Consumer } from './consumer';
import { Producer } from './producer';

(async () => {
  const consumer = new Consumer();
  const producer = new Producer();
  await producer.run();
})();
