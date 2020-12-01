import { rand } from './utils';
import { normal, laplace, beta, sample } from 'unirand';

// see https://statisticsblog.com/probability-distributions/

export function generateRange(n: number, options): number[] {
  const { mean, max, min = 10, sd = 2, scale = 2 } = options;

  const _gaussian = () => normal(mean, sd).distributionSync(n);
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
    const n = rand(5, 50);
    const range = generateRange(n, options);
    for (let i = 0; i < range.length; i++) {
      yield range[i];
    }
  }
}
