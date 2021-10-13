import {convertToRPN, parse, toInfix} from '../../src';

describe('Expressions', () => {
  describe('parse', () => {
    it('can parse', () => {
      const expr = 'path.fn(c, d)';
      const ast = parse(expr);
      const rpn = convertToRPN(ast);
      expect(rpn).toBeDefined();
    });
  });

  describe('convertToRPN', () => {
    it('can convert to RPN', () => {
      const expr =
        '1 + ((x -5) * 8) / a.b.c[x - z].d.fn(c, d) + ((x + y) > 5) ? 10 : $NOW';
      const ast = parse(expr);
      const rpn = convertToRPN(ast);

      const infix = toInfix(rpn);

      expect(rpn).toBeDefined();
    });
  });
});
