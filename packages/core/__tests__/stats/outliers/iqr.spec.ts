import {
  getOutlierIndexes,
  getOutliers,
  OutlierMethod,
} from '@server/../../../../packages/core/src/stats/outliers';

describe('iqr', () => {
  const data = [12, 14, 51, 12, 10, 9, 16, 1];

  it('calculates using defaults', () => {
    const indexes = getOutlierIndexes(OutlierMethod.IQR, data);
    expect(indexes).toStrictEqual([2, 7]);
  });

  it('calculates outliers', () => {
    const values = getOutliers(OutlierMethod.IQR, data);
    expect(values).toStrictEqual([51, 1]);
  });
});
