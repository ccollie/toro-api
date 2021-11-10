import { KeywordValueFn, parse, ValueKeyword } from '@alpen/shared';
import jsep from 'jsep';
import fnv from 'fnv-plus';


export type FilterMeta = {
  expr: jsep.Expression;
  filter: string;
  hash: string;
  globals: Record<string, any> | undefined;
};

export const KeywordValues: Record<ValueKeyword, KeywordValueFn> = {
  $NOW: () => Date.now(),
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

export function getExpressionHash(expr: string): string {
  return fnv.hash(expr).hex();
}

export function compileFilter(filter: string): FilterMeta {
  const expr = parse(filter);
  const hash = getExpressionHash(filter);
  const _globs = collectIdentifiers(expr);

  optimizeMemberExpression(expr);

  return {
    expr,
    filter,
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

function evalCollectIdentifiers(
  _node: jsep.Expression,
  result: Set<string>,
) {
  function evaluateArray(list) {
    return list.map((v) => evalCollectIdentifiers(v, result));
  }

  function evaluateMember(node: jsep.MemberExpression) {
    evalCollectIdentifiers(node.object, result);
    if (node.computed) {
      evalCollectIdentifiers(node.property, result);
    } else {
      result.add((node.property as jsep.Identifier).name);
    }
    return node;
  }

  const node = _node as AnyExpression;
  switch (node.type) {
    case 'ArrayExpression':
      return evaluateArray(node.elements);

    case 'BinaryExpression':
      evalCollectIdentifiers(node.left, result);
      evalCollectIdentifiers(node.right, result);
      return;

    case 'CallExpression':
      if (node.callee.type === 'MemberExpression') {
        evaluateMember(node.callee as jsep.MemberExpression);
      } else {
        evalCollectIdentifiers(node.callee, result);
      }
      return evaluateArray(node.arguments);

    case 'ConditionalExpression':
      evalCollectIdentifiers(node.test, result);
      evalCollectIdentifiers(node.consequent, result);
      evalCollectIdentifiers(node.alternate, result);
      return '';

      case 'Identifier':
        result.add(node.name);
        break;

    case 'Literal':
    case 'ThisExpression':
      return node;

    case 'MemberExpression':
      return evaluateMember(node);

    case 'UnaryExpression':
      return evalCollectIdentifiers(node.argument, result);

    default:
      return undefined;
  }
}

export function collectIdentifiers(node: jsep.Expression): string[] {
  const uniq = new Set<string>();
  evalCollectIdentifiers(node, uniq);
  return Array.from(uniq).sort();
}

/**
 * Simplify member expression nodes in the AST to make lua execution more efficient
 * @param _node
 */
export function optimizeMemberExpression(
  _node: jsep.Expression,
): jsep.Expression {
  function evaluateArray(list) {
    return list.map((v) => optimizeMemberExpression(v));
  }

  function evaluateMember(node: jsep.MemberExpression) {
    function getPathItems(prop: jsep.Expression): unknown[] {
      if (prop.type === 'Literal' || prop.type === 'Identifier') {
        return [prop];
      } else if (prop.type === 'MemberExpression') {
        const member = prop as jsep.MemberExpression;
        const obj = getPathItems(member.object);
        const propPart = getPathItems(member.property);
        return [...obj, ...propPart];
      } else if (
        prop.type === 'CallExpression' &&
        (prop as jsep.CallExpression).callee?.type === 'MemberExpression'
      ) {
        const res = optimizeMemberExpression(
          (prop as jsep.CallExpression).callee,
        );
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

    // ugly
    // @ts-ignore
    node.path = getPathItems(node);
    delete node.computed;
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
