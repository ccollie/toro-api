import { rand } from './utils';
import { laplace, beta, sample } from 'unirand';

// see https://statisticsblog.com/probability-distributions/

// eslint-disable-next-line max-len
// https://stackoverflow.com/questions/25582882/javascript-math-random-normal-distribution-gaussian-bell-curve/36481059#36481059
export function gaussianBM(min: number, max: number, skew = 0): number {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
  while (v === 0) v = Math.random();
  let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);

  num = num / 10.0 + 0.5; // Translate to 0 -> 1
  if (num > 1 || num < 0) num = gaussianBM(min, max, skew);
  // resample between 0 and 1 if out of range
  else {
    num = Math.pow(num, skew); // Skew
    num *= max - min; // Stretch to fill range
    num += min; // offset to min
  }
  return num;
}

export function generateRange(n: number, options): number[] {
  const { mean, max, min = 10, sd = 2, scale = 2 } = options;

  const _gaussian = () => {
    const sample: number[] = [];
    for (let i = 0; i < n; i++) sample.push(gaussianBM(min, max));
    return sample;
  };

  const _laplace = () => laplace(mean, scale).distributionSync(n);

  const _beta = async (): Promise<number[]> => {
    let a = options.alpha;
    let b = options.beta;
    if (!b) {
      const t = a || 0.5;
      b = rand(t + 1.5, 8);
    }
    a = a || rand(0.5, b - 2);
    const rnd = beta(a, b).distributionSync(n);
    return rnd.map((x) => min + (max - min) * x);
  };

  const [fn] = sample([_gaussian, _beta, _laplace], 1);
  return fn();
}

export function* getLatencies(options = {}): IterableIterator<number> {
  while (true) {
    const n = rand(5, 30);
    const range = generateRange(n, options);
    for (let i = 0; i < range.length; i++) {
      yield range[i];
    }
  }
}
