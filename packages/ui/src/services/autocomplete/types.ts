
export type DefinitionType =
  | 'class'
  | 'constant'
  | 'enum'
  | 'function'
  | 'interface'
  | 'keyword'
  | 'method'
  | 'property'
  | 'text'
  | 'type'
  | 'variable'
  | 'param'
  | 'union';


export interface TypingResultBase {
  readonly type: DefinitionType;
  name: string;
  display?: string;
  description?: string;
}

export interface FunctionParameter extends TypingResultBase {
  readonly type: 'param';
  typeName: string;
}

export interface Callable extends TypingResultBase {
  returnType: string;
  params: FunctionParameter[];
}

export interface FunctionDef extends Callable {
  readonly type: 'function';
}

export interface Method extends Callable {
  readonly type: 'method';
}

interface Property extends TypingResultBase {
  readonly type: 'property';
  typeName: string;
  isConstant?: boolean;
}

export interface Variable extends TypingResultBase {
  readonly type: 'variable';
  typeName: string;
}

export interface TypeDefinition extends TypingResultBase {
  readonly type: 'type';
  fields: Property[];
  methods: Method[];
}

export type UnionType = TypingResultBase & {
  readonly type: 'union';
  types: Array<TypeDefinition>;
};

export type Definition = TypeDefinition | UnionType;
export type ClassMember = Method | Property;
export type Suggestible = TypeDefinition | ClassMember | Variable | FunctionDef;

export const isType = (x: unknown, t: DefinitionType): boolean => !!x && (x as TypingResultBase).type === t;
export const isTypeDefinition = (x: unknown): x is TypeDefinition => isType(x, 'type');
export const isUnionType = (x: unknown): x is UnionType => isType(x, 'union');
export const isMethodType = (x: unknown): x is Method => isType(x, 'method');
export const isCallable = (x: unknown): x is Callable => isType(x, 'method') || isType(x, 'function');
export const isProperty = (x: unknown): x is Property => isType(x, 'property');
export const isVariable = (x: unknown): x is Variable => isType(x, 'variable');
export const isClassType = (x: unknown): x is TypeDefinition => isType(x, 'class');
export const isParam = (x: unknown): x is FunctionParameter => isType(x, 'param');


function _method(m : Partial<Method>) : Method {
  return {
    type: 'method',
    name: '',
    returnType: 'string',
    params: [],
    ...m
  }
}

function _defun(m : Partial<FunctionDef>) : FunctionDef {
  return {
    type: 'function',
    name: '',
    returnType: 'string',
    params: [],
    ...m
  }
}

const StringDefinition: TypeDefinition = {
  type: 'type',
  name: 'string',
  fields: [{
    type: 'property',
    name: 'length',
    typeName: 'string',
    description: 'The length of the string.',
  }],
  methods: [
    _method({
      name: 'charAt',
      params: [{
        name: 'index',
        typeName: 'number',
        description: 'The index of the character to retrieve.',
        type: 'param'
      }],
      returnType: 'string',
      description: 'return the character at a given position in a string.',
    }),
    _method({
      name: 'concat',
      params: [{
        name: 'arg1',
        typeName: 'string',
        description: 'value to append to the string.',
        type: 'param'
      },{
        name: 'arg2',
        typeName: 'string',
        description: 'value to append to the string.',
        type: 'param'
      },{
        name: 'arg3',
        typeName: 'string',
        description: 'value to append to the string.',
        type: 'param'
      },{
        name: 'arg4',
        typeName: 'string',
        description: 'value to append to the string.',
        type: 'param'
      }],
      returnType: 'string',
      description:
        'combines one or more strings(argv1,v2 etc) into this existing one.',
    }),
    _method({
      name: 'toUpperCase',
      returnType: 'string',
      description: 'return the string with all of its characters converted to uppercase.',
    }),
    _method({
      name: 'toLowerCase',
      returnType: 'string',
      description:
        'return the string with all of its characters converted to uppercase.',
    }),
    _method({
      name: 'includes',
      returnType: 'boolean',
      description:
        'checks whether a string contains specified string or characters',
      params: [{ name: 'needle', typeName: 'string', type: 'param' }],
    }),
    _method({
      name: 'indexOf',
      returnType: 'number',
      description:
        'returns the index of a substring in a string, optionally ' +
        'starting at "start"',
      params: [
        { name: 'needle', typeName: 'string', type: 'param' },
        { name: 'start', typeName: 'number', type: 'param' },
      ],
    }),
    _method({
      name: 'lastIndexOf',
      returnType: 'number',
      description:
        'returns the last index of a substring in a string, optionally ' +
        'starting at "start"',
      params: [
        { name: 'needle', typeName: 'string', type: 'param' },
        { name: 'start', typeName: 'number', type: 'param' },
      ],
    }),
    _method({
      name: 'replace',
      returnType: 'string',
      description: 'replaces a substring in a string',
      params: [
        { name: 'substr', typeName: 'string', type: 'param' },
        { name: 'replacement', typeName: 'string', type: 'param' },
      ],
    }),
    _method({
      name: 'startsWith',
      returnType: 'string',
      description:
        'checks whether a string starts with specified string or characters',
      params: [{ name: 'needle', typeName: 'string', type: 'param' }],
    }),
    _method({
      name: 'strcasecmp',
      returnType: 'string',
      description: 'compare with another string ignoring case',
      params: [{ name: 'needle', typeName: 'string', type: 'param' }],
    }),
    _method({
      name: 'endsWith',
      returnType: 'string',
      description:
        'checks whether a string ends with specified string or characters',
      params: [{ name: 'needle', typeName: 'string', type: 'param' }],
    }),
    _method({
      name: 'substr',
      returnType: 'string',
      description:
        'returns the characters in a string beginning at "start" and includes ' +
        'the specified number of characters specified by "length". If "length" ' +
        'is omitted, all characters up to the end of the string are returned.',
      params: [
        { name: 'start', typeName: 'number', type: 'param' },
        { name: 'length', typeName: 'number', type: 'param' },
      ],
    }),
    _method({
      name: 'substring',
      returnType: 'string',
      description:
        'returns the characters in a string between “from” and “to” indexes, ' +
        'NOT including “to” itself. “To” is optional, and if omitted, up to ' +
        'the end of the string is assumed.',
      params: [
        { name: 'from', typeName: 'number', type: 'param' },
        { name: 'to', typeName: 'number', type: 'param' },
      ],
    }),
    _method({
      name: 'split',
      returnType: 'string',
      description:
        'splits a string according to a delimiter, returning an array with each element. ' +
        'The optional “limit” is an integer that lets you specify the maximum number ' +
        'of elements to return..',
      params: [
        { name: 'delimiter', typeName: 'string', type: 'param' },
        { name: 'limit', typeName: 'number', type: 'param' },
      ],
    }),
    _method({
      name: 'slice',
      returnType: 'string',
      description: 'extracts parts of a string',
      params: [
        { name: 'start', typeName: 'number', type: 'param' },
        { name: 'end', typeName: 'number', type: 'param' },
      ],
    }),
    _method({
      name: 'trim',
      returnType: 'string',
      description: 'removes whitespace from both ends of a string',
    }),
    _method({
      name: 'trimStart',
      returnType: 'string',
      description: 'removes whitespace from the start of a string',
    }),
    _method({
      name: 'trimEnd',
      returnType: 'string',
      description: 'removes whitespace from the ends of a string',
    }),
  ],
};

const NumberDefinition: TypeDefinition = {
  type: 'type',
  name: 'number',
  fields: [],
  methods: [{
    name: 'toString',
    type: 'method',
    returnType: 'string',
    description: 'return the value as a string.',
    params: [],
  }],
};

const BooleanDefinition: TypeDefinition = {
  type: 'type',
  name: 'boolean',
  fields: [],
  methods: [{
    name: 'toString',
    type: 'method',
    returnType: 'string',
    description: 'return the value as a string.',
    params: [],
  }],
};

const ArrayDefinition: TypeDefinition = {
  type: 'type',
  name: 'array',
  methods: [
    _method({
      name: 'pop',
      returnType: 'any',
      description: 'removes and returns the last element from an array',
    }),
    _method({
      name: 'push',
      returnType: 'any',
      description:
        'adds one or more elements to the end of an array and returns the new length of the array.',
      params: [{ name: 'element', typeName: 'any', type: 'param' }],
    }),
    _method({
      name: 'concat',
      returnType: 'array',
      description:
        'combines one or more arrays(argv1,v2 etc).',
      params: [
        { name: 'value0', typeName: 'any', type: 'param' },
        { name: 'value1', typeName: 'any', type: 'param' },
        { name: 'value2', typeName: 'any', type: 'param' },
        { name: 'value3', typeName: 'any', type: 'param' }
      ],
    }),
    _method({
      name: 'join',
      returnType: 'string',
      description:
        'creates and returns a new string by concatenating all of the elements in an array (or an array-like object), separated by commas or a specified separator string.',
      params: [
        { name: 'separator', typeName: 'string', type: 'param' },
      ],
    }),
    _method({
      name: 'shift',
      returnType: 'any',
      description:
        'The shift() method removes the first element from an array and returns that removed element. This method changes the length of the array.',
    }),
    _method({
      name: 'unshift',
      returnType: 'number',
      description:
        'The unshift() method adds one or more elements to the beginning of an array and returns the new length of the array.',
    }),
    _method({
      name: 'keys',
      returnType: 'array',
      description:'return the keys for each index in the array',
    }),
    _method({
      name: 'includes',
      returnType: 'boolean',
      description:
        'checks whether a string contains specified string or characters',
      params: [{ name: 'needle', typeName: 'string', type: 'param' }],
    }),
    _method({
      name: 'indexOf',
      returnType: 'number',
      description:
        'returns the index of an element in an array, optionally ' +
        'starting at "start"',
      params: [
        { name: 'needle', typeName: 'any', type: 'param' },
        { name: 'start', typeName: 'number', type: 'param' },
      ],
    }),
    _method({
      name: 'lastIndexOf',
      returnType: 'number',
      description:
        'returns the last index of an element in an array, optionally ' +
        'starting at "start"',
      params: [
        { name: 'needle', typeName: 'any', type: 'param' },
        { name: 'start', typeName: 'number', type: 'param' },
      ],
    }),
    _method({
      name: 'min',
      returnType: 'number',
      description:
        'returns the minimum value of the numeric elements in the array',
    }),
    _method({
      name: 'max',
      returnType: 'number',
      description:
        'returns the maximum value of the numeric elements in the array',
    }),
    _method({
      name: 'avg',
      returnType: 'number',
      description:
        'returns the average value of the numeric elements in the array',
    }),
  ],
  fields: [{
    type: 'property',
    name: 'length',
    typeName: 'number',
    description: 'The length of the array.',
  }],
};

const DateDefinition: TypeDefinition = {
  type: 'type',
  name: 'Date',
  fields: [],
  methods: [
    _method({
      name: 'getTime',
      returnType: 'number',
      description: 'returns the time value in milliseconds',
    }),
    _method({
      name: 'getDate',
      returnType: 'number',
      description: 'returns the day of the month',
    }),
    _method({
      name: 'getMonth',
      returnType: 'number',
      description: 'returns the month of the year',
    }),
    _method({
      name: 'getDay',
      returnType: 'number',
      description: 'returns the day of the week',
    }),
    _method({
      name: 'getFullYear',
      returnType: 'number',
      description: 'returns the year',
    }),
    _method({
      name: 'getHours',
      returnType: 'number',
      description: 'returns the hour',
    }),
    _method({
      name: 'getMinutes',
      returnType: 'number',
      description: 'returns the minutes',
    }),
    _method({
      name: 'getSeconds',
      returnType: 'number',
      description: 'returns the seconds',
    }),
    _method({
      name: 'getMilliseconds',
      returnType: 'number',
      description: 'returns the milliseconds',
    }),
    _method({
      name: 'getTimezoneOffset',
      returnType: 'number',
      description: 'returns the timezone offset',
    }),
    _method({
      name: 'getUTCDate',
      returnType: 'number',
      description: 'returns the day of the month in UTC',
    }),
    _method({
      name: 'getUTCMonth',
      returnType: 'number',
      description: 'returns the month of the year in UTC',
    }),
    _method({
      name: 'getUTCDay',
      returnType: 'number',
      description: 'returns the day of the week in UTC',
    }),
    _method({
      name: 'getUTCFullYear',
      returnType: 'number',
      description: 'returns the year in UTC',
    }),
    _method({
      name: 'getUTCHours',
      returnType: 'number',
      description: 'returns the hour in UTC',
    }),
    _method({
      name: 'getUTCMinutes',
      returnType: 'number',
      description: 'returns the minutes in UTC',
    }),
    _method({
      name: 'getUTCSeconds',
      returnType: 'number',
      description: 'returns the seconds in UTC',
    }),
    _method({
      name: 'getUTCMilliseconds',
      returnType: 'number',
      description: 'returns the milliseconds in UTC',
    }),
    _method({
      name: 'getYear',
      returnType: 'number',
      description: 'returns the year in local time',
    }),
    _method({
      name: 'getDayOfYear',
      returnType: 'number',
      description: 'returns the day of the year',
    }),
    _method({
      name: 'getTime',
      returnType: 'number',
      description: 'returns the epoch milliseconds of the date instance',
    }),
    _method({
      name: 'rfc3339',
      returnType: 'string',
      description: 'return the date as a string in RFC3339 format',
    }),
  ],
};

const MathVarargParams: FunctionParameter[] = [
  { name: 'x0', typeName: 'number', type: 'param' },
  { name: 'x1', typeName: 'number', type: 'param' },
  { name: 'x2', typeName: 'number', type: 'param' },
  { name: 'x3', typeName: 'number', type: 'param' },
  { name: 'x4', typeName: 'number', type: 'param' },
  { name: 'x5', typeName: 'number', type: 'param' },
  { name: 'x6', typeName: 'number', type: 'param' },
  { name: 'x7', typeName: 'number', type: 'param' },
];

const MathGlobalDefinition: TypeDefinition = {
  type: 'type',
  name: 'Math',
  fields: [{
    type: 'property',
    name: 'PI',
    isConstant: true,
    typeName: 'number',
    description: '3.124....',
  }],
  methods: [
    _method({
      name: 'abs',
      returnType: 'number',
      description: 'returns the absolute value of a number',
      params: [{ name: 'x', typeName: 'number', type: 'param' }],
    }),
    _method({
      name: 'acos',
      returnType: 'number',
      description: 'returns the arccosine of a number',
      params: [{ name: 'x', typeName: 'number', type: 'param' }],
    }),
    _method({
      name: 'atan',
      returnType: 'number',
      description: 'return the arc tangent of the argument.',
      params: [{ name: 'x', typeName: 'number', type: 'param' }],
    }),
    _method({
      name: 'ceil',
      returnType: 'number',
      description: 'rounds a number up to the next largest integer.',
      params: [
        { name: 'x', typeName: 'number', type: 'param' },
      ],
    }),
    _method({
      name: 'cos',
      returnType: 'number',
      description: 'returns the cosine of the argument.',
      params: [
        { name: 'x', typeName: 'number', type: 'param' },
      ],
    }),
    _method({
      name: 'exp',
      returnType: 'number',
      description: 'returns e to the power of the argument.',
      params: [
        { name: 'x', typeName: 'number', type: 'param' },
      ],
    }),
    _method({
      name: 'floor',
      returnType: 'number',
      description: 'rounds a number down to the next largest integer.',
      params: [
        { name: 'x', typeName: 'number', type: 'param' },
      ],
    }),
    _method({
      name: 'log',
      returnType: 'number',
      description: 'returns the natural logarithm (base e) of a number.',
      params: [
        { name: 'x', typeName: 'number', type: 'param' },
      ],
    }),
    _method({
      name: 'max',
      returnType: 'number',
      description: 'returns the largest of two or more numbers.',
      params: MathVarargParams,
    }),
    _method({
      name: 'min',
      returnType: 'number',
      description: 'returns the smallest of two or more numbers.',
      params: MathVarargParams,
    }),
    _method({
      name: 'pow',
      returnType: 'number',
      description: 'returns the base to the exponent power, that is, base^exponent.',
      params: [
        { name: 'base', typeName: 'number', type: 'param' },
        { name: 'exponent', typeName: 'number', type: 'param' },
      ],
    }),
    _method({
      name: 'round',
      returnType: 'number',
      description: 'rounds a number to a given number of decimal places',
      params: [
        { name: 'n', typeName: 'string', type: 'param' },
        { name: 'places', typeName: 'number', type: 'param' },
      ],
    }),
    _method({
      name: 'sin',
      returnType: 'number',
      description: 'returns the sine of the argument.',
      params: [
        { name: 'x', typeName: 'number', type: 'param' },
      ],
    }),
    _method({
      name: 'sqrt',
      returnType: 'number',
      description: 'returns the square root of a number.',
      params: [
        { name: 'x', typeName: 'number', type: 'param' },
      ],
    }),
    _method({
      name: 'tan',
      returnType: 'number',
      description: 'returns the tangent of the argument.',
      params: [
        { name: 'x', typeName: 'number', type: 'param' },
      ],
    }),
    _method({
      name: 'log10',
      returnType: 'number',
      description: 'returns the log10 of a number',
      params: [
        { name: 'x', typeName: 'number', type: 'param' },
      ],
    }),
    _method({
      name: 'trunc',
      returnType: 'number',
      description: 'truncates a number to a given number of decimal places',
      params: [
        { name: 'n', typeName: 'string', type: 'param' },
        { name: 'places', typeName: 'number', type: 'param' },
      ],
    }),
    _method({
      name: 'sign',
      returnType: 'number',
      description:
        'returns the sign of a number: ' +
        '  -1 for numbers below zero, ' +
        '  1 for positive numbers, and ' +
        '  0 for zero',
      params: [{ name: 'x', typeName: 'number', type: 'param' }],
    }),
  ],
};

const DateGlobal: TypeDefinition = {
  type: 'type',
  name: 'DateGlobal',
  fields: [],
  methods: [
    _method({
      name: 'parse',
      returnType: 'Date',
      description: 'convert a value to a date',
      params: [{ name: 'dateString', typeName: 'string', type: 'param' }],
    }),
    _method({
      name: 'UTC',
      returnType: 'number',
      description: 'creates a date based on component parts',
      params: [
        { name: 'year', typeName: 'number', type: 'param' },
        { name: 'month', typeName: 'number', type: 'param' },
        { name: 'day', typeName: 'number', type: 'param' },
        { name: 'hours', typeName: 'number', type: 'param' },
        { name: 'minutes', typeName: 'number', type: 'param' },
        { name: 'seconds', typeName: 'number', type: 'param' },
        { name: 'ms', typeName: 'number', type: 'param' },
      ],
    }),
  ]
};

const JSONGlobalDefinition: TypeDefinition = {
  type: 'type',
  name: 'JSON',
  methods: [
    _method({
      name: 'parse',
      returnType: 'object',
      description: 'parse a JSON string',
      params: [{ name: 'jsonString', typeName: 'string', type: 'param' }],
    }),
    _method({
      name: 'stringify',
      returnType: 'string',
      description: 'converts an object to a object',
      params: [{ name: 'obj', typeName: 'object', type: 'param' }],
    }),
  ],
  fields: [],
};

const ObjectDefinition: TypeDefinition = {
  type: 'type',
  name: 'Object',
  methods: [
    _method({
      name: 'keys',
      returnType: 'array',
      description: 'Returns an array containing the names of all of the given object\'s own enumerable string properties.',
    }),
    _method({
      name: 'values',
      returnType: 'array',
      description: 'Returns an array containing the values that correspond to all of a given object\'s own string properties.',
    }),
    _method({
      name: 'entries',
      returnType: 'array',
      description: 'Returns an array containing all of the [key, value] pairs of a given object\'s own enumerable string properties.',
    }),
  ],
  fields: [],
};

const JobDefinition: TypeDefinition = {
  type: 'type',
  name: 'Job',
  methods: [],
  fields: [{
    type: 'property',
    name: 'id',
    typeName: 'string',
    description: 'The job id.',
  },
    {
      type: 'property',
      name: 'name',
      typeName: 'string',
      description: 'The job name.',
  },
    {
      type: 'property',
      name: 'timestamp',
      typeName: 'number',
      description: 'the job creation timestamp.',
    },
    {
      type: 'property',
      name: 'processedOn',
      typeName: 'number',
      description: 'timestamp when job started processing.',
    },
    {
      type: 'property',
      name: 'finishedOn',
      typeName: 'number',
      description: 'timestamp when job finished processing.',
    },
    {
      type: 'property',
      name: 'latency',
      typeName: 'number',
      description: 'the runtime of the job.',
    },
    {
      type: 'property',
      name: 'waitTime',
      typeName: 'number',
      description: 'the time between between becoming active and starting processing.',
    },
    {
      type: 'property',
      name: 'attemptsMade',
      typeName: 'number',
      description: 'the number of times the job was attempted.',
    },
    {
      type: 'property',
      name: 'progress',
      typeName: 'number',
      description: 'the progress of the job.',
    },
    {
      type: 'property',
      name: 'stacktrace',
      typeName: 'array',
      description: 'the stack trace of the job in case of error.',
    },
    {
      type: 'property',
      name: 'returnvalue',
      typeName: 'object',
      description: 'the value returned by the job.',
    },
    {
      type: 'property',
      name: 'failedReason',
      typeName: 'string',
      description: 'a description message of why the job failed.',
    },
    {
      type: 'property',
      name: 'data',
      typeName: 'object',
      description: 'the job data.',
    },
    {
      type: 'property',
      name: 'opts',
      typeName: 'object', // todo
      description: 'the job options.',
    },
  ],
};

const JobRepeatOptions: TypeDefinition = {
  type: 'type',
  name: 'JobRepeatOptions',
  methods: [],
  fields: [
    {
      type: 'property',
      name: 'tz',
      typeName: 'string',
      description: 'The timezone to use for the repeat options.',
    },
    {
      type: 'property',
      name: 'startDate',
      typeName: 'string',
      description: 'Start date when the repeat job should start repeating (only with cron).',
    },
    {
      type: 'property',
      name: 'endDate',
      typeName: 'string',
      description: 'End date when the repeat job should stop repeating.',
    },
    {
      type: 'property',
      name: 'cron',
      typeName: 'string',
      description: 'A cron pattern',
    },
    {
      type: 'property',
      name: 'every',
      typeName: 'number',
      description: 'Repeat after this amount of milliseconds (cron setting cannot be used together with this setting.)',
    },
    {
      type: 'property',
      name: 'repeatExpression',
      typeName: 'string',
      description: 'The repeat expression of the repeat options.',
    },
    {
      type: 'property',
      name: 'repeatLimit',
      typeName: 'number',
      description: 'The repeat limit of the repeat options.',
    },
    {
      type: 'property',
      name: 'prevMillis',
      typeName: 'number',
    },
    {
      type: 'property',
      name: 'limit',
      typeName: 'number',
      description: 'Number of times the job should repeat at max.',
    },
    {
      type: 'property',
      name: 'count',
      typeName: 'number',
      description: 'The start value for the repeat iteration count.',
    },
  ],
};

const JobRemoveOptionDefinition: UnionType = {
  type: 'union',
  name: 'JobRemoveOption',
  types: [BooleanDefinition, NumberDefinition],
};

const JobOptionsDefinition: TypeDefinition = {
  type: 'type',
  name: 'JobOptions',
  methods: [],
  fields: [
    {
      type: 'property',
      name: 'attempts',
      typeName: 'number',
      description:
        'The total number of attempts to try the job until it completes.',
    },
    {
      type: 'property',
      name: 'backoff',
      typeName: 'number',
      description:
        'Backoff setting for automatic retries if the job fails.',
    },
    {
      type: 'property',
      name: 'delay',
      typeName: 'number',
      description: 'An amount of milliseconds to wait until this job can be processed.\n ' +
        'Note that for accurate delays, worker and producers should have their clocks synchronized.',
    },
    {
      type: 'property',
      name: 'jobId',
      typeName: 'string',
      description: 'Overridden job ID',
    },
    {
      type: 'property',
      name: 'lifo',
      typeName: 'boolean',
      description: 'If true, jobs will be processed in LIFO order.',
    },
    {
      type: 'property',
      name: 'timestamp',
      typeName: 'number',
      description: 'Timestamp when the job was created. Defaults to Date.now().',
    },
    {
      type: 'property',
      name: 'priority',
      typeName: 'number',
      description: 'Ranges from 1 (highest priority) to MAX_INT (lowest priority).'
    },
    {
      type: 'property',
      name: 'parent',
      typeName: 'object', // todo: create type for this  { id: string; queue: string; }
      description: 'Parent key.',
    },
    {
      type: 'property',
      name: 'rateLimiterKey',
      typeName: 'string',
      description: 'Rate limiter key to use if rate limiter enabled..',
    },
    {
      type: 'property',
      name: 'removeOnComplete',
      typeName: 'string',
      description: 'Determines if and hoe many jobs to remove on completion..',
    },
    {
      type: 'property',
      name: 'removeOnFail',
      typeName: 'string',
      description: 'If true, removes the job when it fails after all attempts. When given an number, it specifies the maximum amount of jobs to keep.',
    },
    {
      type: 'property',
      name: 'sizeLimit',
      typeName: 'string',
      description: 'Limits the size in bytes of the job\'s data payload (as a JSON serialized string)..',
    },
    {
      type: 'property',
      name: 'stackTraceLimit',
      typeName: 'string',
      description: ' Limits the amount of stack trace lines that will be recorded in the stacktrace.',
    }
  ],
};

export const TypesInformation = [
  StringDefinition,
  BooleanDefinition,
  NumberDefinition,
  ArrayDefinition,
  DateDefinition,
  JobDefinition,
  JobOptionsDefinition,
  JobRemoveOptionDefinition,
  JobRepeatOptions,
  MathGlobalDefinition,
  JSONGlobalDefinition,
  DateGlobal,
  ObjectDefinition
];

export const Functions: FunctionDef[] = [
  _defun({
    name: 'parseBoolean',
    returnType: 'boolean',
    params: [{ name: 'value', typeName: 'any', type: 'param' }],
  }),
  _defun({
    name: 'parseInt',
    returnType: 'number',
    params: [{ name: 'value', typeName: 'any', type: 'param' }],
  }),
  _defun({
    name: 'parseDate',
    returnType: 'Date',
    params: [{ name: 'value', typeName: 'any', type: 'param' }],
  }),
  _defun({
    name: 'parseString',
    returnType: 'string',
    params: [{ name: 'value', typeName: 'any', type: 'param' }],
  }),
  _defun({
    name: 'toString',
    returnType: 'boolean',
    params: [{ name: 'value', typeName: 'any', type: 'param' }],
    description: 'Converts a value to a string.',
  }),
  _defun({
    name: 'isString',
    returnType: 'boolean',
    params: [{ name: 'value', typeName: 'any', type: 'param' }],
    description: 'Returns true if a value is a string.',
  }),
  _defun({
    name: 'isNumber',
    returnType: 'boolean',
    params: [{ name: 'value', typeName: 'any', type: 'param' }],
    description: 'Returns true if a value is a number.',
  }),
  _defun({
    name: 'isArray',
    returnType: 'boolean',
    params: [{ name: 'value', typeName: 'any', type: 'param' }],
    description: 'Returns true if a value is an array.',
  }),
  _defun({
    name: 'isEmpty',
    returnType: 'boolean',
    params: [{ name: 'value', typeName: 'any', type: 'param' }],
    description: 'Returns true if a value is empty.',
  }),
  _defun({
    name: 'isNaN',
    returnType: 'boolean',
    params: [{ name: 'value', typeName: 'any', type: 'param' }],
    description: 'Returns true if a value is NaN.',
  }),
  _defun({
    name: 'ms',
    returnType: 'boolean',
    params: [{ name: 'value', typeName: 'any', type: 'param' }],
    description: 'convert various time formats to milliseconds.',
  }),
  _defun({
    name: 'strcasecmp',
    returnType: 'number',
    params: [
      { name: 'str1', typeName: 'string', type: 'param'},
      { name: 'str2', typeName: 'string', type: 'param' },
    ],
    description: 'compare strings without case sensitivity.',
  })
];

export const Variables: Record<string, Variable> = {
  Object: {
    type: 'variable',
    name: 'Object',
    typeName: 'object',
    description: 'The Object class represents one of JavaScript\'s data types. It is used to store various keyed collections and more complex entities. .',
  },
  Date: {
    type: 'variable',
    name: 'Date',
    typeName: 'Date',
    description: 'The Date constructor.',
  },
  job: {
    type: 'variable',
    name: 'job',
    typeName: 'Job',
    description: 'represents the job being filtered.',
  },
  'this': {
    type: 'variable',
    name: 'job',
    typeName: 'Job',
    description: 'represents the job being filtered.',
  },
  JSON: {
    type: 'variable',
    name: 'JSON',
    typeName: 'JSON',
  },
  Math: {
    type: 'variable',
    name: 'Math',
    typeName: 'Math',
    description: 'Math is a built-in object that has properties and methods for mathematical constants and functions. It’s not a function object.',
  }
}

export const ClassMap: Record<string, TypeDefinition>= {
  Job: JobDefinition,
  JobOptions: JobOptionsDefinition,
  JobRepeatOptions,
  Math: MathGlobalDefinition,
  Date: DateGlobal,
  string: StringDefinition,
  String: StringDefinition,
  boolean: BooleanDefinition,
  array: ArrayDefinition,
  number: NumberDefinition,
  object: ObjectDefinition,
};

export const GlobalsMap: Record<string, Suggestible> = {
  ...Variables
};

Functions.forEach(f => {
  GlobalsMap[f.name] = f;
});
