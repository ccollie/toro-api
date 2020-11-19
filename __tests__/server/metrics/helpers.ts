import { random } from 'lodash';

export function getRandomBoolArray(count?: number): boolean[] {
  count = count || random(5, 20);
  let result = new Array(count);
  for (let i = 0; i < count; i++) {
    result[i] = random(1, 10) % 2 === 0;
  }
  return result;
}

export function getRandomNumberArray(length?: number): number[] {
  length = length || random(5, 20);
  const xs = new Array<number>(length);
  for (let i = 0; i < xs.length; ++i) {
    xs[i] = Math.random();
  }
  return xs;
}
