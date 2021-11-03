// maybe move to ast.ts
// make sure this is in-sync with jobFilter-1.lua

export const SupportedFunctions: string[] = [
  'parseBool',
  'parseDate',
  'parseFloat',
  'parseInt',
  'toString',
  'isString',
  'isNumber',
  'isArray',
  'round',
  'trunc',
  'strcasecmp',
  'cmp',
];

// todo: Supported Methods

export const StringMethods = [
  'concat',
  'toLowerCase',
  'toUpperCase',
  'startsWith',
  'endsWith',
  'includes',
  'indexOf',
  'lastIndexOf',
  'charAt',
  'trim',
  'trimStart',
  'trimEnd',
  'toString',
  'valueOf',
  'substr',
  'substring',
  'split',
  'slice',
];

export const ArrayMethods = [
  'pop',
  'push',
  'concat',
  'shift',
  'unshift',
  'join',
  'indexOf',
  'includes',
  'includeAll',
  'slice',
  'min',
  'max',
  'avg',
];

export const DateMethods = [
  'getYear',
  'getMonth',
  'getDayOfMonth',
  'getDayOfWeek',
  'getDayOfYear',
  'getHour',
  'getMinutes',
  'getSeconds',
  'getTime',
  'rfc3339',
];
