import { randomBytes } from 'crypto';
import { nanoid } from 'nanoid';
import { random } from 'lodash';

export function randomString(length = 10): string {
  return randomBytes(10).toString('hex');
}

export function randomId(len = 8): string {
  return nanoid(len);
}

export function flushPromises() {
  const scheduler =
    typeof setImmediate === 'function' ? setImmediate : setTimeout;
  return new Promise((resolve) => {
    scheduler(resolve, 0);
  });
}

export function delay(ms): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function getRandomIntArray(
  count: number,
  max?: number,
  min?: number,
): number[] {
  if (!min && !max) {
    min = 0;
    max = 1000;
  } else if (!max) {
    max = min + Math.max(20, random(min, min + 1000));
  } else {
    min = 0;
  }
  const result = new Array(count);
  for (let i = 0; i < count; i++) {
    result[i] = random(min, max);
  }

  return result;
}

export function getRandomBool(): boolean {
  return random(1, 57) % 2 === 0;
}
