import { compileQuery, parseExpression } from '../../../../../src/server/query';
import { createContext } from '../../../factories';
export { createContext };

import fs from 'fs';
import { Query } from '@src/server/query';
import { $project } from '@src/server/query/pipeline/project';

export const personData = JSON.parse(
  fs.readFileSync(__dirname + '/data/person.json').toString(),
);

// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
export const studentsData = JSON.parse(
  fs.readFileSync(__dirname + '/data/students.json').toString(),
);

export const evalExpression = (expr: any, obj: any, context): any => {
  context = context || createContext();
  const fn = parseExpression(context, expr);
  return fn(obj);
};

export const evalQuery = (expr: any, obj: any = {}, context): boolean => {
  context = context || createContext();
  const fn = compileQuery(context, expr);
  return fn(obj);
};

export const find = (data: any[], criteria: any, projection = null): any[] => {
  const query = new Query(criteria, createContext());
  let result = (data || []).filter((datum) => query.test(datum));
  if (projection) {
    const compiled = $project(query.context, projection);
    result = compiled(result);
  }
  return result;
};

export const findFirst = (
  data: any[],
  criteria: any,
  projection = null,
): any => {
  const found = find(data, criteria, projection);
  return found && found.length ? found[0] : null;
};

// export function runTest(description, suite): void {
//   Object.entries(suite).forEach(function (arr) {
//     const operator = arr[0];
//     const examples = arr[1] as any[];
//     test(description + ': ' + operator, function (done) {
//       examples.forEach(function (val) {
//         let input = val[0];
//         let expected = val[1];
//         const ctx = val[2] || { err: false };
//         const obj = ctx.obj || {};
//
//         let field = operator;
//         // use the operator as field if not present in input
//         if (!!input && input.constructor === Object) {
//           field = Object.keys(input).find((s) => s[0] === '$') || null;
//           if (field === null) {
//             field = operator;
//           } else {
//             input = input[field];
//           }
//         }
//
//         if (ctx.err) {
//           t.throws(
//             () => computeValue(obj, input, field),
//             JSON.stringify(input) + '\t=>\t' + expected,
//           );
//         } else {
//           let actual = computeValue(obj, input, field);
//           const message =
//             operator +
//             ':\t' +
//             JSON.stringify(input) +
//             '\t=>\t' +
//             JSON.stringify(expected);
//           // NaNs don't compare
//           if (actual !== actual && expected !== expected) actual = expected = 0;
//           t.deepEqual(actual, expected, message);
//         }
//       });
//       done();
//     });
//   });
// }
