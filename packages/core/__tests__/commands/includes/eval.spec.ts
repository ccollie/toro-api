import { clearDb, createClient } from '../../factories';
import ms from 'ms';
import { loadIncludeScript, compileExpression, Command } from '../utils';

const Person = {
  _id: '100',
  firstName: 'Francis',
  lastName: 'Asante',
  username: 'kofrasa',
  title: 'Software Engineer',
  degree: 'Computer Science',
  jobs: 6,
  isActive: true,
  date: {
    year: 2013,
    month: 9,
    day: 25,
  },
  languages: {
    spoken: ['english', 'french', 'spanish'],
    programming: ['C', 'Python', 'Scala', 'Java', 'Javascript', 'Bash', 'C#'],
  },
  circles: {
    school: [
      'Kobby',
      'Henry',
      'Kanba',
      'Nana',
      'Albert',
      'Yayra',
      'Linda',
      'Sophia',
    ],
    work: ['Kobby', 'KT', 'Evans', 'Robert', 'Ehi', 'Ebo', 'KO'],
    family: ['Richard', 'Roseline', 'Michael', 'Rachel'],
  },
  projects: {
    C: ['word_grid', 'student_record', 'calendar'],
    Java: ['Easy Programming Language', 'SurveyMobile'],
    Python: ['Kasade', 'Code Jam', 'Flaskapp', 'FlaskUtils'],
    Scala: [],
    Javascript: ['mingo', 'Backapp', 'BackboneApp', 'Google Election Maps'],
  },
  grades: [
    { grade: 92, mean: 88, std: 8 },
    { grade: 78, mean: 90, std: 5 },
    { grade: 88, mean: 85, std: 3 },
  ],
  retirement: null,
  today: '1970-01-01',
};

function quote(source: string): string {
  return '\'' + source.replace(/([^'\\]*(?:\\.[^'\\]*)*)'/g, '$1\\\'') + '\'';
}

function createTestScript(include: string): string {
  return `
    ${include}

    local expression = cjson.decode(ARGV[1])
    local context = ARGV[2]

    if (type(context) == 'string') and #context > 0 then
      context = cjson.decode(context)
    else 
      context = {}
    end
    
    return evalExpression(expression, context)
  `;
}

const isPrimitive = (val: unknown) => {
  if (val === null) {
    return true;
  }
  return !(typeof val == 'object' || typeof val == 'function');
};

describe('eval.lua', () => {
  let client;
  let command: Command;

  beforeAll(async () => {
    const script = await loadIncludeScript('eval.lua');
    const lua = createTestScript(script);

    command = {
      name: 'exprEval',
      options: { numberOfKeys: 0, lua },
    };
  });

  beforeEach(async () => {
    client = await createClient(null, false);
    await clearDb(client);
    client.defineCommand(command.name, command.options);
  });

  afterEach(async () => {
    // await clearDb(client);
    return client.quit();
  });

  async function evalExpression(
    expression: string,
    context?: Record<string, unknown>,
  ): Promise<unknown> {
    const { compiled } = compileExpression(expression);
    const criteria = JSON.stringify(compiled);
    const data = context ? JSON.stringify(context) : '';
    const val = await (client as any).exprEval(criteria, data);
    if (val !== null && val !== undefined) {
      return JSON.parse(val);
    }
    return val;
  }

  async function checkExpression(
    expression: string,
    expectedValue: any,
    context: Record<string, unknown> | null = {},
    expectMatch = true,
  ) {
    const res = await evalExpression(expression, context);

    if (expectedValue === null) {
      expect(res).toBeNull();
      return;
    }
    if (isPrimitive(expectedValue)) {
      if (expectMatch) {
        expect(res).toBe(expectedValue);
      } else {
        expect(res).not.toBe(expectedValue);
      }
    } else {
      if (Array.isArray(expectedValue)) {
        if (expectMatch) {
          expect(res).toStrictEqual(expectedValue);
        } else {
          expect(res).not.toStrictEqual(expectedValue);
        }
      } else {
        if (expectMatch) {
          expect(res).toMatchObject(expectedValue);
        } else {
          expect(res).not.toMatchObject(expectedValue);
        }
      }
    }
  }

  async function checkNumberExpression(
    expression: string,
    expected: number,
    context?: Record<string, any>,
  ) {
    const res = await evalExpression(expression, context);
    expect(res).toBeCloseTo(expected, 12);
  }

  function testOperator(operator, cases) {
    test.each(cases)(`${operator}: %p`, async (left, right, expected) => {
      const data = {};
      let filter: string;

      if (expected === undefined) {
        expected = right;
        data['value'] = left;
        filter = `${operator} data.value`;
      } else {
        data['left'] = left;
        data['right'] = right;
        filter = `data.left ${operator} data.right`;
      }

      const context = { data };
      await checkExpression(filter, expected, context);
    });
  }

  function quoteValue(x): string {
    if (x === null) return 'null';
    return typeof x === 'string' ? quote(x) : JSON.stringify(x);
  }

  function formatFunction(
    name: string,
    args: any | any[] | undefined | number,
  ): string {
    let argStr = '';
    if (args !== undefined) {
      const _args = Array.isArray(args) ? args : [args];
      argStr = _args.map(quoteValue).join(', ');
    }
    return `${name}(${argStr})`;
  }

  async function testMethodOnce(name, value, args, expected?: any) {
    if (expected === undefined) {
      expected = args;
      args = undefined;
    }
    const data = {
      value,
      expected,
    };
    const expression = `value.${formatFunction(name, args)}`;

    await checkExpression(expression, expected, data);
  }

  async function testFunctionOnce(name, args, expected) {
    const expression = formatFunction(name, args);
    await checkExpression(expression, expected, null);
  }

  function testMethod(name, cases) {
    test.each(cases)(`${name}: %p`, async (value, args, expected) => {
      await testMethodOnce(name, value, args, expected);
    });
  }

  function testFunction(name, cases) {
    test.each(cases)(`${name}: %p`, async (args, expected) => {
      await testFunctionOnce(name, args, expected);
    });
  }

  describe('Basic field access', () => {
    it('can do member access', async () => {
      await checkExpression('user._id != null', true, { user: Person });
    });
  });

  describe('Binary Operators', () => {
    async function check(expression: string): Promise<void> {
      const context = { user: Person };
      return checkExpression(expression, true, context);
    }

    test('==', async () => {
      await check('user.firstName == "Francis"');
    });

    test('== with objects in a given position in an array with dot notation', async () => {
      await check('user.grades[0].grade == 92');
    });

    test('=~', async () => {
      await check('user.lastName =~ "a.+e"');
    });

    test('!=', async () => {
      await check('user.username != "mufasa"');
    });

    test('>', async () => {
      await check('user.jobs > 1');
    });

    test('>=', async () => {
      await check('user.jobs >= 6');
    });

    test('<', async () => {
      await check('user.jobs < 10');
    });

    test('<=', async () => {
      await check('user.jobs <= 6');
    });

    test('can compare value inside array at a given index', async () => {
      await check('user.projects.C[1] == "student_record"');
    });

    test('%', async () => {
      await check('user.date.month % 8 == 1');
    });

    describe('??', () => {
      test('returns alternate when lvalue is null', async () => {
        await check('(user.missing_value ?? 100) == 100');
      });

      test('returns falsy non-null values', async () => {
        await checkExpression('0 ?? 2', 0);
        // await checkExpression('"" ?? 5', '');
      });
    });
  });

  describe('Unary operators', () => {
    const context = { user: Person };
    test('!', async () => {
      await checkExpression('!user.isActive', false, context);
    });

    test('!!', async () => {
      await checkExpression('!!user.languages.programming', true, context);
      await checkExpression('!!user.missing_value', false, context);
    });
  });

  describe('Logical Operators', function () {
    const context = { user: Person };

    async function check(
      expression: string,
      returnsTrue = true,
    ): Promise<void> {
      return checkExpression(expression, returnsTrue, context);
    }

    describe('&&', () => {
      test('can use conjunction true && true', async () => {
        await check('user.firstName == "Francis" && user.lastName == "Asante"');
      });

      test('true && false', async () => {
        await check(
          'user.firstName == "Francis" && user.lastName == "Amoah"',
          false,
        );
      });

      test('false && true', async () => {
        await check(
          'user.firstName == "Enoch" && user.lastName == "Asante"',
          false,
        );
      });

      test('false && false', async () => {
        await check('user.firstName == "Enoch" && !!user.age', false);
      });
    });

    describe('||', () => {
      test('true OR true', async () => {
        await check('user.firstName == "Francis" || user.lastName =~ "^%a.+e"');
      });

      test('true || false', async () => {
        await check('user.firstName == "Francis" || user.lastName == "Amoah"');
      });

      test('false OR true', async () => {
        await check('user.firstName == "Enoch" || user.lastName == "Asante"');
      });
    });

    test('false OR false', async () => {
      await check('user.firstName == "Enoch" || user.age != null', false);
    });
  });

  describe('Array access', function () {
    describe('selector tests', () => {
      const data = {
        key0: {
          key1: [
            [
              {
                key2: [{ a: 'value2' }, { a: 'dummy' }, { b: 20 }],
              },
            ],
            { key2: 'value' },
          ],
          key1a: { key2a: 'value2a' },
        },
      };

      const context = { data };

      // eslint-disable-next-line max-len
      test('deep matching on nested value', async () => {
        await checkExpression('data.key0.key1[0][0].key2.a', 'value2', context);
      });

      test('should match with full array index selector to nested value', async () => {
        await checkExpression('data.key0.key1[1].key2', 'value', context);
      });

      test('should match shallow nested value with array index selector', async () => {
        await checkExpression('data.key0.key1[1].key2', 'value', context);
      });
    });
  });

  describe('Ternary Operator', () => {
    test('supports ternary operator', async () => {
      const context = { score: 35, highScore: 20 };
      const conditional = '(score > highScore) ? "champ" : "runner-up"';
      await checkExpression(conditional, 'champ', context);
    });

    test('handles complex expressions', async () => {
      const data = { _id: 1, item: 'binder', qty: 100, price: 12 };

      const expression =
        'data.qty >= 100 ? (data.price / 2) : (data.price / 4)';
      const expected = data.qty >= 100 ? data.price / 2 : data.price / 4;
      await checkExpression(expression, expected, { data });
    });
  });

  describe('Arithmetic Operators', () => {
    describe('+', () => {
      const cases = [
        [10, 2, 12],
        [-1, 5, 4],
        [-3, -7, -10],
      ];
      testOperator('+', cases);
    });

    describe('-', () => {
      const cases = [
        [-1, -1, 0],
        [-1, 2, -3],
        [2, -1, 3],
      ];
      testOperator('-', cases);
    });

    describe('*', () => {
      const cases = [
        [5, 10, 50],
        [-2, 4, -8],
        [-3, -3, 9],
      ];
      testOperator('*', cases);
    });

    describe('/', () => {
      const cases = [
        [80, 4, 20],
        [1.5, 3, 0.5],
        [40, 8, 5],
      ];
      testOperator('/', cases);
    });

    describe('%', () => {
      const cases = [
        [80, 7, 3],
        [40, 4, 0],
      ];
      testOperator('%', cases);
    });
  });

  describe('Strings', () => {
    test('length', async () => {
      await checkExpression('user.title.length', Person.title.length, {
        user: Person,
      });
    });

    test('toLowerCase', async () => {
      await checkExpression(
        'user.firstName.toLowerCase()',
        Person.firstName.toLowerCase(),
        { user: Person },
      );
    });

    test('toUpperCase', async () => {
      await checkExpression(
        'user.firstName.toUpperCase()',
        Person.firstName.toUpperCase(),
        { user: Person },
      );
    });

    describe('startsWith', () => {
      const cases = [
        ['hyperactive', 'hyper', true],
        ['milliseconds', 'not-prefix', false],
      ];
      testMethod('startsWith', cases);
    });

    describe('endsWith', () => {
      const cases = [
        ['hyperactive', 'active', true],
        ['milliseconds', 'minutes', false],
      ];
      testMethod('endsWith', cases);
    });

    describe('includes', () => {
      const cases = [
        ['super hyperactive', 'hyper', true],
        ['should not', 'be found"', false],
        ['source', 4, false],
      ];
      testMethod('includes', cases);
    });

    describe('strcasecmp', () => {
      const cases = [
        ['13Q1', '13q4', -1],
        ['13Q4', '13q4', 0],
        ['14Q2', '13q4', 1],
      ];
      testMethod('strcasecmp', cases);
    });

    describe('substr', () => {
      const cases = [
        ['hello', [0, 1], 'h'],
        ['hello', -1, 'o'],
        ['hello', [1, -2], ''],
        ['abcde', [1, 2], 'bc'],
        ['Hello World!', [6, 5], 'World'],
        ['cafeteria', [0, 5], 'cafet'],
        ['cafeteria', [5, 4], 'eria'],
        ['cafeteria', [7, 3], 'ia'],
        ['cafeteria', [3, 1], 'e'],
      ];
      testMethod('substr', cases);
    });

    describe('substring', () => {
      const cases = [
        ['hello', -1, 'o'],
        ['hexagram', -4, 'gram'],
        ['abcde', [1, 2], 'bc'],
        ['Hello World!', [6, 10], 'World'],
        ['cafeteria', [0, 4], 'cafet'],
        ['mandioca', [1, -4], 'andi'],
        ['cafeteria', [3, 3], 'e'],
        ['Hello World!', [-11, -8], 'ello'],
      ];
      testMethod('substring', cases);
    });

    describe('concat', () => {
      const cases = [['b-', ['a', '-', 'c'], 'b-a-c']];
      testMethod('concat', cases);
    });

    describe('indexOf', () => {
      const cases = [
        ['finding substring in string', 'str', 11],
        ['test case sensitivity', 'CASE', -1],
        ['cafeteria', 'e', 3],
        ['cafétéria', 'é', 3],
        ['cafétéria', 'e', -1],
        ['foo.bar.fi', ['.', 5], 7],
        ['foo.bar.fi', ['.', -3], 7],
        ['vanilla', ['ll', 12], -1],
        ['vanilla', ['ll', 5], -1],
      ];
      testMethod('indexOf', cases);
    });

    describe('lastIndexOf', () => {
      it('locates the last occurrence', async () => {
        await testMethodOnce('lastIndexOf', 'Javascript', 'a', 3);
      });

      it('locates the last occurrence using a start index', async () => {
        await testMethodOnce('lastIndexOf', 'Javascript', ['a', 2], 3);
      });

      it('is case-sensitive', async () => {
        await testMethodOnce('lastIndexOf', 'Hello World!', 'L', -1);
      });
    });

    describe('split', () => {
      const cases = [
        ['June-15-2013', '-', ['June', '15', '2013']],
        ['banana split', 'a', ['b', 'n', 'n', ' split']],
        ['Hello World', ' ', ['Hello', 'World']],
        ['astronomical', 'astro', ['', 'nomical']],
        ['pea green boat', 'owl', ['pea green boat']],
      ];
      testMethod('split', cases);
    });

    describe('trim', () => {
      it('trims space chars by default', async () => {
        const value = '  \n good  bye \t  ';
        const context = { value };
        await checkExpression('value.trim()', 'good  bye', context);
      });

      it('trims chars passed as parameter', async () => {
        const value = ' ggggoodbyeeeee';
        const context = { value };
        await checkExpression('value.trim("ge")', ' ggggoodby', context);
        await checkExpression('value.trim(" ge")', 'oodby', {
          value: '    ggggoodbyeeeee'
        });
      });
    });

    describe('trimStart', () => {
      it('trims space chars by default', async () => {
        const value = '  \t\n good  bye \t  ';
        const context = { value };
        await checkExpression('value.trimStart()', 'good  bye \t  ', context);
      });

      it('trims chars passed as parameter', async () => {
        await checkExpression('value.trimStart("ge")', ' ggggoodbyeeeee', {
          value: ' ggggoodbyeeeee'
        });
        await checkExpression('value.trimStart(" gd")', 'oodbyeeeee ', {
          value: '    ggggoodbyeeeee '
        });
      });
    });

    describe('trimEnd', () => {
      it('trims space chars by default', async () => {
        const value = '  \n good  bye \n\t  ';
        const context = { value };
        await checkExpression('value.trimEnd()', '  \n good  bye', context);
      });

      it('trims chars passed as parameter', async () => {
        await checkExpression('value.trimEnd("ge")', ' ggggoodby', {
          value: ' ggggoodbyeeeee'
        });
        await checkExpression('value.trimEnd("e ")', ' ggggoodby', {
          value: ' ggggoodbyeeeee    '
        });
      });
    });

    describe('slice', () => {
      const text = 'The quick brown fox jumps over the lazy dog.';
      const context = { text };

      it('works with only a starting index', async () => {
        await checkExpression(
          'text.slice(31)',
          'the lazy dog.',
          context,
        );
      });

      it('works with a start and end index', async () => {
        await checkExpression(
          'text.slice(4, 19)',
          'quick brown fox',
          context,
        );
      });

      it('handles negative indices', async () => {
        await checkExpression('text.slice(-4)', 'dog.', context);

        await checkExpression('text.slice(-9, -5)', 'lazy', context);
      });
    });
  });

  describe('Date', () => {
    const SAMPLE_DATE_STRING = '2014-01-01T08:15:39.736Z';
    const SampleDate = new Date(SAMPLE_DATE_STRING);

    async function checkDateMethod(method, date = SampleDate) {
      const expected = date[method]();
      const context = { data: { date, expected } };
      const expression = `Date.parse(data.date).${method}()`;
      await checkExpression(expression, expected, context);
    }

    async function validateDate(date = SampleDate): Promise<void> {
      const Methods = [
        'getFullYear',
        'getMonth',
        'getDate',
        'getDayOfYear',
        'getHours',
        'getMinutes',
        'getSeconds',
      ];
    }

    describe('parse', () => {
      it('converts an RFC-3339 date string', async () => {
        const dateValue = SampleDate.getTime();
        const context = { data: { date: SAMPLE_DATE_STRING, dateValue } };
        const condition = 'Date.parse(data.date) != null';
        await checkExpression(condition, true, context);
      });

      it('constructs a date from a UTC timestamp', async () => {
        const dateValue = SampleDate.getTime();
        const context = { data: { date: SAMPLE_DATE_STRING, dateValue } };
        const condition = 'Date.parse(data.dateValue) != null';
        await checkExpression(condition, true, context);
      });
    });

    it('getFullYear', async () => {
      await checkDateMethod('getFullYear');
    });

    it('getMonth', async () => {
      await checkDateMethod('getMonth');
    });

    it('getDate', async () => {
      await checkDateMethod('getDate');
    });

    it('getDay', async () => {
      await checkDateMethod('getDay');
    });

    it('getDayOfYear', async () => {
      await checkDateMethod('getDayOfYear');
    });

    it('getHours', async () => {
      await checkDateMethod('getHours');
    });

    it('getMinutes', async () => {
      await checkDateMethod('getMinutes');
    });

    it('getSeconds', async () => {
      await checkDateMethod('getSeconds');
    });

    it('getMilliseconds', async () => {
      await checkDateMethod('getMilliseconds');
    });

    it('getTime', async () => {
      await checkDateMethod('getTime');
    });
  });

  describe('Type Operators', () => {
    describe('typeof', () => {
      const context = { user: Person };

      test('"object"', async () => {
        await checkExpression('typeof user', 'object', context);
      });

      test('"number"', async () => {
        await checkExpression('typeof user.jobs', 'number', context);
      });

      test('"array"', async () => {
        await checkExpression('typeof user.grades', 'array', context);
      });

      test('"boolean"', async () => {
        await checkExpression('typeof user.isActive', 'boolean', context);
      });

      test('"string"', async () => {
        await checkExpression('typeof user.firstName', 'string', context);
      });

      test('"null"', async () => {
        await checkExpression('typeof user.retirement', 'null', context);
      });
    });

    describe('toString', () => {
      const cases = [
        [true, 'true'],
        [false, 'false'],
        [2.5, '2.5'],
        [12345, '12345'],
      ];
      testFunction('toString', cases);
    });

    describe('isString', () => {
      const cases = [
        [true, false],
        [2.5, false],
        ['"string"', true],
        [null, false],
      ];
      testFunction('isString', cases);
    });

    describe('parseBoolean', () => {
      const cases = [
        [true, true],
        [0, false],
        [1, true],
        [0.25, true],
        [-1, true],
        ['true', true],
        ['false', false],
        ['476', true],
        ['"gibberish"', true],
        ['', false],
      ];
      testFunction('parseBoolean', cases);
    });

    describe('parseInt', () => {
      const cases = [
        [5, 5],
        ['100', 100],
        [500, 500],
        ['-487', -487],
      ];
      testFunction('parseInt', cases);
    });

    describe('parseFloat', () => {
      const cases = [
        ['10.0', 10],
        [25, 25],
        ['4.99', 4.99],
        ['-487', -487],
        ['.72', 0.72],
      ];
      testFunction('parseFloat', cases);
    });

    describe('isNumber', () => {
      const cases = [
        [true, false],
        [2.5, true],
        [0, true],
        ['"string"', false],
        [null, false],
      ];
      testFunction('isNumber', cases);
    });

    test('isArray', async () => {
      const context = { user: Person };
      await checkExpression('isArray(user.grades)', true, context);
      await checkExpression('isArray(user.date)', false, context);
      await checkExpression('isArray(user.firstName)', false, context);
    });
  });

  describe('Array', () => {
    const context = { user: Person };

    test('length', async () => {
      await checkExpression('user.languages.programming.length', 7, context);
    });

    describe('push', () => {
      it('handles single items', async () => {
        const languages = [...Person.languages.programming, 'Rust'];

        await checkExpression(
          'user.languages.programming.push("Rust")',
          languages,
          context,
        );
      });

      it('handles multiple args', async () => {
        const languages = [
          ...Person.languages.programming,
          'Rust',
          'Go',
          'Solidity',
        ];
        await checkExpression(
          'user.languages.programming.push("Rust", "Go", "Solidity")',
          languages,
          context,
        );
      });

      it('handles nulls', async () => {
        const languages = [...Person.languages.programming, null];
        await checkExpression(
          'user.languages.programming.push(null)',
          languages,
          context,
        );
      });
    });

    describe('pop', () => {
      it('removes an item from the end of an array', async () => {
        const languages = [...Person.languages.programming];
        const expected = languages.pop();
        await checkExpression(
          'user.languages.programming.pop()',
          expected,
          context,
        );
      });

      it('returns null for an empty list', async () => {
        const list = [];
        await checkExpression('list.pop()', null, { list });
      });
    });

    describe('includes',  () => {
      it('finds items in the array', async () => {
        await checkExpression(
          'user.languages.programming.includes("Python")',
          true,
          context,
        );
      });

      it('does NOT find non-existent items', async () => {
        await checkExpression(
          'user.languages.programming.includes("non-existent")',
          false,
          context,
        );
      });
    });

    test('includesAll', async () => {
      await checkExpression(
        'user.languages.spoken.includesAll(["french", "english"])',
        true,
        context,
      );
    });

    test('reverse', async () => {
      const expected = [...Person.languages.programming].reverse();
      await checkExpression(
        'user.languages.programming.reverse()',
        expected,
        context,
      );
    });

    describe('max', () => {
      test('finds the largest value in an array', async () => {
        const max = Person.circles.school.reduce((res, item) => {
          return item > res ? item : res;
        }, '');

        await checkExpression('user.circles.school.max()', max, context);
      });

      test('returns null for an empty list', async () => {
        const context = { list: [] };
        await checkExpression('list.max()', null, context);
      });

      test('returns null if any value is null', async () => {
        const context = { list: [1, 5, 14, null, 65] };
        await checkExpression('list.max()', null, context);
      });
    });

    describe('min', () => {
      it('returns the smallest item in the list', async () => {
        const min = Person.circles.school.reduce((res, item) => {
          return item < res ? item : res;
        }, 'zzzzzzzzzzzzzzz');

        await checkExpression('user.circles.school.min()', min, context);
      });

      it('returns null for an empty list', async () => {
        const context = { list: [] };
        await checkExpression('list.max()', null, context);
      });

      it('returns null if any value is null', async () => {
        const context = { list: [1, 5, 14, null, 65] };
        await checkExpression('list.min()', null, context);
      });
    });

    describe('join', function () {
      it('uses "," as a separator by default', async () => {
        const expected = Person.circles.school.join(',');

        await checkExpression('user.circles.school.join()', expected, context);
      });

      it('joins with a separator', async () => {
        const expected = Person.circles.school.join('#');

        await checkExpression(
          'user.circles.school.join("#")',
          expected,
          context,
        );
      });
    });

    describe('slice', () => {
      const animals = ['ant', 'bison', 'camel', 'duck', 'elephant'];
      const context = { animals };

      it('works with only a starting index', async () => {
        await checkExpression(
          'animals.slice(2)',
          ['camel', 'duck', 'elephant'],
          context,
        );
      });

      it('works with a start and end index', async () => {
        await checkExpression(
          'animals.slice(2, 4)',
          ['camel', 'duck'],
          context,
        );

        await checkExpression(
          'animals.slice(1, 5)',
          ['bison', 'camel', 'duck', 'elephant'],
          context,
        );
      });

      it('handles negative indices', async () => {
        await checkExpression(
          'animals.slice(-2)',
          ['duck', 'elephant'],
          context,
        );

        await checkExpression(
          'animals.slice(2, -1)',
          ['camel', 'duck'],
          context,
        );
      });
    });

    describe('matches', () => {
      test('can match against array property', async () => {
        const data = {
          l1: { tags: ['tag1', 'tag2', 'xargs'] }
        };
        await checkExpression('l1.tags =~ "^tag*"', true, data);
      });
    });
  });

  describe('Math', () => {
    describe('abs', () => {
      const cases = [
        [null, null],
        [-1, 1],
        [0, 0],
        [1, 1],
      ];
      testFunction('Math.abs', cases);
    });

    describe('acos', () => {
      it('handles null', async () => {
        await checkExpression('Math.acos(null)', null);
      });

      it('0.5', async () => {
        await checkNumberExpression('Math.acos(0.5)', 1.0471975511965979);
      });

      it('1.0', async () => {
        await checkExpression('Math.acos(1.0)', 0);
      });
    });

    describe('ceil', () => {
      const cases = [
        [1, 1],
        [7.8, 8],
        [-2.8, -2],
      ];
      testFunction('Math.ceil', cases);
    });

    describe('floor', () => {
      const cases = [
        [1, 1],
        [7.8, 7],
        [-2.8, -3],
      ];
      testFunction('Math.floor', cases);
    });

    describe('sqrt', () => {
      it('null', async () => {
        await checkExpression('Math.sqrt(null)', null);
      });

      it('25', async () => {
        await checkExpression('Math.sqrt(25)', 5);
      });

      it('30', async () => {
        await checkNumberExpression('Math.sqrt(30)', 5.477225575051661);
      });
    });

    describe('round', () => {
      const cases = [
        [[10.5, 0], 10],
        [[11.5, 0], 12],
        [[12.5, 0], 12],
        [[13.5, 0], 14],
        // rounded to the first decimal place
        [[19.25, 1], 19.2],
        [[28.73, 1], 28.7],
        [[34.32, 1], 34.3],
        [[-45.39, 1], -45.4],
        // rounded using the first digit to the left of the decimal
        [[19.25, -1], 10],
        [[28.73, -1], 20],
        [[34.32, -1], 30],
        [[-45.39, -1], -50],
        // rounded to the whole integer
        [[19.25, 0], 19],
        [[28.73, 0], 28],
        [[34.32, 0], 34],
        [[-45.39, 0], -45],
      ];
      testFunction('Math.round', cases);
    });

    describe('sign', () => {
      const cases = [
        [null, null],
        [3, 1],
        [-3, -1],
        [0, 0],
      ];
      testFunction('Math.sign', cases);
    });

    describe('trunc', () => {
      const cases = [
        [[0, 0], 0],
        // truncate to the first decimal place
        [[19.25, 1], 19.2],
        [[28.73, 1], 28.7],
        [[34.32, 1], 34.3],
        [[-45.39, 1], -45.3],
        // truncated to the first place
        [[19.25, -1], 10],
        [[28.73, -1], 20],
        [[34.32, -1], 30],
        [[-45.39, -1], -40],
        // truncate to the whole integer
        [[19.25, 0], 19],
        [[28.73, 0], 28],
        [[34.32, 0], 34],
        [[-45.39, 0], -45],
      ];
      testFunction('Math.trunc', cases);
    });

    describe('max', () => {
      const cases = [
        [1, 1],
        [[null], null],
        [[1.5, 3], 3],
        [[-1, null, '13', 4], null],
        [[0, 0.005], 0.005],
        [[-67, 1], 1],
        [[0, 1, 19, -45], 19],
      ];
      testFunction('Math.max', cases);
    });

    describe('min', () => {
      const cases = [
        [4, 4],
        [[null], null],
        [[1.5, 3], 1.5],
        [[-1, null, '-13', 4], null],
        [[0, 0.005], 0],
        [[-20, 71], -20],
        [[0, 1, 3, 19, -45], -45],
      ];
      testFunction('Math.min', cases);
    });

    describe('avg', () => {
      const cases = [
        [4, 4],
        [[null], null],
        [[1.5, 3], 2.25],
        [[-1, null, '-13', 4], null],
        [['200', 300,  '100', 400], 250],
        [[0, 0.005], 0.0025],
        [[-20, 71, 32, 21], 26],
        [[0, 1, 3, 19, -45], -4.4],
      ];
      testFunction('Math.avg', cases);
    });

  });

  describe('JSON', () => {
    describe('parse', () => {
      it('handles a valid JSON encoded string', async () => {
        const data = {
          str: 'string',
          num: 12345,
          bool: true,
          null_: null,
          arr: ['this', 1, true, 'thing'],
          obj: { a: 1, b: 1 },
        };
        const asString = JSON.stringify(data);
        const context = { test: asString, expected: data };
        const actual = await evalExpression('JSON.parse(test)', context);
        expect(actual).toMatchObject(data);
      });

      it('returns null for an invalid string', async () => {
        const context = { test: 'invalid' };
        await checkExpression('JSON.parse(test)', null, context);
      });
    });

    describe('stringify', () => {
      it('handles a valid JSON', async () => {
        const data = {
          str: 'string',
          num: 12345,
          bool: true,
          null_: null,
          arr: ['this', 1, true, 'thing'],
          obj: { a: 1, b: 1 },
        };
        const context = { test: data };
        const res = await evalExpression('JSON.stringify(test)', context);
        const actual = JSON.parse(res as string);
        expect(actual).toMatchObject(data);
      });

      it('converts non objects', async () => {
        const context = { str: 'invalid', num: 1.025, bool: true };
        await checkExpression('JSON.stringify(str)', '"invalid"', context);
        await checkExpression('JSON.stringify(num)', '1.025', context);
        await checkExpression('JSON.stringify(bool)', 'true', context);
      });
    });
  });

  describe('Object', () => {
    describe('getOwnProperties', () => {
      it('can get the keys of an object', async () => {
        const data = {
          str: 'string',
          num: 12345,
          bool: true,
          null_: null,
          arr: ['this', 1, true, 'thing'],
          obj: { a: 1, b: 1 },
        };
        const context = { test: data };
        const expected = Object.keys(data).sort();
        const res = await evalExpression('test.getOwnProperties()', { context });
        const p = (res as Array<string>).sort();
        expect(p).toStrictEqual(expected);
      });
    });

    describe('toString', () => {
      it('converts an object to a string', async () => {
        const data = {
          str: 'string',
          num: 12345,
          bool: true,
          null_: null,
          arr: ['this', 1, true, 'thing'],
          obj: { a: 1, b: 1 },
        };
        await checkExpression('typeof data.toString()', 'string', { data });
      });
    });
  });

  describe('Functions', () => {
    describe('ms', () => {
      it('can convert human text to millis', async () => {
        const expected = ms('2 days');
        await testFunctionOnce('ms', '"2 days"', expected);
      });
    });

    describe('cmp', () => {
      it('properly compares values', async () => {
        const data = [
          { item: 'abc2', qty: 200, expected: -1 },
          { item: 'xyz1', qty: 250, expected: 0 },
          { item: 'VWZ1', qty: 300, expected: 1 },
          { item: 'VWZ2', qty: 180, expected: -1 },
        ];
        // todo: test with other types (like strings)
        await checkExpression('cmp(300, 250)', 1);
        await checkExpression('cmp(200, 250)', -1);
        await checkExpression('cmp(721, 721)', 0);
        await checkExpression('cmp(180, 250)', -1);
      });
    });

    describe('isEmpty', () => {
      const cases = [
        [null, true],
        [0, false],
        ['', true],
        ['v', false],
        [0, false],
      ];
      testFunction('isEmpty', cases);
    });
  });
});
