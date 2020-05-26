import { rand } from './utils';

import {
  rnorm,
  rbeta,
  rlaplace,
  rint,
  sample,
} from 'probability-distributions';
// see https://statisticsblog.com/probability-distributions/

export function gaussian(n: number, mean: number, sd = 1): number[] {
  return rnorm(n, mean, sd);
}

function laplace(n: number, mean: number, scale = 2): number[] {
  return rlaplace(n, mean, scale);
}

function normal(n: number, min: number, max: number): number[] {
  return rint(n, min, max);
}

function beta(n: number, alpha: number, beta: number): number[] {
  if (!beta) {
    const t = alpha || 0.5;
    beta = rand(t + 1.5, 8);
  }
  if (!alpha) {
    alpha = rand(0.5, beta - 2);
  }
  return rbeta(n, alpha, beta);
}

export function generateRange(n: number, options): number[] {
  const { mean, max, min = 10, sd = 2, scale = 2 } = options;

  const _gaussian = (): number[] => gaussian(n, mean, sd);
  const _laplace = (): number[] => laplace(n, mean, scale);
  const _normal = (): number[] => normal(n, min, max);

  const _beta = (): number[] => {
    const rnd = beta(n, options.alpha, options.beta);
    return rnd.map((x) => min + (max - min) * x);
  };

  const [fn] = sample([_gaussian, _beta, _laplace, _normal], 1, true, [
    0.4,
    0.3,
    0.2,
    0.1,
  ]);
  return fn();
}

export function* getLatencies(options = {}): IterableIterator<number> {
  while (true) {
    const n = rand(5, 50);
    const range = generateRange(n, options);
    for (let i = 0; i < range.length; i++) {
      yield range[i];
    }
  }
}
