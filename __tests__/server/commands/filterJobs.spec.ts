import { clearDb, createClient } from '../utils';
import { createQueue } from '../factories';
import { Job, Queue } from 'bullmq';
import { Scripts } from '../../../src/server/commands/scripts';
import { nanoid } from 'nanoid';
import { convertToRPN } from '../../../src/server/lib/expressions';

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

describe('filterJobs', () => {
  let client;
  let queue: Queue;

  beforeEach(async () => {
    client = await createClient();
    await clearDb(client);
    queue = createQueue();
  });

  afterEach(async () => {
    // await clearDb(client);
    return client.quit();
  });

  async function find(
    arr: Record<string, any>[],
    criteria: string,
  ): Promise<any[]> {
    const bulkData = arr.map((item) => {
      return { name: 'default', data: item };
    });
    await queue.addBulk(bulkData);
    const compiled = convertToRPN(criteria);
    const { jobs } = await Scripts.getJobsByFilter(
      queue,
      'waiting',
      compiled,
      0,
      100,
    );
    return jobs.map((job) => job.data);
  }

  async function checkExpressionByList(
    data: Record<string, any>[],
    query: string,
    filterFn: (any) => boolean = () => true,
    sortBy: string = null,
  ): Promise<void> {
    let result = await find(data, query);
    let expected = data.filter(filterFn);
    if (sortBy) {
      const compare = (a: Record<string, any>, b: Record<string, any>) => {
        const a2 = a[sortBy];
        const b2 = b[sortBy];
        return a2 === b2 ? 0 : a2 < b2 ? 1 : -1;
      };
      result = result.sort(compare);
      expected = expected.sort(compare);
    }

    expect(result).toStrictEqual(expected);
  }

  async function findFirst(
    arr: Record<string, any>[],
    criteria: string,
  ): Promise<Record<string, any>> {
    const data = await find(arr, criteria);
    return data?.length ? data[0] : null;
  }

  async function attempt(criteria: string, expectMatch = true): Promise<void> {
    const compiled = convertToRPN(criteria);
    const { jobs } = await Scripts.getJobsByFilter(
      queue,
      'waiting',
      compiled,
      0,
    );
    expect(!!jobs.length).toEqual(expectMatch);
  }

  async function checkExpression(
    expression: string,
    expectedValue: any,
    expectMatch = true,
  ) {
    const criteria = `(${expression}) == ${expectedValue}`;
    await attempt(criteria, expectMatch);
  }

  function testOperator(operator, cases) {
    test.each(cases)(`${operator}: %p`, async (args, expected) => {
      const data = {};
      let filter: string;
      if (Array.isArray(args) && args.length == 2) {
        filter = `job.data.first ${operator} job.data.second`;
        data['first'] = args[0];
        data['second'] = args[1];
      } else {
        data['value'] = args;
        filter = `${operator} ${args}`;
      }

      await queue.add('default', data);
      await checkExpression(filter, expected);
    });
  }

  function formatFunction(name: string, args: string[] | undefined): string {
    let argStr = '';
    if (args !== undefined) {
      argStr = Array.isArray(args) ? args.join(', ') : args;
    }
    return `${name}(${argStr})`;
  }

  function testMethod(name, cases) {
    test.each(cases)(`${name}: %p`, async (value, args, expected) => {
      if (expected === undefined) {
        expected = args;
        args = undefined;
      }
      const data = {
        value,
        expected,
      };
      const filter = `job.data.value.${formatFunction(
        name,
        args,
      )} == job.data.expected`;

      await queue.add('default', data);
      await attempt(filter, true);
    });
  }

  function testFunction(name, cases) {
    test.each(cases)(`${name}: %p`, async (args, expected) => {
      const data = {
        expected,
      };
      const filter = `${formatFunction(name, args)} == job.data.expected`;

      await queue.add('default', data);
      await attempt(filter, true);
    });
  }

  function testExpressionCases(operator, cases) {
    test.each(cases)(`${operator}: %p`, async (args, expected) => {
      const data = {};
      let filter: string;
      if (Array.isArray(args) && args.length == 2) {
        filter = `${args[0]} ${operator} ${args[1]}`;
        data['first'] = args[0];
        data['second'] = args[1];
      } else {
        data['value'] = args;
        filter = `${operator} ${args}`;
      }

      await queue.add('default', data);
      await checkExpression(filter, expected);
    });
  }

  describe('Basic field access', () => {
    let job;

    beforeEach(async () => {
      job = await queue.add('default', Person);
    });

    it('can access basic job fields', async () => {
      await attempt('job.id != null');
      await attempt('job.name != null');
      await attempt('job.timestamp != null');
      await attempt('job.data != null');
      await attempt('job.opts != null');
    });
  });

  describe('Comparison, Evaluation, and Element Operators', () => {
    let job: Job;

    beforeEach(async () => {
      job = await queue.add('default', Person);
    });

    test('==', async () => {
      await attempt('job.data.firstName == "Francis"');
    });

    // test('$eq with object values', async () => {
    //   await attempt({ 'data.date': { year: 2013, month: 9, day: 25 } });
    // });

    test('== with objects in a given position in an array with dot notation', async () => {
      await attempt('job.data.grades[0].grade == 92');
    });

    test('== with nested elements in array', async () => {
      await attempt('job.data.projects.Python == "Flaskapp"');
    });

    test('matches', async () => {
      await attempt('job.data.lastName matches "a.+e"');
    });

    test('!= with direct values', async () => {
      await attempt('job.data.username != "mufasa"');
    });

    test('>', async () => {
      await attempt('job.data.jobs > 1', false);
    });

    test('>=', async () => {
      await attempt('job.data.jobs >= 6');
    });

    test('<', async () => {
      await attempt('job.data.jobs < 10', true);
    });

    test('<=', async () => {
      await attempt('job.data.jobs <= 6');
    });

    test('can compare value inside array at a given index', async () => {
      await attempt('job.data.projects.C[1] == "student_record"');
    });

    test('in', async () => {
      await attempt('job.data.circles.school in ["Henry"]');
    });

    test('in (false)', async () => {
      await attempt('job.data.middlename in [null, "David"]');
    });

    test('Array.length', async () => {
      await attempt('job.data.languages.programming.length == 7');
    });

    test('modulo', async () => {
      await attempt('job.data.date.month % 8 == 1');
    });

    test('can match fields for all objects within an array with dot notation', async () => {
      await attempt('job.data.grades.mean > 70');
    });
  });

  describe('Query Logical Operators', function () {
    let job: Job;

    beforeEach(async () => {
      job = await queue.add('default', Person);
    });

    describe('&&', () => {
      test('can use conjunction true && true', async () => {
        await attempt(
          'job.data.firstName == "Francis" && job.name == "default"',
        );
      });

      test('true && false', async () => {
        await attempt(
          'job.data.firstName == "Francis" && job.data.lastName == "Amoah"',
          false,
        );
      });

      test('false && true', async () => {
        await attempt(
          'job.data.firstName ==  "Enoch" && job.data.lastName == "Asante"',
          false,
        );
      });

      test('false && false', async () => {
        await attempt('job.data.firstName == "Enoch" && !!job.data.age', false);
      });
    });

    describe('||', () => {
      test('true OR true', async () => {
        await attempt(
          'job.data.firstName == "Francis" || job.data.lastName matches "^%a.+e"',
        );
      });

      test('true || false', async () => {
        await attempt(
          'job.data.firstName == "Francis" || job.data.lastName == "Amoah"',
        );
      });

      test('false OR true', async () => {
        await attempt(
          'job.data.firstName == "Enoch" || job.data.lastName == "Asante"',
        );
      });
    });

    test('false OR false', async () => {
      await attempt(
        'job.data.firstName == "Enoch" || job.data.age != null',
        false,
      );
    });
  });

  describe('xor', () => {
    test('true XOR true', async () => {
      await attempt(
        'job.data.firstName == "Francis" xor job.data.lastName "^%a.+e"',
        false,
      );
    });

    test('true XOR false', async () => {
      await attempt(
        'job.data.firstName == "Francis" xor job.data.lastName == "Amoah"',
        true,
      );
    });

    test('false XOR true', async () => {
      await attempt(
        'job.data.firstName == "Enoch" xor job.data.lastName = "Asante"',
        true,
      );
    });

    test('false XOR false', async () => {
      await attempt(
        'job.data.firstName == "Enoch" xor data.age != null',
        false,
      );
    });
  });

  describe('Query array operators', function () {
    describe('selector tests', () => {
      const data = [
        {
          key0: [
            {
              key1: [
                [
                  [
                    {
                      key2: [{ a: 'value2' }, { a: 'dummy' }, { b: 20 }],
                    },
                  ],
                ],
                { key2: 'value' },
              ],
              key1a: { key2a: 'value2a' },
            },
          ],
        },
      ];

      async function attempt(query, expected): Promise<void> {
        const result = await find(data, query);
        expect(result).toStrictEqual(expected);
      }

      test('should not match without array index selector to nested value ', async () => {
        await attempt({ 'job.data.key0.key1.key2.a': 'value2' }, []);
      });

      test('should not match without enough depth for array index selector to nested value', async () => {
        await attempt('job.data.key0.key1[0].key2.a == "value2"', []);
      });

      test('should match with full array index selector to deeply nested value', async () => {
        await attempt({ 'job.data.key0.key1[0][0].key2.a': 'value2' }, data);
      });

      test('should match with array index selector to nested value at depth 1', async () => {
        await attempt({ 'job.data.key0.key1[0][0].key2': { b: 20 } }, data);
      });

      test('should match with full array index selector to nested value', async () => {
        await attempt('job.data.key0.key1[1].key2 == "value"', data);
      });

      test('should match without array index selector to nested value at depth 1', async () => {
        await attempt({ 'job.data.key0.key1.key2': 'value' }, data);
      });

      test('should match shallow nested value with array index selector', async () => {
        await attempt({ 'job.data.key0.key1[1].key2': 'value' }, data);
      });
    });

    test('should match nested array of objects without indices', async () => {
      // https://github.com/kofrasa/mingo/issues/51
      const data = [{ key0: [{ key1: ['value'] }, { key1: ['value1'] }] }];
      const result = await findFirst(data, 'job.data.key0.key1 == "value"');
      expect(result).toStrictEqual(data[0]);
    });
  });

  describe('Expression Logical Operators', () => {
    const inventory = [
      { _id: 1, sku: 'abc1', description: 'product 1', qty: 300 },
      { _id: 2, sku: 'abc2', description: 'product 2', qty: 200 },
      { _id: 3, sku: 'xyz1', description: 'product 3', qty: 250 },
      { _id: 4, sku: 'VWZ1', description: 'product 4', qty: 300 },
      { _id: 5, sku: 'VWZ2', description: 'product 5', qty: 180 },
    ];

    it('&&', async () => {
      const condition = 'job.data.qty > 100 && job.data.qty <= 250';
      await checkExpressionByList(
        inventory,
        condition,
        (data) => data.qty > 100 && data.qty <= 250,
        '_id',
      );
    });

    it('||', async () => {
      const condition = 'job.data.qty > 250 || job.data.qty < 200';
      await checkExpressionByList(
        inventory,
        condition,
        (data) => data.qty > 250 || data.qty < 200,
        '_id',
      );
    });

    it('^', async () => {
      const condition = '(job.data.qty > 250) ^ (job.data.qty < 200)';
      const xor = (a: boolean, b: boolean) => a !== b;

      await checkExpressionByList(
        inventory,
        condition,
        (data) => xor(data.qty > 250, data.qty < 200),
        '_id',
      );
    });

    it('!', async () => {
      const condition = '!(job.data.qty > 250)';
      await checkExpressionByList(
        inventory,
        condition,
        (data) => !(data.qty > 250),
        '_id',
      );
    });

    it('in', async () => {
      const condition = 'job.data.sku in ["abc1", "abc2"]';
      await checkExpressionByList(
        inventory,
        condition,
        (data) => ['abc1', 'abc2'].includes(data.sku),
        '_id',
      );
    });
  });

  describe('Conditional Operators', () => {
    let job: Job;

    const data = {
      lowScore: 100,
      highScore: 200,
      score: 150,
      nullValue: null,
    };

    beforeEach(async () => {
      job = await queue.add('default', data);
    });

    async function check(criteria, expectMatch = true): Promise<void> {
      const { jobs } = await Scripts.getJobsByFilter(
        queue,
        'waiting',
        criteria,
        0,
      );
      expect(!!jobs.length).toEqual(expectMatch);
    }

    describe('ternary', () => {
      test('supports ternary operator', async () => {
        const conditional = '(job.data.lowScore < job.data.highScore) ? 5 : 25';
        await checkExpression(conditional, 5);
      });

      test('complex expression', async () => {
        const data = [
          { _id: 1, item: 'binder', qty: 100, price: 12 },
          { _id: 2, item: 'notebook', qty: 200, price: 8 },
          { _id: 3, item: 'pencil', qty: 50, price: 6 },
          { _id: 4, item: 'eraser', qty: 150, price: 3 },
        ];

        function calcValue(data) {
          const { qty, price } = data;
          return price / (qty >= 100 ? 2 : 4);
        }

        const cond =
          'job.data.qty >= 100 ? (job.data.price / 2) : (job.data.price / 4)';
        const expr = `(${cond}) < 5`;

        await checkExpressionByList(
          data,
          expr,
          (data) => calcValue(data) < 5,
          '_id',
        );
      });
    });

    describe('ifNull', () => {
      test('uses default value if null is found', async () => {
        const conditional = 'ifNull(null, "default")';
        await checkExpression(conditional, 'default');
      });

      test('uses non null value', async () => {
        const conditional = 'ifNull(5, "default") == 5';
        await checkExpression(conditional, 5);
      });
    });
  });

  describe('Arithmetic Operators', () => {
    describe('+', () => {
      const cases = [
        [[10, 2], 12],
        [[-1, 5], 4],
        [[-3, -7], -10],
      ];
      testOperator('+', cases);
    });

    describe('-', () => {
      const cases = [
        [[-1, -1], 0],
        [[-1, 2], -3],
        [[2, -1], 3],
      ];
      testOperator('-', cases);
    });

    describe('*', () => {
      const cases = [
        [[5, 10], 50],
        [[-2, 4], -8],
        [[-3, -3], 9],
      ];
      testOperator('*', cases);
    });

    describe('/', () => {
      const cases = [
        [[80, 4], 20],
        [[1.5, 3], 0.5],
        [[40, 8], 5],
      ];
      testOperator('/', cases);
    });

    describe('%', () => {
      const cases = [
        [[80, 7], 3],
        [[40, 4], 0],
      ];
      testOperator('%', cases);
    });
  });

  describe('String Methods', () => {
    function testTrim(method, cases) {
      test.each(cases)(
        `{${method}: input: "%p", chars: %p`,
        async (input, chars, expected) => {
          const data = {
            value: input,
          };
          const expression =
            `${method}(job.data.value` + chars ? `, "${chars}"` : '' + ')';
          await queue.add('default', data);
          await checkExpression(expression, expected);
        },
      );
    }

    describe('toLowerCase', () => {
      const cases = [
        [null, null],
        ['hEl1O', 'hel1o'],
      ];
      testMethod('toLowerCase', cases);
    });

    describe('toUpperCase', () => {
      const cases = [
        [null, null],
        ['This is lOwer', 'THIS IS LOWER'],
      ];
      testMethod('toUpperCase', cases);
    });

    describe('startsWith', () => {
      const cases = [
        [null, null, false],
        ['hyperactive', 'hyper', true],
        ['milliseconds', 'not-prefix', false],
      ];
      testMethod('startsWith', cases);
    });

    describe('endsWith', () => {
      const cases = [
        [null, null, false],
        ['hyperactive', 'active', true],
        ['milliseconds', 'minutes', false],
      ];
      testMethod('endsWith', cases);
    });

    describe('includes', () => {
      const cases = [
        [null, null, false],
        ['super hyperactive', 'hyper', true],
        ['should not', 'be found', false],
        ['source', 4, false],
      ];
      testMethod('includes', cases);
    });

    describe('strcasecmp', () => {
      const cases = [
        [null, null, 0],
        ['13Q1', '13q4', -1],
        ['13Q4', '13q4', 0],
        ['14Q2', '13q4', 1],
      ];
      testMethod('strcasecmp', cases);
    });

    describe('substr', () => {
      const cases = [
        [null, 2, null],
        ['hello', -1, ''],
        ['hello', [1, -2], 'ello'],
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
        [null, 2, null],
        ['hello', -1, ''],
        ['hello', [1, -2], 'ello'],
        ['abcde', [1, 2], 'bc'],
        ['Hello World!', [6, 5], 'World'],
        ['cafeteria', [0, 5], 'cafet'],
        ['cafeteria', [5, 4], 'eria'],
        ['cafeteria', [7, 3], 'ia'],
        ['cafeteria', [3, 1], 'e'],
      ];
      testMethod('substring', cases);
    });

    describe('concat', () => {
      const cases = [
        [null, 'abc', null],
        ['b-', ['a', '-', 'c'], 'b-a-c'],
      ];
      testMethod('concat', cases);
    });

    describe('indexOf', () => {
      const cases = [
        ['cafeteria', 'e', 3],
        ['cafétéria', 'é', 3],
        ['cafétéria', 'e', -1],
        ['cafétéria', 't', 4], // "5" is an error in MongoDB docs.
        ['foo.bar.fi', ['.', 5], 7],
        ['vanilla', ['ll', 0, 2], -1],
        ['vanilla', ['ll', 12], -1],
        ['vanilla', ['ll', 5, 2], -1],
        ['vanilla', ['nilla', 3], -1],
        [null, 'foo', null],
      ];
      testMethod('indexOf', cases);
    });

    describe('string.indexOf: invalid parameters', () => {
      async function runTest(
        haystack: string | number,
        needle: string | number,
        start: string | number,
        end: string | number,
        expected?: RegExp | string,
      ) {
        const data = {
          haystack: nanoid(),
        };
        const criteria = 'job.data.haystack.indexOf(needle, start, end) == 5';
        await queue.add('default', data);
        if (expected) {
          expect(() => checkExpression(criteria, 0)).toThrow(expected);
        } else {
          expect(() => checkExpression(criteria, 0)).toThrow();
        }
      }

      async function testIndices(
        start: string | number,
        end: string | number,
        expected: string | RegExp,
      ) {
        return runTest('job.data.haystack', 'ignored', start, end, expected);
      }

      it('throws if the haystack is not a string', async () => {
        await runTest(
          18,
          '',
          0,
          1000,
          /expected a string as the first argument/,
        );
      });

      it('throws if the needle is not a string', async () => {
        await runTest(
          '$data.haystack',
          99,
          0,
          1000,
          /expected a string as the second argument/,
        );
      });

      it('throws if the start index is not a number', async () => {
        await testIndices('fudge', 1000, /start index should be a number/);
      });

      it('throws if the start index is negative', async () => {
        await testIndices(-5, 1000, /start index should be a positive number/);
      });

      it('throws if the end index is not a number', async () => {
        await testIndices(1, 'cherry', /end index should be a number/);
      });

      it('throws if the end index is negative', async () => {
        await testIndices(5, -10, /end index should be a positive number/);
      });
    });

    describe('split', () => {
      const cases = [
        [null, '/', null],
        ['June-15-2013', '-', ['June', '15', '2013']],
        ['banana split', 'a', ['b', 'n', 'n', ' split']],
        ['Hello World', ' ', ['Hello', 'World']],
        ['astronomical', 'astro', ['', 'nomical']],
        ['pea green boat', 'owl', ['pea green boat']],
      ];
      testMethod('split', cases);
    });

    describe('trim', () => {
      const cases = [
        ['  \n good  bye \t  ', null, 'good  bye'],
        [' ggggoodbyeeeee', 'ge', ' ggggoodby'],
        ['    ggggoodbyeeeee', ' ge', 'oodby'],
        [null, null, null],
      ];
      testTrim('trim', cases);
    });

    describe('trimStart', () => {
      const cases = [
        ['  \n good  bye \t  ', null, 'good  bye \t  '],
        [' ggggoodbyeeeee', 'ge', ' ggggoodbyeeeee'],
        ['    ggggoodbyeeeee ', ' gd', 'oodbyeeeee '],
        [null, null, null],
      ];
      testTrim('trimStart', cases);
    });

    describe('trimEnd', () => {
      const cases = [
        ['  \n good  bye \t  ', null, '  \n good  bye'],
        [' ggggoodbyeeeee', 'ge', ' ggggoodby'],
        [' ggggoodbyeeeee    ', 'e ', ' ggggoodby'],
        [null, null, null],
      ];
      testTrim('trimEnd', cases);
    });
  });

  describe('Date Operators', () => {
    const SAMPLE_DATE_STRING = '2014-01-01T08:15:39.736Z';
    const SampleDate = new Date(SAMPLE_DATE_STRING);

    function testDateParts(operator, cases) {
      test.each(cases)(
        `{${operator}: {input: "%p"}}`,
        async (input, expected) => {
          const data = {
            value: input,
          };
          const expr = `parseDate(job.data.value).${operator}()`;
          await queue.add('default', data);
          await checkExpression(expr, expected);
        },
      );
    }

    async function addJob(data: Record<string, any>) {
      const job = await queue.add('default', data);
    }

    describe('parseDate', () => {
      it('converts an RFC-3339 date string', async () => {
        const dateValue = SampleDate.getTime();
        await addJob({ date: SAMPLE_DATE_STRING, dateValue });
        const condition = 'toDate(job.data.date) == job.data.dateValue';
        await attempt(condition);
      });
    });

    it('returns the year of a date', async () => {
      await addJob({ date: SAMPLE_DATE_STRING });
      const condition = `year(job.data.date) == ${SampleDate.getFullYear()}`;
      await attempt(condition);
    });

    it('returns the month of a date', async () => {
      await addJob({ date: SAMPLE_DATE_STRING });
      const condition = `month(job.data.date) == ${SampleDate.getMonth()}`;
      await attempt(condition);
    });
  });

  describe('Type Operators', () => {
    describe('typeof', () => {
      let job: Job;

      beforeEach(async () => {
        job = await queue.add('default', Person);
      });

      test('"object"', async () => {
        await attempt('typeof job.data == "object"');
      });

      test('"number"', async () => {
        await attempt('typeof job.data.jobs == "number"');
      });

      test('"array"', async () => {
        await attempt('typeof job.data.grades == "array"');
      });

      test('"boolean"', async () => {
        await attempt('typeof job.data.isActive == "boolean"');
      });

      test('"string"', async () => {
        await attempt('typeof job.name == "string"');
      });

      test('"null"', async () => {
        await attempt('typeof job.data.retirement == "null"');
      });
    });

    describe('instanceof', () => {
      let job: Job;

      beforeEach(async () => {
        job = await queue.add('default', Person);
      });

      test('"object"', async () => {
        await attempt('job.data instanceof "object"');
      });

      test('"number"', async () => {
        await attempt('job.data.jobs instanceof "number"');
      });

      test('"array"', async () => {
        await attempt('job.data.grades instanceof "array"');
      });

      test('"boolean"', async () => {
        await attempt('job.data.isActive instanceof "boolean"');
      });

      test('"string"', async () => {
        await attempt('job.name instanceof "string"');
      });

      test('"null"', async () => {
        await attempt('job.data.missing instanceof "null"');
      });
    });

    describe('toString', () => {
      const cases = [
        [true, 'true'],
        [false, 'false'],
        [2.5, '2.5'],
        [12345, '12345'],
      ];
      testExpressionCases('toString', cases);
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
        ['"100"', 100],
        [500, 500],
        ['"-487"', -487],
      ];
      testFunction('parseInt', cases);
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

    describe('parseFloat', () => {
      it('converts values to decimal', async () => {
        const data = [
          { _id: 1, item: 'apple', qty: 5, price: '10.0', total: 50 },
          { _id: 2, item: 'pie', qty: 10, price: 20.0, total: 200.0 },
          { _id: 3, item: 'ice cream', qty: 2, price: '4.99', total: 9.98 },
          { _id: 4, item: 'almonds', qty: 4, price: '5.25', total: 21 },
        ];
        const expr =
          'job.data.qty * parseFloat(job.data.price) == job.data.total';
        await checkExpressionByList(data, expr, () => true, '_id');
      });
    });

    test('isArray', async () => {
      await attempt('isArray(job.data.grades)');
      await attempt('isArray(job.data.date)');
    });
  });

  describe('Array methods', () => {
    let job: Job;

    beforeEach(async () => {
      job = await queue.add('default', Person);
    });

    describe('max', () => {
      const cases = [
        [1, 1],
        [[null], null],
        [[1.5, 3], 3],
        [[-1, null, '13', 4], 4],
        [[0, 0.005], 0.005],
        [[-67, 1], 1],
        [[0, 1, 19, -45], 19],
      ];
      testMethod('max', cases);
    });

    describe('min', () => {
      const cases = [
        [4, 4],
        [[null], null],
        [[1.5, 3], 1.5],
        [[-1, null, '-13', 4], -1],
        [[0, 0.005], 0],
        [[-20, 71], -20],
        [[0, 1, 3, 19, -45], -45],
      ];
      testMethod('min', cases);
    });

    test('includes', async () => {
      await attempt('job.data.languages.programming.includes("Python")');
    });

    test('includesAll', async () => {
      await attempt(
        'job.data.languages.spoken.includesAll(["french", "english"])',
      );
    });

    test('reverse', async () => {
      const expected = [...Person.languages.programming].reverse();
      await attempt(
        'job.data.languages.programming.reverse == [' +
          expected.join(',') +
          ']',
      );
    });
  });

  describe('Math', () => {
    describe('abs', () => {
      const cases = [
        [null, null],
        [-1, 1],
        [1, 1],
      ];
      testFunction('Math.abs', cases);
    });

    describe('acos', () => {
      const cases = [
        [null, null],
        [0.5, 1.0471975511965979],
        [1, 0],
      ];
      testFunction('Math.acos', cases);
    });

    describe('ceil', () => {
      const cases = [
        [null, null],
        [1, 1],
        [7.8, 8],
        [-2.8, -2],
      ];
      testFunction('Math.ceil', cases);
    });

    describe('floor', () => {
      const cases = [
        [null, null],
        [1, 1],
        [7.8, 7],
        [-2.8, -3],
      ];
      testFunction('Math.floor', cases);
    });

    describe('sqrt', () => {
      const cases = [
        [null, null],
        [NaN, NaN],
        [25, 5],
        [30, 5.477225575051661],
      ];
      testFunction('Math.sqrt', cases);
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
        [[null, 0], null],
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
      testExpressionCases('trunc', cases);
    });
  });

  describe('Functions', () => {
    describe('cmp', () => {
      it('properly compares values', async () => {
        const data = [
          { item: 'abc1', qty: 300, expected: 1 },
          { item: 'abc2', qty: 200, expected: -1 },
          { item: 'xyz1', qty: 250, expected: 0 },
          { item: 'VWZ1', qty: 300, expected: 1 },
          { item: 'VWZ2', qty: 180, expected: -1 },
        ];
        const expr = 'cmp(job.data.qty, 250) == job.data.expected';

        await checkExpressionByList(data, expr, () => true, 'item');
      });
    });
  });

  describe('matches', () => {
    test('can match against non-array property', async () => {
      const data = [{ l1: [{ tags: 'tag1' }, { notags: 'yep' }] }];
      let res = await find(data, 'job.data.l1.tags matches ".*tag.*"');
      expect(res.length).toBe(1);
    });

    test('can match against array property', async () => {
      const data = [
        {
          l1: [{ tags: ['tag1', 'tag2'] }, { tags: ['tag66'] }],
        },
      ];
      const res = await find(data, 'job.data.l1.tags matches "^tag*"');
      expect(res.length).toBe(1);
    });
  });

  describe('$expr tests', function () {
    // https://docs.mongodb.com/manual/reference/operator/query/expr/

    test('compare two fields from a single document', async () => {
      const data = [
        { _id: 1, category: 'food', budget: 400, spent: 450 },
        { _id: 2, category: 'drinks', budget: 100, spent: 150 },
        { _id: 3, category: 'clothes', budget: 100, spent: 50 },
        { _id: 4, category: 'misc', budget: 500, spent: 300 },
        { _id: 5, category: 'travel', budget: 200, spent: 650 },
      ];

      const expr = 'job.data.spent > job.data.budget';

      await checkExpressionByList(
        data,
        expr,
        (data) => data.spent > data.budget,
        '_id',
      );
    });
  });

  describe('null or missing fields', () => {
    const data = [{ _id: 1, item: null }, { _id: 2 }];

    async function attempt(criteria: string, expected) {
      const res = await find(data, criteria);
      expect(res).toStrictEqual(expected);
    }

    test('should return all documents', async () => {
      const expected = [{ _id: 1, item: null }, { _id: 2 }];
      await attempt('job.data.item == null', expected);
    });

    test('should return one document with null field', async () => {
      const query = 'typeof data.item = "null"';
      const expected = [{ _id: 1, item: null }];
      await attempt(query, expected);
    });

    test('should return one document without null field', async () => {
      const query = 'job.data.item == null';
      const expected = [{ _id: 2 }];
      await attempt(query, expected);
    });

    test('in should return all documents', async function () {
      const query = 'job.data.item in [null, false]';
      const expected = [{ _id: 1, item: null }, { _id: 2 }];
      await attempt(query, expected);
    });
  });
});
