import { OP_PROJECTION, OP_QUERY, OP_EXPRESSION, OP_GROUP } from '../constants';

import * as expressionOperators from './expression';
import * as queryOperators from './query';
import * as projectionOperators from './projection';

type OperatorMap = Record<string, Record<string, Function>>;
// operator definitions
export const OPERATORS: OperatorMap = {};

OPERATORS[OP_EXPRESSION] = {};
Object.keys(expressionOperators).forEach((key) => {
  const group = expressionOperators[key];
  Object.keys(group).forEach((groupKey) => {
    OPERATORS[OP_EXPRESSION][groupKey] = group[groupKey];
  });
});

OPERATORS[OP_GROUP] = {};
OPERATORS[OP_PROJECTION] = projectionOperators;
OPERATORS[OP_QUERY] = queryOperators;

export const SYSTEM_OPERATORS = [
  [OP_EXPRESSION, expressionOperators],
  [OP_QUERY, queryOperators],
];
