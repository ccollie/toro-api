import { clearDb, createClient } from '../utils';
import { createQueue } from '../factories';
import { Job, Queue } from 'bullmq';
import { Scripts } from '../../../src/server/commands/scripts';


const Person = {
  "_id": "100",
  "firstName": "Francis",
  "lastName": "Asante",
  "username": "kofrasa",
  "title": "Software Engineer",
  "degree": "Computer Science",
  "jobs": 6,
  "isActive": true,
  "date": {
    "year": 2013,
    "month": 9,
    "day": 25
  },
  "languages": {
    "spoken": ["english", "french", "spanish"],
    "programming": ["C", "Python", "Scala", "Java", "Javascript", "Bash", "C#"]
  },
  "circles": {
    "school": ["Kobby", "Henry", "Kanba", "Nana", "Albert", "Yayra", "Linda", "Sophia"],
    "work": ["Kobby", "KT", "Evans", "Robert", "Ehi", "Ebo", "KO"],
    "family": ["Richard", "Roseline", "Michael", "Rachel"]
  },
  "projects": {
    "C": ["word_grid", "student_record", "calendar"],
    "Java": ["Easy Programming Language", "SurveyMobile"],
    "Python": ["Kasade", "Code Jam", "Flaskapp", "FlaskUtils"],
    "Scala": [],
    "Javascript": ["mingo", "Backapp", "BackboneApp", "Google Election Maps"]
  },
  "grades": [
    {"grade": 92, "mean": 88, "std": 8},
    {"grade": 78, "mean": 90, "std": 5},
    {"grade": 88, "mean": 85, "std": 3}
  ],
  "retirement": null,
  "today": "1970-01-01"
};


describe('getJobsByFilter', () => {
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
    criteria: Record<string, any>): Promise<any[]> {
    const bulkData = arr.map((item) => {
      return {name: 'default', data: item}
    })
    await queue.addBulk(bulkData)
    const {jobs} = await Scripts.getJobsByFilter(queue, 'waiting', criteria, 0, 100);
    return jobs.map((job) => job.data);
  }

  async function checkExpressionByList(
    data: Record<string,any>[],
    query: Record<string, any>,
    filterFn: (any) => boolean = () => true,
    sortBy: string = null): Promise<void> {
    // were checking expression operators, so transform query
    const criteria = { $expr: query };
    let result = (await find(data, criteria));
    let expected = data.filter(filterFn);
    if (sortBy) {
      const compare = (a: Record<string, any>, b: Record<string, any>) => {
        const a2 = a[sortBy];
        const b2 = b[sortBy];
        return a2 === b2 ? 0 : (a2 < b2 ? 1 : -1);
      }
      result = result.sort(compare);
      expected = expected.sort(compare);
    }

    expect(result).toStrictEqual(expected);
  }

  async function findFirst(
    arr: Record<string, any>[],
    criteria: Record<string, any>): Promise<Record<string, any>> {
    const data = await find(arr, criteria);
    return data?.length ? data[0] : null;
  }

  async function attempt(criteria, expectMatch = true): Promise<void> {
    const {jobs} = await Scripts.getJobsByFilter(queue, 'waiting', criteria, 0);
    expect(!!jobs.length).toEqual(expectMatch);
  }

  async function checkExpression(
    expression: Record<string, any>,
    expectedValue: any,
    expectMatch = true) {
    const criteria = { $expr: {$eq: [expression, expectedValue]}};
    await attempt(criteria, expectMatch);
  }

  function testExpressionCases(operator, cases) {
    test.each(cases)(`${operator}: %p`, async (args, expected) => {
      const data = {};
      const condition = {};
      if (Array.isArray(args) && args.length == 2) {
        data['first'] = args[0];
        data['second'] = args[1];
        condition[operator] = ['$data.first', '$data.second']
      } else {
        data['value'] = args;
        condition[operator] = '$data.value';
      }

      await queue.add('default', data);
      await checkExpression(condition, expected);
    });
  }

  describe('Basic field access', () => {
    let job;

    beforeEach(async () => {
      job = await queue.add('default', Person);
    });

    it('can access basic job fields', async () => {
      await attempt({id: {$exists: true}})
      await attempt({name: {$exists: true}});
      await attempt({timestamp: {$exists: true}});
      await attempt({data: {$exists: true}});
      await attempt({opts: {$exists: true}})
    })
  });

  describe('Comparison, Evaluation, and Element Operators', () => {
    let job: Job;

    beforeEach(async () => {
      job = await queue.add('default', Person);
    });

    test('$eq', async () => {
      await attempt({'data.firstName': 'Francis'});
      await attempt({'data.firstName': { $eq: 'Francis' }});
    });

    test('$eq with object values', async () => {
      await attempt({'data.date': {year: 2013, month: 9, day: 25}});
    });

    test('$eq with objects in a given position in an array with dot notation', async () => {
      await attempt({'data.grades.0.grade': 92});
    });

    test('$eq with nested elements in array', async () => {
      await attempt({'data.projects.Python': 'Flaskapp'});
    });

    test('$matches', async () => {
      await attempt({'data.lastName': {$matches: 'a.+e'}});
    });

    test('$not with direct values', async () => {
      await attempt({'data.username': {$not: 'mufasa'}});
    });

    test('$not with sub queries', async () => {
      await attempt({'data.username': {$not: {$ne: 'kofrasa'}}});
    });

    test('$gt', async () => {
      await attempt({'data.jobs': {$gt: 1}});
    });

    test('$gte', async () => {
      await attempt({'data.jobs': {$gte: 6}});
    });

    test('$lt', async () => {
      await attempt({'data.jobs': {$lt: 10}});
    });

    test('$lte', async () => {
      await attempt({'data.jobs': {$lte: 6}});
    });

    test('$exists (false)', async () => {
      await attempt({'data.middlename': {$exists: false}});
    });

    test('$exists (true)', async () => {
      await attempt({id: {$exists: true}});
    });

    test('can compare value inside array at a given index', async () => {
      await attempt({'data.projects.C.1': 'student_record'});
    });

    test('$in', async () => {
      await attempt({'data.circles.school': {$in: ['Henry']}});
    });

    test('$in (false)', async () => {
      await attempt({'data.middlename': {$in: [null, 'David']}});
    });

    test('$nin (false)', async () => {
      await attempt({'data.circles.family': {$nin: ['Pamela']}});
    });

    test('$nin', async () => {
      await attempt({'data.firstName': {$nin: [null]}});
    });

    test('$size', async () => {
      await attempt({'data.languages.programming': {$size: 7}});
    });

    test('can find modulo of values with $mod', async () => {
      await attempt({'data.date.month': {$mod: [8, 1]}});
    });

    test('$all', async () => {
      await attempt({'data.languages.spoken': {$all: ['french', 'english']}});
    });

    test('can match fields for all objects within an array with dot notation', async () => {
      await attempt({'data.grades.mean': {$gt: 70}});
    });

  });

  describe('Query Logical Operators', function () {
    let job: Job;

    beforeEach(async () => {
      job = await queue.add('default', Person);
    });

    describe('$and', () => {
      test('can use conjunction true AND true', async () => {
        await attempt({
          $and: [{'data.firstName': 'Francis'}, {'name': 'default'}]
        });
      });

      test('can use conjunction true AND false', async () => {
        await attempt(
          {$and: [{'data.firstName': 'Francis'}, {'data.lastName': 'Amoah'}]},
          false,
        );
      });

      test('can use conjunction false AND true', async () => {
        await attempt(
          {$and: [{'data.firstName': 'Enoch'}, {'data.lastName': 'Asante'}]},
          false,
        );
      });

      test('can use conjunction false AND false', async () => {
        await attempt(
          {$and: [{'data.firstName': 'Enoch'}, {'data.age': {$exists: true}}]},
          false,
        );
      });
    });

    describe('$or', () => {
      test('can use conjunction true OR true', async () => {
        await attempt({
          $or: [{'data.firstName': 'Francis'}, {'data.lastName': {$matches: '^%a.+e'}}]
        });
      });

      test('can use conjunction true OR false', async () => {
        await attempt({
          $or: [
            {'data.firstName': 'Francis'},
            {'data.lastName': 'Amoah'}
          ]
        });
      });

      test('can use conjunction false OR true', async () => {
        await attempt({
          $or: [{'data.firstName': 'Enoch'}, {'data.lastName': 'Asante'}]
        });
      });

      test('can use conjunction false OR false', async () => {
        await attempt({
            $or: [
              {'data.firstName': 'Enoch'},
              {'data.age': {$exists: true}}
            ]
          },
          false,
        );
      });
    });

    describe('$nor', () => {
      test('can use conjunction true NOR true', async () => {
        await attempt(
          {$nor: [{'data.firstName': 'Francis'}, {'data.lastName': {$matches: '^a.+e$'}}]},
          false,
        );
      });

      test('can use conjunction true NOR false', async () => {
        await attempt(
          {$nor: [{'data.firstName': 'Francis'}, {'data.lastName': 'Amoah'}]},
          false,
        );
      });

      test('can use conjunction false NOR true', async () => {
        await attempt(
          {$nor: [{'data.firstName': 'Enoch'}, {'data.lastName': 'Asante'}]},
          false,
        );
      });

      test('can use conjunction false NOR false', async () => {
        await attempt({
          $nor: [
            {'data.firstName': 'Enoch'},
            {'data.age': {$exists: true}}
          ]
        });
      });
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
                      key2:
                        [ {a: 'value2'}, {a: 'dummy'}, {b: 20} ]
                    }
                  ]
                ],
                {key2: 'value'},
              ],
              key1a: {key2a: 'value2a'},
            },
          ],
        },
      ];

      async function attempt(query, expected): Promise<void> {
        const result = await find(data, query);
        expect(result).toStrictEqual(expected);
      }

      test('should not match without array index selector to nested value ', async () => {
        await attempt({'data.key0.key1.key2.a': 'value2'}, []);
      });

      test('should not match without enough depth for array index selector to nested value', async () => {
        await attempt({'data.key0.key1.0.key2.a': 'value2'}, []);
      });

      test('should match with full array index selector to deeply nested value', async () => {
        await attempt({'data.key0.key1.0.0.key2.a': 'value2'}, data);
      });

      test('should match with array index selector to nested value at depth 1', async () => {
        await attempt({'data.key0.key1.0.0.key2': {b: 20}}, data);
      });

      test('should match with full array index selector to nested value', async () => {
        await attempt({'data.key0.key1.1.key2': 'value'}, data);
      });

      test('should match without array index selector to nested value at depth 1', async () => {
        await attempt({'data.key0.key1.key2': 'value'}, data);
      });

      test('should match shallow nested value with array index selector', async () => {
        await attempt({'data.key0.key1.1.key2': 'value'}, data);
      });

    });

    test('should match nested array of objects without indices', async () => {
      // https://github.com/kofrasa/mingo/issues/51
      const data = [{key0: [{key1: ['value']}, {key1: ['value1']}]}];
      const result = await findFirst(data, {'data.key0.key1': {$eq: 'value'}});
      expect(result).toStrictEqual(data[0]);
    });

  });

  describe('Expression Logical Operators', () => {
    const inventory = [
      {'_id': 1, 'sku': 'abc1', description: 'product 1', qty: 300},
      {'_id': 2, 'sku': 'abc2', description: 'product 2', qty: 200},
      {'_id': 3, 'sku': 'xyz1', description: 'product 3', qty: 250},
      {'_id': 4, 'sku': 'VWZ1', description: 'product 4', qty: 300},
      {'_id': 5, 'sku': 'VWZ2', description: 'product 5', qty: 180}
    ];

    it('$and', async () => {
      const condition = { $and: [{$gt: ['$data.qty', 100]}, {$lt: ['$data.qty', 250]}]};
      await checkExpressionByList(
        inventory,
        condition,
        (data) => data.qty > 100 && data.qty < 250,
        '_id'
      );
    });

    it('$or', async () => {
      const condition = {$or: [{$gt: ['$data.qty', 250]}, {$lt: ['$data.qty', 200]}]};
      await checkExpressionByList(
        inventory,
        condition,
        (data) => data.qty > 250 || data.qty < 200,
        '_id'
      );
    });

    it('$not', async () => {
      const condition = {$not: {$gt: ['$data.qty', 250]} };
      await checkExpressionByList(
        inventory,
        condition,
        (data) => !(data.qty > 250),
        '_id'
      );
    });

    it('$in', async () => {
      const condition = {$in: ['$data.sku', ['abc1', 'abc2']]};
      await checkExpressionByList(
        inventory,
        condition,
        (data) => ['abc1', 'abc2'].includes(data.sku),
        '_id'
      );
    });

    it('$nin', async () => {
      const condition = {$nin: ['$data.sku', ['abc1', 'abc2']]};
      await checkExpressionByList(
        inventory,
        condition,
        (data) => !['abc1', 'abc2'].includes(data.sku),
        '_id'
      );
    });

  });

  describe('Conditional Operators', () => {
    let job: Job;

    const data = {
      lowScore: 100,
      highScore: 200,
      score: 150,
      nullValue: null
    };

    beforeEach(async () => {
      job = await queue.add('default', data);
    });

    async function check(criteria, expectMatch = true): Promise<void> {
      const {jobs} = await Scripts.getJobsByFilter(queue, 'waiting', criteria, 0);
      expect(!!jobs.length).toEqual(expectMatch);
    }

    describe('$cond', () => {

      test('supports options as an object', async () => {
        const conditional = {
          $cond: {
            'if': {$lte: ['$data.lowScore', '$data.highScore']},
            then: 'low',
            else: 'high'
          }
        }
        await checkExpression(conditional, 'low');
      });

      test('supports options as an an array', async () => {
        const conditional = {
          $cond: [{$gte: ['$data.highScore', '$data.lowScore']}, 'high', 'low']
        }
        await checkExpression(conditional, 'high');
      })
    });

    describe('$ifNull', () => {
      test('uses default value if null is found', async () => {
        const conditional = {$ifNull: [null, 'default']};
        await checkExpression(conditional, 'default');
      });

      test('uses non null value', async () => {
        const conditional = {$ifNull: [5, 'default']};
        const criteria = {$expr: {$eq: [5, conditional]}};
        await checkExpression(conditional, 5);
      });

      test('errors on invalid args', async () => {
        const conditional = {$ifNull: [5, 'default', 'error']};
        const criteria = {$expr: {$eq: [5, conditional]}};
        expect(() => check(criteria, false))
          .toThrowError(/\$ifNull expression must resolve to array(2)/)
      });
    });

    describe('$switch', () => {
      type Case = [expression:Record<string, any>, expected: string];
      const cases: Case[] = [
        [
          {
            $switch: {
              branches: [
                {'case': {$lte: ['$data.lowScore', 10]}, then: 'low'},
                {'case': {$gte: ['$data.highScore', 200]}, then: 'high'}
              ],
              'default': 'normal'
            }
          },
          'high'
        ],
        [
          {
            $switch: {
              branches: [
                {'case': {$lte: ['$data.lowScore', '$data.highScore']}, then: 'low'},
                {'case': {$gte: ['$data.highScore', 5000]}, then: 'high'}
              ],
              'default': 'normal'
            }
          },
          'low'
        ],
        [
          {
            $switch: {
              branches: [
                {'case': {$lt: ['$data.lowScore', 10]}, then: 'low'},
                {'case': {$gt: ['$data.score', '$data.highScore']}, then: 'high'}
              ],
              'default': 'normal'
            }
          },
          'normal'
        ]
      ];


      test.each(cases)('%p', async (expr, expected) => {
        await checkExpression(expr, expected);
      })
    })
  });

  describe('Arithmetic Operators', () => {

    describe('$add', () => {
      const cases = [
        [[10, 2], 12],
        [[-1, 5], 4],
        [[-3, -7], -10],
      ];
      testExpressionCases('$add', cases);
    });

    describe('$abs', () => {
      const cases = [
        [ null,	null ],
        [ -1,	1 ] ,
        [ 1,	1 ]
      ];
      testExpressionCases('$abs', cases);
    });

    describe('$subtract', () => {
      const cases = [
        [[-1, -1], 0],
        [[-1, 2], -3],
        [[2, -1], 3]
      ];
      testExpressionCases('$subtract', cases);
    });

    describe('$multiply', () => {
      const cases = [
        [[5, 10], 50],
        [[-2, 4], -8],
        [[-3, -3], 9]
      ];
      testExpressionCases('$multiply', cases);
    });

    describe('$divide', () => {
      const cases = [
        [[80, 4], 20],
        [[1.5, 3], 0.5],
        [[40, 8], 5]
      ];
      testExpressionCases('$divide', cases);
    });

    describe('$round', () => {
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
        [[-45.39, 0], -45]
      ];
      testExpressionCases('$round', cases);
    });

    describe('$trunc', () => {
      const cases = [
        [[null, 0], null],
        [[0, 0],	0],
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
        [[-45.39, 0], -45]
      ];
      testExpressionCases('$trunc', cases);
    });

    describe('$mod', () => {
      const cases = [
        [[80, 7], 3],
        [[40, 4], 0]
      ]
      testExpressionCases('$mod', cases);
    });

    describe('$ceil', () => {
      const cases =
        [
          [ null, null ],
          [ 1, 1 ],
          [ 7.80,	8],
          [ -2.8 ,	-2]
        ];
      testExpressionCases('$ceil', cases)
    });

    describe('$floor', () => {
      const cases =
        [
          [null, null],
          [1 , 1],
          [7.80, 7],
          [-2.8, -3]
        ];
      testExpressionCases('$floor', cases)
    });

    describe('$sqrt', () => {
      const cases =
        [
          [null,	null],
          [NaN,	NaN],
          [25,	5],
          [30,	5.477225575051661]
        ];
      testExpressionCases('$sqrt', cases)
    });

    describe('$max', () => {
      const cases = [
        [1, 1],
        [[null], null],
        [[1.5, 3], 3],
        [[-1, null, '13', 4], 4],
        [[0, 0.005], 0.005],
        [[-67, 1], 1],
        [[0, 1,  19, -45], 19],
      ];
      testExpressionCases('$max', cases);
    });

    describe('$min', () => {
      const cases = [
        [4, 4],
        [[null], null],
        [[1.5, 3], 1.5],
        [[-1, null, '-13', 4], -1],
        [[0, 0.005], 0],
        [[-20, 71], -20],
        [[0, 1, 3, 19, -45], -45],
      ];
      testExpressionCases('$min', cases);
    });
  });

  describe('String Operators', () => {

    function testTrim(operator, cases) {
      test.each(cases)(`{${operator}: {input: "%p", chars: %p}}`, async (input, chars, expected) => {
        const data = {
          value: input
        };
        const expression = {
          [operator]: { input: '$data.value', ... (chars && {chars})}
        }
        await queue.add('default', data);
        await checkExpression(expression, expected);
      });
    }

    describe('$toLower', () => {
      const cases =
        [
          [ null, null ],
          [ 'hEl1O', 'hel1o' ],
        ];
      testExpressionCases('$toLower', cases)
    });

    describe('$toUpper', () => {
      const cases =
        [
          [ null, null ],
          [ 'This is lOwer', 'THIS IS LOWER' ],
        ];
      testExpressionCases('$toUpper', cases)
    });

    describe('$startsWith', () => {
      const cases =
        [
          [[ null, null ], false],
          [[ 'hyperactive', 'hyper' ], true],
          [[ 'milliseconds', 'not-prefix' ], false],
        ];
      testExpressionCases('$startsWith', cases)
    });

    describe('$endsWith', () => {
      const cases =
        [
          [[ null, null ], false],
          [[ 'hyperactive', 'active' ], true],
          [[ 'milliseconds', 'minutes' ], false],
        ];
      testExpressionCases('$endsWith', cases)
    });

    describe('$strcasecmp', () => {
      const cases = [
        [[null, null], 0],
        [['13Q1', '13q4'], -1],
        [['13Q4', '13q4'], 0],
        [['14Q2', '13q4'], 1]
      ];
      testExpressionCases('$strcasecmp', cases)
    });

    describe('$strLenBytes', () => {
      const cases = [
        ["abcde", 5],
        ["Hello World!", 12],
        ["cafeteria", 9],
        ["" , 0],
        // ["cafétéria", 9],
        // ["$€λG", 4],
        // ["寿司" , 2]
      ];
      testExpressionCases('$strLenBytes', cases)
    });

    describe('$substr', () => {
      const cases = [
        [[null, 2], null],
        [["hello", -1], ''],
        [["hello", 1, -2], 'ello'],
        [["abcde", 1, 2], "bc"],
        [["Hello World!", 6, 5], "World"],
        [["cafeteria", 0, 5], "cafet"],
        [["cafeteria", 5, 4], "eria"],
        [["cafeteria", 7, 3], "ia"],
        [["cafeteria", 3, 1], "e"]
      ];
      testExpressionCases('$substr', cases);
    });

    describe('$substr/$substrBytes', () => {
      const cases = [
        [[null, 2], null],
        [["hello", -1], ''],
        [["hello", 1, -2], 'ello'],
        [["abcde", 1, 2], "bc"],
        [["Hello World!", 6, 5], "World"],
        [["cafeteria", 0, 5], "cafet"],
        [["cafeteria", 5, 4], "eria"],
        [["cafeteria", 7, 3], "ia"],
        [["cafeteria", 3, 1], "e"]
      ];
      testExpressionCases('$substr', cases);
      testExpressionCases('$substrBytes', cases)
    });

    describe('$concat', () => {
      const cases = [
        [[null, 'abc'], null],
        [['a', '-', 'c'], 'a-c']
      ];
      testExpressionCases('$concat', cases)
    });

    describe('$split', () => {
      const cases = [
        [[null, '/'], null],
        [['June-15-2013', '-'], ['June', '15', '2013']],
        [['banana split', 'a'], ['b', 'n', 'n', ' split']],
        [['Hello World', ' '], ['Hello', 'World']],
        [['astronomical', 'astro'], ['', 'nomical']],
        [['pea green boat', 'owl'], ['pea green boat']],
      ];
      testExpressionCases('$split', cases)
    });

    describe('$trim', () => {
      const cases =
        [
          ['  \n good  bye \t  ' , null, 'good  bye'],
          [' ggggoodbyeeeee', 'ge', ' ggggoodby'],
          ['    ggggoodbyeeeee', ' ge', 'oodby'],
          [null, null, null],
        ];
      testTrim('$trim', cases);
    });

    describe('$ltrim', () => {
      const cases = [
        ["  \n good  bye \t  ", null, 'good  bye \t  '],
        [" ggggoodbyeeeee", "ge", ' ggggoodbyeeeee'],
        ["    ggggoodbyeeeee ", " gd", 'oodbyeeeee '],
        [null, null, null],
      ];
      testTrim('$ltrim', cases);
    });

    describe('$rtrim', () => {
      const cases = [
        ["  \n good  bye \t  ", null, '  \n good  bye'],
        [" ggggoodbyeeeee", "ge", ' ggggoodby'],
        [" ggggoodbyeeeee    ", "e ", ' ggggoodby'],
        [null, null, null],
      ];
      testTrim('$rtrim', cases);
    });

  });

  describe('Type Operators', () => {

    describe('$type', () => {
      let job: Job;

      beforeEach(async () => {
        job = await queue.add('default', Person);
      });

      test('can handle "object"', async () => {
        await attempt({'data': {$type: 'object'}});
      });

      test('can handle "number"', async () => {
        await attempt({'data.jobs': {$type: 'number'}});
      });

      test('can handle "array"', async () => {
        await attempt({'data.grades': {$type: 'array'}});
      });

      test('can handle "boolean"', async () => {
        await attempt({'data.isActive': {$type: 'boolean'}});
      });

      test('can handle "string"', async () => {
        await attempt({'name': {$type: 'string'}});
      });

      test('can handle "null"', async () => {
        await attempt({'data.retirement': {$type: 'null'}});
      });

      test('can match multiple types with $type using an array', async () => {
        await attempt({'timestamp': {$type: ['number', 'string']}});
      });
    });

    describe('$toString', () => {
      const cases =
        [
          [ true, 'true' ],
          [ false, 'false' ],
          [ 2.5, '2.5' ],
          [12345, '12345']
        ];
      testExpressionCases('$toString', cases)
    });

    describe('$toBool', () => {
      const cases =
        [
          [ true, true ],
          [ 0, false ],
          [ 1, true ],
          [ "true", true ],
          [ "false", true ],  // Note: All strings convert to true
          [ "", true ]       // Note: All strings convert to true
        ];
      testExpressionCases('$toBool', cases)
    });

    describe('$toBoolEx', () => {
      const cases =
        [
          [ true, true ],
          [ 0, false ],
          [ 1, true ],
          [ 0.25, true ],
          [ -1, true ],
          [ "true", true ],
          [ "false", false ],
          [ "476", true ],
          [ "gibberish", true ],
          [ "", false ]
        ];
      testExpressionCases('$toBoolEx', cases)
    });

    describe('$toLong/$toInt', () => {
      const cases =
        [
          [ 5, 5],
          [ '100', 100 ],
          [ 500, 500 ],
          [ '-487', -487],
        ];
      testExpressionCases('$toLong', cases)
    })

    describe('$toDecimal', () => {
      it('converts values to decimal', async () => {
        const data = [
          { _id: 1, item: "apple", qty: 5, price: "10.0", total: 50 },
          { _id: 2, item: "pie", qty: 10, price: 20.0, total: 200.0 },
          { _id: 3, item: "ice cream", qty: 2, price: "4.99", total: 9.98 },
          { _id: 4, item: "almonds" ,  qty: 4, price: "5.25", total: 21 }
        ];
        const expr = {
          $eq:[ { $multiply: ['$data.qty', { $toDecimal: '$data.price' } ] }, '$data.total']
        };
        await checkExpressionByList(data, expr, () => true, '_id');
      })
    })

  });

  describe('Miscellaneous Expression Operators', () => {

    describe('$cmp', () => {
      it('properly compares values', async() => {
        const data = [
          { "item": "abc1", "qty": 300, expected: 1 },
          { "item": "abc2", "qty": 200, expected: -1 },
          { "item": "xyz1", "qty": 250, expected: 0 },
          { "item": "VWZ1", "qty": 300, expected: 1 },
          { "item": "VWZ2", "qty": 180, expected: -1 }
        ];
        const expr = {$eq: [{ $cmp: ["$data.qty", 250] }, '$data.expected']} ;

        await checkExpressionByList(
          data,
          expr,
          () => true,
          'item'
        );
      });
    });

    describe('$literal', () => {
      const stock = [
        {'_id': 1, 'item': 'abc123', price: '$2.50'},
        {'_id': 2, 'item': 'xyz123', price: '1'},
        {'_id': 3, 'item': 'ijk123', price: '$1'}
      ]

      it('can use $literal in expressions', async () => {
        const expr = { $eq: ['$data.price', { $literal: '$1' }] };
        await checkExpressionByList(stock, expr, (item) => item.price == '$1', '_id');
      })
    });
  })

  describe('$matches', () => {

    test('can match against non-array property', async () => {
      let res = await find([{l1: [{tags: 'tag1'}, {notags: 'yep'}]}], {
        'data.l1.tags': {$matches: '.*tag.*'},
      });
      expect(res.length).toBe(1)
    });

    test('can match against array property', async () => {
      const data = [{
        l1: [
          {tags: ['tag1', 'tag2']},
          {tags: ['tag66'] }
          ]
      }];
      const res = await find(data, {
        'data.l1.tags': {
          $matches: '^tag*',
        },
      });
      expect(res.length).toBe(1)
    });

  });

  describe('$expr tests', function () {
    // https://docs.mongodb.com/manual/reference/operator/query/expr/

    test('compare two fields from a single document', async () => {
      const data = [
          {_id: 1, category: 'food', budget: 400, spent: 450},
          {_id: 2, category: 'drinks', budget: 100, spent: 150},
          {_id: 3, category: 'clothes', budget: 100, spent: 50},
          {_id: 4, category: 'misc', budget: 500, spent: 300},
          {_id: 5, category: 'travel', budget: 200, spent: 650},
      ];

      const expr = {$gt: ['$data.spent', '$data.budget']};

      await checkExpressionByList(data, expr, (data) => data.spent > data.budget, '_id');
    });

    test('using $expr with conditional statements', async () => {
      const data = [
        {_id: 1, item: 'binder', qty: 100, price: 12},
        {_id: 2, item: 'notebook', qty: 200, price: 8},
        {_id: 3, item: 'pencil', qty: 50, price: 6},
        {_id: 4, item: 'eraser', qty: 150, price: 3},
      ];

      function calcValue(data) {
        const { qty, price } = data;
        return price / (qty >= 100 ? 2 : 4);
      }

      const expr = {
          $lt: [
            {
              $cond: {
                if: {$gte: ['$data.qty', 100]},
                then: {$divide: ['$data.price', 2]},
                else: {$divide: ['$data.price', 4]},
              },
            },
            5,
          ]
        };

      await checkExpressionByList(data, expr, (data) => calcValue(data) < 5, '_id');

    });
  });

  describe('null or missing fields', () => {
    const data = [{_id: 1, item: null}, {_id: 2}];

    async function attempt(criteria, expected) {
      const res = await find(data, criteria);
      expect(res).toStrictEqual(expected);
    }

    test('should return all documents', async () => {
      const expected = [{_id: 1, item: null}, {_id: 2}];
      await attempt({'data.item': null}, expected);
    });

    test('should return one document with null field', async () => {
      const query = {'data.item': {$type: 'null'}};
      const expected = [{_id: 1, item: null}];
      await attempt(query, expected);
    });

    test('should return one document without null field', async () => {
      const query = {'data.item': {$exists: false}};
      const expected = [{_id: 2}];
      await attempt(query, expected);
    });

    test('$in should return all documents', async function () {
      const query = {'data.item': {$in: [null, false]}};
      const expected = [{_id: 1, item: null}, {_id: 2}];
      await attempt(query, expected);
    });
  });

});

