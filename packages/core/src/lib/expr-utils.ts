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
    let computed = node.computed;

    function getPathItems(prop: jsep.Expression): jsep.Expression[] {
      if (!node.computed) {
        identifiers.add((node.property as jsep.Identifier).name);
      }
      if (prop.type === 'Literal' || prop.type === 'Identifier') {
        return [prop];
      } else if (prop.type === 'MemberExpression') {
        const member = prop as jsep.MemberExpression;
        computed = computed || member.computed;
        const obj = getPathItems(member.object);
        const propPart = getPathItems(member.property);
        return [...obj, ...propPart];
      } else if (
        prop.type === 'CallExpression' &&
        (prop as jsep.CallExpression).callee?.type === 'MemberExpression'
      ) {
        const callee = ((prop as jsep.CallExpression).callee as jsep.MemberExpression);
        const res = optimizeMemberExpression(callee);

        computed = computed || callee.computed;
        const method = {
          type: 'CallExpression',
          callee: res.object ?? res,
          arguments: evaluateArray(prop.arguments),
        };
        return [method];
      } else {
        const res = optimizeMemberExpression(prop);
        return [res];
      }
    }

    // ugly hack below. The following is only meant for the lua evaluator
    node.path = getPathItems(node);
    if (node.path[0].type === 'Identifier') {
      const id = (node.path[0] as jsep.Identifier).name;
      if (Globals.includes(id)) node.isBuiltIn = true;
    }

    if (!computed) {
      delete node.computed;
    } else {
      // add if not present
      node.computed = computed;
    }
    delete node.property;
    delete node.object;

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
      // @ts-ignore
      return evaluateMember(node);

    case 'UnaryExpression':
      return optimizeMemberExpression(node.argument);
  }

  return node;
}
