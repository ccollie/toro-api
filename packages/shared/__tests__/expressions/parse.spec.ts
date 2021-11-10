import { parse } from '../../src';

describe('Expressions', () => {
  describe('parse', () => {
    it('can parse', () => {
      const expr = 'path.fn(c, d)';
      const ast = parse(expr);
      expect(ast).toBeDefined();
    });
  });
});
