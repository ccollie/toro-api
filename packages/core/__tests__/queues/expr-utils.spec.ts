import { parse } from '@alpen/shared';
import { optimizeMemberExpression } from '../../src/lib/expr-utils';

describe('expr-utils', () => {
    it('optimizeMemberExpression', () => {
       const expr = 'x.y(7 * d.y).z[1]*2';
       const node = parse(expr);
       const t = optimizeMemberExpression(node);
        expect(t).toBeDefined();
    });
})
