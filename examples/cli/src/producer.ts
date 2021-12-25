import { Producer } from './classes';

(async () => {
  const producer = new Producer();
  await producer.run();
})();
