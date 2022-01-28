import ExprEval from 'jse-eval';
import jsep from 'jsep';
import { AnyExpression } from './types';

export type EvalFn = ReturnType<typeof ExprEval.compile>;
export type Expression = ReturnType<typeof ExprEval.parse>;

export function parse(str: string): Expression {
  return ExprEval.parse(str);
}

export function compileExpr(expr: string): EvalFn {
  return ExprEval.compile(expr);
}

/**
 * Collect identifiers appearing in the expression
 * @param _node root of the AST
 * @param identifiers
 */
export function collectExpressionIdentifiers(
  _node: jsep.Expression,
  identifiers?: Set<string>
): void {
  identifiers = identifiers ?? new Set<string>();

  function evaluateArray(list) {
    return list.map((v) => collectExpressionIdentifiers(v));
  }

  function evaluateMember(node: jsep.MemberExpression) {
    const object = node.object as jsep.Expression;
    if (object.type === 'Identifier') {
      const name = (object as jsep.Identifier).name;
      identifiers.add(name); // in the case of foo.bar(), name will be foo
    }
    if (!node.computed) {
      identifiers.add((node.property as jsep.Identifier).name);
    } else {
      collectExpressionIdentifiers(node.property);
    }
  }

  const node = _node as AnyExpression;
  switch (node.type) {
    case 'ArrayExpression':
      evaluateArray(node.elements);
      break;

    case 'BinaryExpression':
      collectExpressionIdentifiers(node.left);
      collectExpressionIdentifiers(node.right);
      break;

    case 'CallExpression':
      if (node.callee.type === 'MemberExpression') {
        evaluateMember(node.callee as jsep.MemberExpression);
      } else {
        collectExpressionIdentifiers(node.callee);
      }
      evaluateArray(node.arguments);
      break;

    case 'ConditionalExpression':
      collectExpressionIdentifiers(node.test);
      collectExpressionIdentifiers(node.consequent);
      collectExpressionIdentifiers(node.alternate);
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
      return collectExpressionIdentifiers(node.argument);
  }
}
