import { evalQuery } from '../support';
import { QueryContext } from '@src/server/query';

describe('Conditional Operators', () => {
  let context: QueryContext;

  function attempt(expr): boolean {
    return evalQuery(expr, {}, context);
  }

  function runTests(cases, op): void {
    test.each(cases)('%j', (expr, expected) => {
      expr = { [op]: expr };
      const result = attempt(expr);
      expect(result).toEqual(expected);
    });
  }

  describe('$cond', () => {
    runTests(
      [
        [{ if: { $lte: [200, 200] }, then: 'low', else: 'high' }, 'low'],
        [{ if: { $lte: [500, 200] }, then: 'low', else: 'high' }, 'high'],
        [[{ $lte: [100, 200] }, 'low', 'high'], 'low'],
        [[{ $lte: [500, 200] }, 'low', 'high'], 'high'],
      ],
      '$cond',
    );
  });

  describe('$ifNull', () => {
    runTests(
      [
        [[null, 'Unspecified'], 'Unspecified'],
        [[undefined, 'Unspecified'], 'Unspecified'],
        [[5, 'Unspecified'], 5],
      ],
      '$ifNull',
    );

    test('Invalid arguments', () => {
      const expr = { $ifNull: [5, 'Unspecified', 'error'] };
      expect(() => attempt(expr)).toThrow();
    });
  });

  describe('$switch', () => {
    const cases = [
      [
        {
          branches: [
            { case: { $lte: [500, 200] }, then: 'low' },
            { case: { $gte: [500, 400] }, then: 'high' },
          ],
          default: 'normal',
        },
        'high',
      ],
      [
        {
          branches: [
            { case: { $lte: [100, 200] }, then: 'low' },
            { case: { $gte: [100, 400] }, then: 'high' },
          ],
          default: 'normal',
        },
        'low',
      ],
      [
        {
          branches: [
            { case: { $lt: [500, 200] }, then: 'low' },
            { case: { $gt: [200, 400] }, then: 'high' },
          ],
          default: 'normal',
        },
        'normal',
      ],
    ];

    runTests(cases, '$switch');
  });
});
