import { KeywordValueFn, parse, ValueKeyword } from '@alpen/shared';
import jsep from 'jsep';
import fnv from 'fnv-plus';

const Globals = ['JSON', 'Date', 'Math', 'Object'];

export type ExpressionMeta = {
  compiled: jsep.Expression;
  expr: string;
  hash: string;
  globals: Record<string, any> | undefined;
};

export const KeywordValues: Record<ValueKeyword, KeywordValueFn> = {
  $NOW: () => Date.now(),
  PI: () => Math.PI,
};

type AnyExpression =
  | jsep.ArrayExpression
  | jsep.BinaryExpression
  | jsep.MemberExpression
  | jsep.CallExpression
  | jsep.ConditionalExpression
  | jsep.Identifier
  | jsep.Literal
  | jsep.ThisExpression
  | jsep.UnaryExpression;

declare module 'jsep' {
  interface MemberExpression {
    path?: jsep.Expression[];
    isBuiltIn?: boolean;
  }
}

export function getExpressionHash(expr: string): string {
  return fnv.hash(expr).hex();
}

export function compileExpression(expression: string): ExpressionMeta {
  const compiled = parse(expression);
  const hash = getExpressionHash(expression);

  const idSet = new Set<string>();
  optimizeMemberExpression(compiled, idSet);
  const _globs = Array.from(idSet);

  return {
    compiled,
    expr: expression,
    hash,
    get globals(): Record<string, any> | undefined {
      if (!_globs.length) return undefined;
      const res = {};
      _globs.forEach((name) => {
        const fn = KeywordValues[name];
        if (fn) res[name] = fn();
      });
      return res;
    },
  };
}

/**
 * Simplify member expression nodes in the AST to make lua execution more efficient
 * @param _node root of the AST
 * @param identifiers
 */
export function optimizeMemberExpression(
  _node: jsep.Expression,
  identifiers?: Set<string>
): jsep.Expression {

  identifiers = identifiers ?? new Set<string>();

  function evaluateArray(list) {
    return list.map((v) => optimizeMemberExpression(v));
  }

  function evaluateMember(node: jsep.MemberExpression) {
    if (node.object.type === 'Identifier') {
      const name = (node.object as jsep.Identifier).name;
      if (Globals.includes(name)) {
        node.isBuiltIn = true;
      }
      // todo: we can validate method names here
    }
    if (!node.computed) {
      identifiers.add((node.property as jsep.Identifier).name);
    }

    return node;
  }

  const node = _node as AnyExpression;
  switch (node.type) {
    case 'ArrayExpression':
      evaluateArray(node.elements);
      break;

    case 'BinaryExpression':
      optimizeMemberExpression(node.left);
      optimizeMemberExpression(node.right);
      break;

    case 'CallExpression':
      if (node.callee.type === 'MemberExpression') {
        const callee = node.callee as jsep.Expression;
        if (callee.type === 'MemberExpression') {
          const object = callee.object as jsep.Expression;
          if (object.type === 'Identifier') {
            const name = (object as jsep.Identifier).name;
            if (Globals.includes(name)) {
              node.callee.isBuiltIn = true;
            }
            // todo: we can validate method names here
          }
        }
        evaluateMember(node.callee as jsep.MemberExpression);
      } else {
        optimizeMemberExpression(node.callee);
      }
      evaluateArray(node.arguments);
      return node;

    case 'ConditionalExpression':
      optimizeMemberExpression(node.test);
      optimizeMemberExpression(node.consequent);
      optimizeMemberExpression(node.alternate);
      break;

    case 'Identifier':
      identifiers.add(node.name);
      break;
    case 'Literal':
    case 'ThisExpression':
      break;

    case 'MemberExpression':
      return evaluateMember(node);

    case 'UnaryExpression':
      return optimizeMemberExpression(node.argument);
  }

  return node;
}
