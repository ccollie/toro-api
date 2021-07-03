import {
  getOutlierIndexes,
  getOutliers,
  OutlierMethod,
} from '@server/stats/outliers';

describe('sigma', () => {
  const data = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 5];

  it('calculates using defaults', () => {
    const indexes = getOutlierIndexes(OutlierMethod.Sigma, data);
    expect(indexes).toStrictEqual([14]);
  });

  it('calculates outliers', () => {
    const values = getOutliers(OutlierMethod.Sigma, data);
    expect(values).toStrictEqual([5]);
  });
});
