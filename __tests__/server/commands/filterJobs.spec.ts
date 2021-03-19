import { clearDb, createClient } from '../utils';
import { createQueue } from '../factories';
import { Job, Queue } from 'bullmq';
import { Scripts } from '../../../src/server/commands/scripts';
import { convertToRPN } from '../../../src/server/lib/expressions';
import ms from 'ms';

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
  return "'" + source.replace(/([^'\\]*(?:\\.[^'\\]*)*)'/g, "$1\\'") + "'";
}

describe('filterJobs', () => {
  let client;
  let queue: Queue;

  beforeEach(async () => {
    client = await createClient();
    await clearDb(client);
    queue = createQueue();
  });

  afterEach(async () => {
    await clearDb(client);
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

  async function check(criteria: string, expectMatch = true): Promise<void> {
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
    await check(criteria, expectMatch);
  }

  function testOperator(operator, cases) {
    test.each(cases)(`${operator}: %p`, async (left, right, expected) => {
      const data = {};
      let filter: string;

      if (expected === undefined) {
        expected = right;
        data['value'] = left;
        filter = `${operator} job.data.value`;
      } else {
        data['left'] = left;
        data['right'] = right;
        filter = `job.data.left ${operator} job.data.right`;
      }

      await queue.add('default', data);
      await checkExpression(filter, expected);
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
      let _args = Array.isArray(args) ? args : [args];
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
    const filter = `job.data.value.${formatFunction(
      name,
      args,
    )} == job.data.expected`;

    await queue.add('default', data);
    await check(filter, true);
  }

  async function testFunctionOnce(name, args, expected) {
    const data = {
      expected,
    };
    const filter = `${formatFunction(name, args)} == job.data.expected`;

    await queue.add('default', data);
    await check(filter, true);
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
    it('can access basic job fields', async () => {
      await queue.add('default', Person);
      await check('job.id != null');
      await check('job.name != null');
      await check('job.timestamp != null');
      await check('job.data != null');
      await check('job.opts != null');
    });
  });

  describe('Computed Job Fields', () => {
    let job: Job;

    async function updateJob(data: Record<string, any>) {
      const key = queue.toKey(job.id);
      return client.hmset(key, data);
    }

    beforeEach(async () => {
      job = await queue.add('default', Person);
    });

    describe('latency', () => {
      it('returns null if the job has not started', async () => {
        expect(job.processedOn).not.toBeDefined();
        const filter = 'job.latency == null';
        await checkExpression(filter, true);
      });

      it('returns null if the job has not finished', async () => {
        await updateJob({ processedOn: Date.now() });
        const filter = 'job.latency == null';
        await check(filter, true);
      });

      it('returns the correct job duration', async () => {
        const finishedOn = Date.now();
        const processedOn = finishedOn - 60000;
        await updateJob({ finishedOn, processedOn });
        const filter = `job.latency == ${finishedOn - processedOn}`;
        await check(filter, true);
      });
    });

    describe('waitTime', () => {
      // Question: is there ay circumstance in which a job's timestamp is not set ??
      it('returns null if the job has not started', async () => {
        expect(job.processedOn).not.toBeDefined();
        const filter = 'job.waitTime == null';
        await check(filter, true);
      });

      it('returns the correct value', async () => {
        await updateJob({ processedOn: Date.now() + 1000 });
        const filter = `job.waitTime == (job.processedOn - job.timestamp)`;
        await check(filter, true);
      });
    });
  });

  describe('Comparison, Evaluation, and Element Operators', () => {
    let job: Job;

    beforeEach(async () => {
      job = await queue.add('default', Person);
    });

    test('==', async () => {
      await check('job.data.firstName == "Francis"');
    });

    // test('$eq with object values', async () => {
    //   await attempt({ 'data.date': { year: 2013, month: 9, day: 25 } });
    // });

    test('== with objects in a given position in an array with dot notation', async () => {
      await check('job.data.grades[0].grade == 92');
    });

    test('=~', async () => {
      await check('job.data.lastName =~ "a.+e"');
    });

    test('!=', async () => {
      await check('job.data.username != "mufasa"');
    });

    test('>', async () => {
      await check('job.data.jobs > 1');
    });

    test('>=', async () => {
      await check('job.data.jobs >= 6');
    });

    test('<', async () => {
      await check('job.data.jobs < 10', true);
    });

    test('<=', async () => {
      await check('job.data.jobs <= 6');
    });

    test('can compare value inside array at a given index', async () => {
      await check('job.data.projects.C[1] == "student_record"');
    });

    test('in', async () => {
      await check('job.data.circles.school in ["Henry"]');
    });

    test('in (false)', async () => {
      await check('job.data.middlename in [null, "David"]');
    });

    test('%', async () => {
      await check('job.data.date.month % 8 == 1');
    });
  });

  describe('Unary operators', () => {
    beforeEach(async () => {
      await queue.add('default', Person);
    });

    test('!', async () => {
      await check('!job.data.isActive == false');
    });

    test('!!', async () => {
      await check('!!job.data.languages.programming');
      await check('!!job.data.missing_value == false');
    });
  });

  describe('Query Logical Operators', function () {
    let job: Job;

    beforeEach(async () => {
      job = await queue.add('default', Person);
    });

    describe('&&', () => {
      test('can use conjunction true && true', async () => {
        await check('job.data.firstName == "Francis" && job.name == "default"');
      });

      test('true && false', async () => {
        await check(
          'job.data.firstName == "Francis" && job.data.lastName == "Amoah"',
          false,
        );
      });

      test('false && true', async () => {
        await check(
          'job.data.firstName ==  "Enoch" && job.data.lastName == "Asante"',
          false,
        );
      });

      test('false && false', async () => {
        await check('job.data.firstName == "Enoch" && !!job.data.age', false);
      });
    });

    describe('||', () => {
      test('true OR true', async () => {
        await check(
          'job.data.firstName == "Francis" || job.data.lastName =~ "^%a.+e"',
        );
      });

      test('true || false', async () => {
        await check(
          'job.data.firstName == "Francis" || job.data.lastName == "Amoah"',
        );
      });

      test('false OR true', async () => {
        await check(
          'job.data.firstName == "Enoch" || job.data.lastName == "Asante"',
        );
      });
    });

    test('false OR false', async () => {
      await check(
        'job.data.firstName == "Enoch" || job.data.age != null',
        false,
      );
    });

    describe('??', () => {
      test('returns alternate when lvalue is null', async () => {
        await check('(job.data.missing_value ?? 100) == 100');
      });

      test('returns falsey non-null values', async () => {
        const cases = [
          [0, 2, 0],
          ['', 5, ''],
        ];
        testOperator('??', cases);
      });
    });
  });

  describe('xor', () => {
    test('true XOR true', async () => {
      await check(
        'job.data.firstName == "Francis" ^ job.data.lastName "^%a.+e"',
        false,
      );
    });

    test('true XOR false', async () => {
      await check(
        'job.data.firstName == "Francis" ^ job.data.lastName == "Amoah"',
        true,
      );
    });

    test('false XOR true', async () => {
      await check(
        'job.data.firstName == "Enoch" ^ job.data.lastName == "Asante"',
        true,
      );
    });

    test('false XOR false', async () => {
      await check(
        'job.data.firstName == "Enoch" ^ job.data.age != null',
        false,
      );
    });
  });

  describe('Query array operators', function () {
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

      async function testAccessor(query, expected = true): Promise<void> {
        await queue.add('default', data);
        return check(query, expected);
      }

      test('should not match without enough depth for array index selector to nested value', async () => {
        await testAccessor('job.data.key0.key1[0].key2.a == "value2"', false);
      });

      test('should match with full array index selector to nested value', async () => {
        await testAccessor('job.data.key0.key1[1].key2 == "value"');
      });

      test('should match shallow nested value with array index selector', async () => {
        await testAccessor('job.data.key0.key1[1].key2 == "value"');
      });
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
        const conditional =
          'ifNull(job.data.missing_value, "default") == "default"';
        await check(conditional);
      });

      test('uses non null value', async () => {
        const conditional = 'ifNull(job.data.score, -1) == job.data.score';
        await check(conditional);
      });
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
      await check('job.data.title.length == ' + Person.title.length);
    });

    test('toLowerCase', async () => {
      await testMethodOnce('toLowerCase', 'PE1KIeT$', 'pe1kiet$');
    });

    test('toUpperCase', async () => {
      await queue.add('default', Person);
      await check('job.data.firstName.toUpperCase() == "FRANCIS"');
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
      const cases = [
        ['  \n good  bye \t  ', 'good  bye'],
        [' ggggoodbyeeeee', 'ge', ' ggggoodby'],
        ['    ggggoodbyeeeee"', ' ge', 'oodby'],
      ];
      testMethod('trim', cases);
    });

    describe('trimStart', () => {
      const cases = [
        ['  \n good  bye \t  ', 'good  bye \t  '],
        [' ggggoodbyeeeee', 'ge', ' ggggoodbyeeeee'],
        ['    ggggoodbyeeeee ', ' gd', 'oodbyeeeee '],
      ];
      testMethod('trimStart', cases);
    });

    describe('trimEnd', () => {
      const cases = [
        ['  \n good  bye \t  ', '  \n good  bye'],
        [' ggggoodbyeeeee', 'ge', ' ggggoodby'],
        [' ggggoodbyeeeee    ', 'e ', ' ggggoodby'],
      ];
      testMethod('trimEnd', cases);
    });
  });

  describe('Date', () => {
    const SAMPLE_DATE_STRING = '2014-01-01T08:15:39.736Z';
    const SampleDate = new Date(SAMPLE_DATE_STRING);

    async function addJob(data: Record<string, any>) {
      await queue.add('default', data);
    }

    async function checkDateMethod(method, date = SampleDate) {
      const expected = date[method]();
      await queue.add('default', { date, expected });
      const condition = `Date.parse(job.data.date).${method}() == job.data.expected`;
      await check(condition);
    }

    describe('parse', () => {
      it('converts an RFC-3339 date string', async () => {
        const dateValue = SampleDate.getTime();
        await addJob({ date: SAMPLE_DATE_STRING, dateValue });
        const condition = 'Date.parse(job.data.date) != null';
        await check(condition);
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
      let job: Job;

      beforeEach(async () => {
        job = await queue.add('default', Person);
      });

      test('"object"', async () => {
        await check('typeof job.data == "object"');
      });

      test('"number"', async () => {
        await check('typeof job.data.jobs == "number"');
      });

      test('"array"', async () => {
        await check('typeof job.data.grades == "array"');
      });

      test('"boolean"', async () => {
        await check('typeof job.data.isActive == "boolean"');
      });

      test('"string"', async () => {
        await check('typeof job.name == "string"');
      });

      test('"null"', async () => {
        await check('typeof job.data.retirement == "null"');
      });
    });

    describe('instanceof', () => {
      let job: Job;

      beforeEach(async () => {
        job = await queue.add('default', Person);
      });

      test('"object"', async () => {
        await check('job.data instanceof "object"');
      });

      test('"number"', async () => {
        await check('job.data.jobs instanceof "number"');
      });

      test('"array"', async () => {
        await check('job.data.grades instanceof "array"');
      });

      test('"boolean"', async () => {
        await check('job.data.isActive instanceof "boolean"');
      });

      test('"string"', async () => {
        await check('job.name instanceof "string"');
      });

      test('"null"', async () => {
        await check('job.data.missing instanceof "null"');
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
      await check('isArray(job.data.grades) == true');
      await check('isArray(job.data.date) == true');
    });
  });

  describe('Array', () => {
    let job: Job;

    beforeEach(async () => {
      job = await queue.add('default', Person);
    });

    test('length', async () => {
      await check('job.data.languages.programming.length == 7');
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
      testFunction('Math.max', cases);
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
      testFunction('Math.min', cases);
    });

    test('includes', async () => {
      await check('job.data.languages.programming.includes("Python")');
    });

    test('includesAll', async () => {
      await check(
        'job.data.languages.spoken.includesAll(["french", "english"])',
      );
    });

    test('reverse', async () => {
      const expected = [...Person.languages.programming].reverse().map(quote);
      await check(
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
      const cases = [
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
        await queue.add('default', { test: asString, expected: data });
        await check('JSON.parse(job.data.test) == job.data.expected');
      });

      it('returns null for an invalid string', async () => {
        await queue.add('default', { test: 'invalid' });
        await check('JSON.parse(job.data.test) == null');
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
        const asString = JSON.stringify(data);
        await queue.add('default', { test: data, expected: asString });
        await check('JSON.parse(job.data.test) == job.data.expected');
      });

      it('returns null for a non object', async () => {
        await queue.add('default', { test: 'invalid' });
        await check('JSON.parse(job.data.test) == null');
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
        await queue.add('default', { test: data, expected: Object.keys(data) });
        await check('job.data.test.getOwnProperties() == job.data.expected');
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
        await queue.add('default', { value: data });
        await check('typeof job.data.value.toString() == "string"');
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

    test('isEmpty', async () => {
      const cases = [
        [null, true],
        [0, false],
        ['', true],
        ['v', false],
        [0, 0],
      ];
      testFunction('isEmpty', cases);
    });
  });

  describe('matches', () => {
    test('can match against non-array property', async () => {
      const data = { l1: [{ tags: 'tag1' }, { notags: 'yep' }] };
      await queue.add('default', data);
      await check('job.data.l1.tags =~ ".*tag.*"');
    });

    test('can match against array property', async () => {
      const data = {
        l1: [{ tags: ['tag1', 'tag2'] }, { tags: ['tag66'] }],
      };
      await queue.add('default', data);
      await check('job.data.l1.tags =~ "^tag*"');
    });
  });
});
