import jsep from 'jsep';

export type AnyExpression =
  | jsep.ArrayExpression
  | jsep.BinaryExpression
  | jsep.MemberExpression
  | jsep.CallExpression
  | jsep.ConditionalExpression
  | jsep.Identifier
  | jsep.Literal
  | jsep.ThisExpression
  | jsep.UnaryExpression;

export type KeywordValueFn = () => any;

export type ValueKeyword = '$NOW' | 'PI';
