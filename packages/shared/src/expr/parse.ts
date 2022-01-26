import ExprEval from 'jse-eval';

export type EvalFn = ReturnType<typeof ExprEval.compile>;
export type Expression = ReturnType<typeof ExprEval.parse>;

// Remove a binary operator
ExprEval.jsep.removeBinaryOp('>>>');
ExprEval.addUnaryOp('!!', Boolean);
ExprEval.addUnaryOp('typeof', (value: any) => typeof value);
ExprEval.addBinaryOp('??', function (a, b) {
  return a ?? b;
});
// ExprEval.addBinaryOp('matches', 11);
// ExprEval.addBinaryOp('=~', 11);
// ExprEval.addBinaryOp('!~', 11);
// ExprEval.addBinaryOp('xor', 2);

export function parse(str: string): Expression {
  return ExprEval.parse(str);
}

export function compileExpr(expr: string): EvalFn {
  return ExprEval.compile(expr);
}

export { ExprEval };
