import { parseRange } from '../../src';
import { startOfDay, endOfDay } from 'date-fns';

describe('datetime', () => {
  describe('parseRange', () => {
    it('can parse numeric range xxxxxx-xxxxxxx', () => {
      const now = new Date();
      const start = startOfDay(now).getTime();
      const end = endOfDay(now).getTime();
      const expr = `${start}-${end}`;
      const actual = parseRange(expr);
      const expected = { start, end };
      expect(actual).toBe(expected);
    });
  });
});
