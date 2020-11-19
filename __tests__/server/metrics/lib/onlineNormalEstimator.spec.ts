import OnlineNormalEstimator from '../../../../src/server/metrics/lib/onlineNormalEstimator';
import { random } from 'lodash';

function randomArray(length: number) {
  const xs = new Array<number>(length);
  for (let i = 0; i < xs.length; ++i) {
    xs[i] = Math.random();
  }
  return xs;
}


function createEstimator(xs: number[]): OnlineNormalEstimator {
  const est = new OnlineNormalEstimator();
  for (let i = 0; i < xs.length; ++i) est.add(xs[i]);
  return est;
}

function mean(xs: number[]): number {
  let sum = 0;
  for (let i = 0; i < xs.length; i++) sum += xs[i];
  return sum / xs.length;
}

function variance(xs: number[]) {
  return sumSquareDiffs(xs, mean(xs)) / xs.length;
}

function sumSquareDiffs(xs: number[], mean: number): number {
  let sum = 0.0;
  for (let i = 0; i < xs.length; ++i) {
    let diff = xs[i] - mean;
    sum += diff * diff;
  }
  return sum;
}


describe('onlineNormalEstimator', () => {

  describe('constructor', () => {
    it('can construct an OnlineNormalEstimator', () => {
      const estimator = new OnlineNormalEstimator();
      expect(estimator).toBeDefined();
    });

    it('generates an object with default values', () => {
      const estimator = new OnlineNormalEstimator();
      expect(estimator.numSamples).toBe(0);
      expect(estimator.mean).toBeCloseTo(0.0);
      expect(estimator.variance).toBeCloseTo(0.0);
      expect(estimator.varianceUnbiased).toBeCloseTo(0.0);
      expect(estimator.standardDeviation).toBeCloseTo(0.0);
      expect(estimator.standardDeviationUnbiased).toBeCloseTo(0.0);
    });
  });

  describe('replace', () => {

    function replaceValue(xs: number[], target: number, replacement: number): void {
      const i = xs.indexOf(target, 0);
      if (i >= 0) xs[i] = replacement;
    }

    it('should properly recalculate after a replacement', () => {
      const orig = randomArray(400);
      const final = [...orig];
      const targets = [];
      const dedup = new Set<number>();
      for (let i = 0; i < 40; i++) {
        const index = random(0, orig.length - 1);
        if (!dedup.has(index)) {
          dedup.add(index);
          targets.push(orig[index])
        }
      }

      const actualEstimator = createEstimator(orig);
      const replacements = randomArray(targets.length);

      targets.forEach((original, index) => {
        const replacement = replacements[index];
        replaceValue(final, original, replacement);
        actualEstimator.replace(original, replacement);
      });

      const expectedEstimator = createEstimator(final);

      expect(actualEstimator.numSamples).toBe(expectedEstimator.numSamples);
      expect(actualEstimator.mean).toBeCloseTo(expectedEstimator.mean, 3);
      expect(actualEstimator.variance).toBeCloseTo(expectedEstimator.variance, 3);
      expect(actualEstimator.varianceUnbiased).toBeCloseTo(expectedEstimator.varianceUnbiased, 3);
      expect(actualEstimator.standardDeviation).toBeCloseTo(expectedEstimator.standardDeviation, 3);
      expect(actualEstimator.standardDeviationUnbiased).toBeCloseTo(expectedEstimator.standardDeviationUnbiased, 3);

    });

  });

  describe('remove', () => {
    it('can remove values', () => {
      const estimator = new OnlineNormalEstimator();

      estimator.add(1.0);  // 1
      expect(estimator.numSamples).toBe(1);

      estimator.remove(1.0); //
      expect(estimator.numSamples).toBe(0);

      estimator.add(2.0); // 2
      expect(estimator.numSamples).toBe(1);
      expect(estimator.mean).toBeCloseTo(2.0,3);
      expect(estimator.variance).toBeCloseTo(0.0, 3);

      estimator.add(1.0); // 2, 1
      expect(estimator.numSamples).toBe(2);
      expect(estimator.mean).toBeCloseTo(1.5,3);
      expect(estimator.variance).toBeCloseTo(0.25, 3);

      estimator.remove(2.0); // 1
      expect(estimator.numSamples).toBe(1);
      expect(estimator.mean).toBeCloseTo(1.0,3);
      expect(estimator.variance).toBeCloseTo(0.0, 3);

      estimator.add(2.0); // 1, 2
      estimator.add(3.0); // 1, 2, 3
      estimator.remove(2.0); // 1, 3
      expect(estimator.numSamples).toBe(2);
      expect(estimator.mean).toBeCloseTo(2.0,3);
      expect(estimator.variance).toBeCloseTo(1.0, 3);
    });

    it('throws if there are no samples', () => {
      const estimator = new OnlineNormalEstimator();

      estimator.add(2.0);
      estimator.remove(2.0);
      expect(() => estimator.remove(2.0)).toThrow();
    });

  });

  describe('numSamples', () => {
    it('tracks sample count correctly', () => {
      const estimator = new OnlineNormalEstimator();

      expect(estimator.numSamples).toBe(0);
      estimator.add(5.0);
      expect(estimator.numSamples).toBe(1);
      estimator.add(6.0);
      expect(estimator.numSamples).toBe(2);
    });
  });

  describe('stats', () => {
    it('should properly calculate the mean', () => {
      for (let i = 0; i < 10; ++i) {
        const xs = randomArray(500);
        const expected = mean(xs);
        const actual = createEstimator(xs).mean;
        expect(actual).toBeCloseTo(expected, 3);
      }
    });

    it('should calculate the variance', () => {
      for (let i = 0; i < 10; ++i) {
        const xs = randomArray(500);
        const expectedVar = variance(xs);
        const actualVar = createEstimator(xs).variance;
        expect(actualVar).toBeCloseTo(expectedVar, 3);
      }
    });

    it('should calculate the varianceUnbiased', () => {
      for (let i = 0; i < 10; ++i) {
        const xs = randomArray(500);
        const expectedVar = 500.0/499.0 * variance(xs);
        const actualVar = createEstimator(xs).varianceUnbiased;
        expect(actualVar).toBeCloseTo(expectedVar, 3);
      }
    });

    it('should calculate the std deviation', () => {
      for (let i = 0; i < 10; ++i) {
        const xs = randomArray(500);
        const _var = variance(xs);
        const expected = Math.sqrt(_var);
        const actual = createEstimator(xs).standardDeviation;

        expect(actual).toBeCloseTo(expected, 3);
      }
    });

    it('should calculate the unbiased std deviation', () => {
      for (let i = 0; i < 10; ++i) {
        const xs = randomArray(500);
        const _var = variance(xs);
        const expected = Math.sqrt((500/ 499) * _var);
        const actual = createEstimator(xs).standardDeviationUnbiased;

        expect(actual).toBeCloseTo(expected, 3);
      }
    });
  });

  describe('reset', () => {
    it('resets the internal states', () => {
      const arr = randomArray(10);
      const estimator = createEstimator(arr);

      expect(estimator.numSamples).toBe(arr.length);
      estimator.reset();
      expect(estimator.numSamples).toBe(0);
      expect(estimator.mean).toBeCloseTo(0.0);
      expect(estimator.variance).toBeCloseTo(0.0);
      expect(estimator.varianceUnbiased).toBeCloseTo(0.0);
      expect(estimator.standardDeviation).toBeCloseTo(0.0);
      expect(estimator.standardDeviationUnbiased).toBeCloseTo(0.0);
    });
  });

  describe('combine', () => {

    it('can combine two estimators', () => {
      const firstData = randomArray(400);
      const secondData = randomArray(400);
      const allData = [...firstData, ...secondData];

      const firstEstimator = createEstimator(firstData);
      const secondEstimator = createEstimator(secondData);

      const actual = firstEstimator.combine(secondEstimator);
      const expected = createEstimator(allData);

      expect(actual.numSamples).toBe(expected.numSamples);
      expect(actual.mean).toBeCloseTo(expected.mean, 3);
      expect(actual.variance).toBeCloseTo(expected.variance, 3);
      expect(actual.varianceUnbiased).toBeCloseTo(expected.varianceUnbiased, 3);
      expect(actual.standardDeviation).toBeCloseTo(expected.standardDeviation, 3);
      expect(actual.standardDeviationUnbiased).toBeCloseTo(expected.standardDeviationUnbiased, 3);

    });

  });
});
