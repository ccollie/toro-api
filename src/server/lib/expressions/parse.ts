import jsep, { CallExpression } from 'jsep';
import {
  BinaryOpNode,
  FunctionCallNode,
  IdentifierNode,
  LiteralNode,
  MemberNode,
  MethodCallNode,
  RpnNode,
  UnaryOpNode,
} from './ast';

type AnyExpression =
  | jsep.ArrayExpression
  | jsep.BinaryExpression
  | jsep.MemberExpression
  | jsep.CallExpression
  | jsep.ConditionalExpression
  | jsep.Identifier
  | jsep.Literal
  | jsep.LogicalExpression
  | jsep.ThisExpression
  | jsep.UnaryExpression;

// Remove a binary operator
jsep.removeBinaryOp('>>>');
jsep.addUnaryOp('!!');
jsep.addUnaryOp('typeof');
jsep.addBinaryOp('instanceof', 11);
jsep.addBinaryOp('matches', 11);
jsep.addBinaryOp('=~', 11);
jsep.addBinaryOp('!~', 11);
jsep.addBinaryOp('??', 1);

export function parse(str: string): jsep.Expression {
  return jsep(str);
}

export function convertToRPN(expr: string | jsep.Expression): RpnNode[] {
  const items: any[] = [];
  let compiled: jsep.Expression;

  if (typeof expr === 'string') {
    compiled = parse(expr);
  } else {
    compiled = expr;
  }
  toRpn(compiled, items);
  return optimizeRPN(items);
}

function getIdentifierName(node: jsep.Expression): string {
  return (node as jsep.Identifier).name;
}

function toRpn(_node: jsep.Expression, context: any[]) {
  const node = _node as AnyExpression;

  function push(data: any) {
    context.push(data);
  }

  function evaluateArray(list: jsep.Expression[], context) {
    for (let i = list.length - 1; i >= 0; i--) {
      toRpn(list[i], context);
    }
  }

  function visitCallExpression(node: jsep.CallExpression) {
    const argc = node.arguments.length;
    evaluateArray(node.arguments, context);
    let callee = node.callee;
    if (callee.type === 'MemberExpression') {
      const member = callee as jsep.MemberExpression;
      const { property } = member;
      const newNode = {
        argc,
        type: 'methodCall',
        name: getIdentifierName(property as jsep.Identifier),
      };
      visitMemberExpression(member, context);
      push(newNode);
    } else {
      const newNode = { type: 'functionCall', argc, name: undefined };
      if (callee.type === 'Identifier') {
        newNode.name = getIdentifierName(callee);
      } else {
        toRpn(node.callee, context);
      }
      push(newNode);
    }
  }

  function visitMemberExpression(node: jsep.MemberExpression, context: any[]) {
    toRpn(node.object, context);
    if (node.computed) {
      toRpn(node.property, context);
      push({ type: 'member' });
    } else {
      const identifier = (node.property as jsep.Identifier).name;
      push({ type: 'member', name: identifier });
    }
  }

  function binop(node: jsep.LogicalExpression | jsep.BinaryExpression) {
    toRpn(node.right, context);
    toRpn(node.left, context);
    push({ type: 'binary', op: node.operator });
  }

  function conditional(node: jsep.ConditionalExpression) {
    toRpn(node.test, context);
    toRpn(node.consequent, context);
    toRpn(node.alternate, context);
    push({ type: 'conditional' });
  }

  switch (node.type) {
    case 'ArrayExpression':
      return evaluateArray(node.elements, context);

    case 'BinaryExpression':
      return binop(node);

    case 'CallExpression':
      return visitCallExpression(node);

    case 'ConditionalExpression':
      return conditional(node);

    case 'Identifier':
      return push({ type: 'identifier', name: node.name });

    case 'Literal':
      return push({ type: 'literal', value: node.value });

    case 'LogicalExpression':
      return binop(node);

    case 'MemberExpression':
      return visitMemberExpression(node, context);

    case 'ThisExpression':
      return context;

    case 'UnaryExpression':
      toRpn(node.argument, context);
      push({ type: 'unary', op: node.operator });
      return;

    default:
      return undefined;
  }
}

export function toInfix(tokens: RpnNode[]): string {
  const res: string[] = [];

  function stripParens(s: string): string {
    let start = 0,
      end = s.length - 1;
    while (s[start] === '(' && s[end] === ')') {
      start++;
      end--;
    }
    if (start) {
      return s.substr(start, end - start + 1);
    }
    return s;
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    switch (token.type) {
      case 'literal':
        res.push((token as LiteralNode).value + '');
        break;
      case 'identifier':
        res.push((token as IdentifierNode).name);
        break;
      case 'member':
        // pop off containing object
        let property: string;
        let glue = '';
        const value = (token as MemberNode).name;
        if (value === undefined) {
          // computed. result is on stack
          property = '[' + stripParens(res.pop()) + ']';
        } else {
          glue = '.';
          property = value; // property name
        }
        const object = res.pop();
        res.push(object + glue + property);
        break;
      case 'methodCall': {
        const { name, argc } = token as MethodCallNode;
        const args: any = [];
        const object = res.pop();
        for (let i = 0; i < argc; i++) {
          args.push(res.pop());
        }
        res.push(`${object}.${name}(${args.join(',')})`);
        break;
      }
      case 'functionCall': {
        const { name, argc } = token as FunctionCallNode;
        const args: any = [];
        for (let i = 0; i < argc; i++) {
          args.push(res.pop());
        }
        res.push(`${name}(${args.join(',')})`);
        break;
      }
      case 'binary':
        const op = (token as BinaryOpNode).op;
        const left = res.pop();
        const right = res.pop();
        res.push(`(${left} ${op} ${right})`);
        break;
      case 'unary':
        const unop = (token as UnaryOpNode).op;
        const arg = res.pop();
        res.push(`(${unop} ${arg}`);
        break;
      case 'conditional':
        const alternate = res.pop();
        const consequence = res.pop();
        const condition = res.pop();
        res.push(`${condition} ? ${consequence} : ${alternate}`);
        break;
    }
  }
  return stripParens(res.join(' '));
}

function optimizeRPN(rpn: RpnNode[]): RpnNode[] {
  // todo: collapse multiple member calls to single identifier node
  rpn = optimizeIdentifiers(rpn);
  // fold unary ops with literals e.g  { type: 'unary', value: '-' }
  rpn = optimizeUnary(rpn);
  return rpn;
}

function optimizeIdentifiers(rpn: RpnNode[]): RpnNode[] {
  let result: RpnNode[] = [];

  let i = 0;
  while (i < rpn.length) {
    const node = rpn[i];

    if (node.type === 'identifier') {
      let j = i + 1;
      let idParts = [(node as IdentifierNode).name];
      while (j < rpn.length && rpn[j].type === 'member') {
        if (j + 1 < rpn.length && rpn[j + 1].type === 'methodCall') {
          i++;
          break;
        }
        idParts.push((rpn[j] as MemberNode).name);
        j++;
        i++;
      }
      const idNode = {
        type: 'identifier',
        name: idParts.join('.'),
      } as IdentifierNode;
      result.push(idNode);
    } else {
      result.push(node);
    }
    i++;
  }
  return result;
}

function optimizeUnary(rpn: RpnNode[]): RpnNode[] {
  let result: RpnNode[] = [];

  function replace(value: string | boolean | number | null) {
    result.pop(); // replace old value
    result.push({ type: 'literal', value } as LiteralNode);
  }

  let i = 0;
  let prev: RpnNode;
  while (i < rpn.length) {
    const node = rpn[i];
    prev = i && rpn[i - 1];

    if (node.type === 'unary' && prev?.type === 'literal') {
      const op = (node as UnaryOpNode).op;
      const val = (prev as LiteralNode).value;
      const type = typeof val;
      if (op === 'typeof') {
        replace(type);
      } else if (op === '!!') {
        replace(!!val);
      } else if (op === '-') {
        if (type === 'number') {
          replace(-1 * (val as number));
        } else {
          result.push(node);
        }
      } else if (op === '+') {
        // skip adding this node
      } else if (op === '!') {
        if (type === 'boolean') {
          replace(!val);
        } else {
          result.push(node);
        }
      }
    } else {
      result.push(node);
    }
    i++;
  }
  return result;
}
