import { DDSketch } from 'sketches-js';

export function max(data: number[]): number {
  return Math.max(...data);
}

export function min(data: number[]): number {
  return Math.min(...data);
}

export function sum(data: number[]): number {
  let sum = 0;
  const len = data.length;
  for (let i = 0; i < len; i++) {
    sum += data[i];
  }
  return sum;
}

export function avg(data: number[]): number {
  const total = sum(data);
  const len = data.length;
  return len ? total / len : 0;
}

export function clearDDSketch(sketch: DDSketch): void {
  sketch.bins = {};
  sketch.n = 0;
  sketch.numBins = 0;
}
