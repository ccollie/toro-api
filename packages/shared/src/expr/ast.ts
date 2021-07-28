export interface RpnNode {
  readonly type: string;
}

export interface ThisNode extends RpnNode {
  readonly type: 'this';
}

export interface LiteralNode extends RpnNode {
  readonly type: 'literal';
  value: string | number | boolean | null;
}

export interface ConditionalNode extends RpnNode {
  readonly type: 'conditional';
  readonly elseOfs?: number;
}

export interface IdentifierNode extends RpnNode {
  readonly type: 'identifier';
  name?: string;
}

export interface MemberNode extends RpnNode {
  readonly type: 'member';
  name?: string;
}

export interface MethodCallNode extends RpnNode {
  readonly type: 'methodCall';
  argc: number;
  name?: string;
}

export interface FunctionCallNode extends RpnNode {
  readonly type: 'functionCall';
  argc: number;
  name?: string;
}

export interface UnaryOpNode extends RpnNode {
  readonly type: 'unary';
  op: string;
}

export interface BinaryOpNode extends RpnNode {
  readonly type: 'binary';
  left: RpnNode;
  right: RpnNode;
  op: string;
}

export interface ValueKeywordNode extends RpnNode {
  readonly type: 'keyword';
  name: string;
}

export type KeywordValueFn = () => any;

export type ValueKeyword = '$NOW';
