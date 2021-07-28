import random from 'lodash/random';
import unirand from 'unirand';
import { ApdexCalculator } from '../../../src/stats';

describe('ApdexCalculator', () => {
  it('calculates the apdex score', () => {
    const calculator = new ApdexCalculator(3000);

    for (let i = 0; i < 60; ++i) {
      calculator.update(random(100, 600));
    }

    for (let i = 0; i < 30; ++i) {
      calculator.update(random(3100, 11900));
    }

    for (let i = 0; i < 10; ++i) {
      calculator.update(random(12100, 20000));
    }

    expect(calculator.getScore()).toBeCloseTo(0.75, 2);
  });

  function populateValues(apdex: ApdexCalculator, count?: number) {
    count = count || random(5, 40);
    const mu = apdex.threshold;
    const sigma = 2;
    const arr = unirand.normal(mu, sigma).distributionSync(count);
    arr.forEach((x) => {
      apdex.update(x);
    });
  }

  describe('.merge', () => {
    it('merges values with another ApdexCalculator', () => {
      const self = new ApdexCalculator(1500);
      const other = new ApdexCalculator(1500);
      populateValues(self);
      populateValues(other);

      const expectedTotal = self.totalCount + other.totalCount;
      const expectedTolerated = self.toleratedCount + other.toleratedCount;
      const expectedSatisfied = self.satisfiedCount + other.satisfiedCount;
      const expectedFrustrated = self.frustratedCount + other.frustratedCount;

      self.merge(other);
      expect(expectedTotal).toBe(self.totalCount);
      expect(expectedFrustrated).toBe(self.frustratedCount);
      expect(expectedTolerated).toBe(self.toleratedCount);
      expect(expectedSatisfied).toBe(self.satisfiedCount);
    });

    it('throws if the thresholds are different', () => {
      const self = new ApdexCalculator(1500);
      const other = new ApdexCalculator(2500);
      populateValues(self);
      populateValues(other);

      expect(() => self.merge(other)).toThrow();
    });
  });

  describe('.subtract', () => {
    it('subtracts values from another ApdexCalculator', () => {
      const larger = new ApdexCalculator(1500);
      const smaller = new ApdexCalculator(1500);
      populateValues(larger, 50);
      populateValues(smaller, 30);

      const expectedTotal = larger.totalCount - smaller.totalCount;
      const expectedTolerated = larger.toleratedCount - smaller.toleratedCount;
      const expectedSatisfied = larger.satisfiedCount - smaller.satisfiedCount;
      const expectedFrustrated =
        larger.frustratedCount - smaller.frustratedCount;

      larger.subtract(smaller);
      expect(expectedTotal).toBe(larger.totalCount);
      expect(expectedFrustrated).toBe(larger.frustratedCount);
      expect(expectedTolerated).toBe(larger.toleratedCount);
      expect(expectedSatisfied).toBe(larger.satisfiedCount);
    });

    it('resets values if subtracting from a larger set', () => {
      const smaller = new ApdexCalculator(1500);
      const larger = new ApdexCalculator(1500);
      populateValues(smaller, 20);
      populateValues(larger, 40);

      const spy = jest.spyOn(smaller, 'reset');
      smaller.subtract(larger);

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('throws if the thresholds are different', () => {
      const self = new ApdexCalculator(1500);
      const other = new ApdexCalculator(2500);
      populateValues(self);
      populateValues(other);

      expect(() => self.subtract(other)).toThrow();
    });
  });

  describe('.reset', () => {
    it('clears the internal states', () => {
      const calculator = new ApdexCalculator(3000);
      for (let i = 0; i < 60; ++i) {
        calculator.update(random(100, 600));
      }

      for (let i = 0; i < 30; ++i) {
        calculator.update(random(3100, 11900));
      }

      for (let i = 0; i < 10; ++i) {
        calculator.update(random(12100, 20000));
      }

      // before
      expect(calculator.totalCount).not.toBe(0);
      expect(calculator.satisfiedCount).not.toBe(0);
      expect(calculator.toleratedCount).not.toBe(0);
      expect(calculator.frustratedCount).not.toBe(0);

      calculator.reset();

      // after
      expect(calculator.totalCount).toBe(0);
      expect(calculator.satisfiedCount).toBe(0);
      expect(calculator.toleratedCount).toBe(0);
      expect(calculator.frustratedCount).toBe(0);
    });
  });
});
