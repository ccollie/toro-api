import { compileExpression } from './utils';
import { clearDb, createClient, createQueue } from '../../__tests__/factories';
import { Job, Queue, Command, scriptLoader } from 'bullmq';
import { Scripts } from '../';
import * as path from 'path';

const loadCommand = scriptLoader.loadCommand;

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

const isPrimitive = (val: unknown) => {
  if (val === null) {
    return true;
  }
  return !(typeof val == 'object' || typeof val == 'function');
};

describe('filterJobs', () => {
  let client;
  let queue: Queue;
  let command: Command;

  const SCRIPT_NAME = path.normalize('../jobFilter-1.lua');

  beforeAll(async () => {
    command = await loadCommand(SCRIPT_NAME);
  });

  beforeEach(async () => {
    client = await createClient();
    await clearDb(client);
    client.defineCommand(command.name, command.options);
    queue = await createQueue();
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
    const { compiled } = compileExpression(criteria);
    const { jobs } = await Scripts.getJobsByFilter(
      queue,
      'waiting',
      compiled,
      null,
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

  async function testExpression(
    expression: string,
    expectedValue: any,
    context: Record<string, unknown> | null = {},
    expectMatch = true,
  ) {
    const res = await evalExpression(expression, context);

    if (expectedValue === null) {
      expect(res).toBeNull();
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

  async function check(criteria: string, expectMatch = true): Promise<void> {
    const { compiled } = compileExpression(criteria);
    const { jobs } = await Scripts.getJobsByFilter(
      queue,
      'waiting',
      compiled,
      undefined,
      0,
    );
    expect(!!jobs?.length).toEqual(expectMatch);
  }

  async function checkExpression(
    expression: string,
    expectedValue: any,
    expectMatch = true,
  ) {
    const criteria = `(${expression}) == ${expectedValue}`;
    await check(criteria, expectMatch);
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

  describe('Basic field access', () => {
    beforeEach(async() => {
      await queue.add('default', Person);
    });

    describe('id', () => {
      it('can access the id', async () => {
        await check('job.id != null');
      });

      it('should be a string', async () => {
        await check('typeof job.id == "string"');
      });
    });

    describe('name', () => {
      it('should be defined', async () => {
        await check('job.name != null');
      });

      it('should be a string', async () => {
        await check('typeof job.name == "string"');
        await check('job.name == "default"');
      });
    });

    describe('timestamp', () => {
      it('is defined', async () => {
        await check('job.timestamp != null');
      });

      it('should be a number', async () => {
        await check('typeof job.timestamp == "number"');
      });
    });

    describe('data', () => {
      it('should be defined', async () => {
        await check('job.data != null');
      });

      it('should be a an object', async () => {
        await check('typeof job.data == "object"');
      });
    });

    describe('opts', () => {
      it('should be defined', async () => {
        await check('job.opts != null');
      });

      it('should be a an object', async () => {
        await check('typeof job.opts == "object"');
      });
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
      // Question: is there any circumstance in which a job's timestamp is not set ??
      it('returns null if the job has not started', async () => {
        expect(job.processedOn).not.toBeDefined();
        const filter = 'job.waitTime == null';
        await check(filter, true);
      });

      it('returns the correct value', async () => {
        await updateJob({ processedOn: Date.now() + 1000 });
        const filter = 'job.waitTime == (job.processedOn - job.timestamp)';
        await check(filter, true);
      });
    });

    describe('runtime', () => {
      it('returns null if the job has not started', async () => {
        expect(job.processedOn).not.toBeDefined();
        const filter = 'job.runtime == null';
        await check(filter, true);
      });

      it('returns the correct value', async () => {
        await updateJob({
          processedOn: Date.now() + 1000,
          finishedOn: Date.now() + 4000,
        });
        const filter = 'job.runtime == (job.finishedOn - job.processedOn)';
        await check(filter, true);
      });
    });
  });

  describe('Binary Operators', () => {
    let job: Job;

    beforeEach(async () => {
      job = await queue.add('default', Person);
    });

    test('==', async () => {
      await check('job.data.firstName == "Francis"');
    });

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

    test('%', async () => {
      await check('job.data.date.month % 8 == 1');
    });

    describe('??', () => {
      test('returns alternate when lvalue is null', async () => {
        await check('(job.data.missing_value ?? 100) == 100');
      });
    });

  });


  describe('Logical Operators', function () {
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
          'job.data.firstName == "Enoch" && job.data.lastName == "Asante"',
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

      async function testAccessor(query, expected = true): Promise<void> {
        await queue.add('default', data);
        return check(query, expected);
      }

      // eslint-disable-next-line max-len
      test('deep matching on nested value', async () => {
        await testAccessor('job.data.key0.key1[0][0].key2.a == "value2"');
      });

      test('should match with full array index selector to nested value', async () => {
        await testAccessor('job.data.key0.key1[1].key2 == "value"');
      });

      test('should match shallow nested value with array index selector', async () => {
        await testAccessor('job.data.key0.key1[1].key2 == "value"');
      });
    });
  });

  describe('Logical Operators', () => {
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

    it('!', async () => {
      const condition = '!(job.data.qty > 250)';
      await checkExpressionByList(
        inventory,
        condition,
        (data) => !(data.qty > 250),
        '_id',
      );
    });
  });

  describe('Ternary Operator', () => {
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

    test('supports ternary operator', async () => {
      const conditional = '(job.data.lowScore < job.data.highScore) ? 5 : 25';
      await checkExpression(conditional, 5);
    });

    test('handles complex expressions', async () => {
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

  describe('Strings', () => {
    test('length', async () => {
      await queue.add('default', Person);
      await check('job.data.title.length == ' + Person.title.length);
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

    test('includes', async () => {
      await check('job.data.languages.programming.includes("Python")');
    });

    test('includesAll', async () => {
      await check(
        'job.data.languages.spoken.includesAll(["french", "english"])',
      );
    });
  });

  describe('matches', () => {
    test('can match against array property', async () => {
      const data = {
        l1: { tags: ['tag1', 'tag2'] },
      };
      await queue.add('default', data);
      await check('job.data.l1.tags =~ "^tag*"');
    });
  });
});
