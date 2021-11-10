import jsep from 'jsep';

declare type AnyExpression =
  | jsep.ArrayExpression
  | jsep.BinaryExpression
  | jsep.MemberExpression
  | jsep.CallExpression
  | jsep.ConditionalExpression
  | jsep.Identifier
  | jsep.Literal
  | jsep.ThisExpression
  | jsep.UnaryExpression;

// Remove a binary operator
jsep.removeBinaryOp('>>>');
jsep.addUnaryOp('!!');
jsep.addUnaryOp('typeof');
jsep.addBinaryOp('matches', 11);
jsep.addBinaryOp('=~', 11);
jsep.addBinaryOp('!~', 11);
jsep.addBinaryOp('xor', 2);
jsep.addBinaryOp('??', 1);

export function parse(str: string): jsep.Expression {
  return jsep(str);
}
