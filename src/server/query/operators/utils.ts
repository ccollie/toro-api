// HACK
// prevent circular dependencies
import { QueryContext } from '../queryContext';
import { EvalFunc, QueryEvalFunc } from '../utils';

let _internal, _parseExpression, _compileQuery;

function loadInternal(): any {
  return (_internal = _internal || require('../internal'));
}

export function parseExpression(context: QueryContext, expr: any): EvalFunc {
  if (!_parseExpression) {
    loadInternal();
    _parseExpression = _internal.parseExpression;
  }
  return _parseExpression(context, expr);
}

export function compileQuery(context: QueryContext, expr: any): QueryEvalFunc {
  if (!_compileQuery) {
    loadInternal();
    _compileQuery = _internal.compileQuery;
  }
  return _compileQuery(context, expr);
}
