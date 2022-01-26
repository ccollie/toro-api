import { sample } from '@alpen/shared';
import { Job, Queue } from 'bullmq';
const log = console.log.bind(console);

const PROTEINS = 'carnitas brisket camarones pescado'.split(' ');
const SALSAS = 'habanero chipotle tomatillo mole'.split(' ');

function chooseProtein(): string {
  return sample(PROTEINS);
}

function chooseSalsa(): string {
  return sample(SALSAS);
}

export function createJob(queue: Queue, orderNumber: string): Promise<Job> {
  const protein = chooseProtein();
  const salsa = chooseSalsa();

  log(`${queue.name}: ordering #${orderNumber} ${protein}, ${salsa}`);
  return queue.add('tacos', { protein, salsa, orderNumber, queue: queue.name });
}
