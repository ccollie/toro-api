import ExprEval from 'jse-eval';

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

export { ExprEval };

export * from './consts';
export * from './types';
export * from './utils';
