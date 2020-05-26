import { Query } from '@src/server/query';
import { createContext, personData, find, findFirst } from './support';

const obj = { ...personData };
obj['today'] = new Date();

describe('Query Operators', () => {
  function attempt(criteria, expected = true): void {
    const context = createContext();
    const query = new Query(criteria, context);
    expect(query.test(obj)).toEqual(expected);
  }

  describe('Comparison, Evaluation, and Element Operators', () => {
    test('can check for equality with $eq', () => {
      attempt({ firstName: 'Francis' });
    });

    test('can check against regex with literal', () => {
      attempt({ lastName: /^a.+e/i });
    });

    test('can check against regex with $regex operator', () => {
      attempt({ lastName: { $regex: 'a.+e', $options: 'i' } });
    });

    test('can apply $not to direct values', () => {
      attempt({ username: { $not: 'mufasa' } });
    });

    test('can apply $not to sub queries', () => {
      attempt({ username: { $not: { $ne: 'kofrasa' } } });
    });

    test('can compare with $gt', () => {
      attempt({ jobs: { $gt: 1 } });
    });

    test('can compare with $gte', () => {
      attempt({ jobs: { $gte: 6 } });
    });

    test('can compare with $lt', () => {
      attempt({ jobs: { $lt: 10 } });
    });

    test('can compare with $lte', () => {
      attempt({ jobs: { $lte: 6 } });
    });

    test('can check if value does not exists with $exists', () => {
      attempt({ middlename: { $exists: false } });
    });

    test('can check if value exists with $exists', () => {
      attempt({ projects: { $exists: true } });
    });

    test('can compare value inside array at a given index', () => {
      attempt({ 'projects.C.1': 'student_record' });
    });

    test('can check that value is in array with $in', () => {
      attempt({ 'circles.school': { $in: ['Henry'] } });
    });

    test('can check if value does not exist with $in', () => {
      attempt({ middlename: { $in: [null, 'David'] } });
    });

    test('can check that value is not in array with $nin', () => {
      attempt({ 'circles.family': { $nin: ['Pamela'] } });
    });

    test('can check if value exists with $nin', () => {
      attempt({ firstName: { $nin: [null] } });
    });

    test('can determine size of nested array with $size', () => {
      attempt({ 'languages.programming': { $size: 7 } });
    });

    test('can match nested elements in array', () => {
      attempt({ 'projects.Python': 'Flaskapp' });
    });

    test('can find modulo of values with $mod', () => {
      attempt({ 'date.month': { $mod: [8, 1] } });
    });

    test('can check that all values exists in array with $all', () => {
      attempt({ 'languages.spoken': { $all: ['french', 'english'] } });
    });

    test('can match field with object values', () => {
      attempt({ date: { year: 2013, month: 9, day: 25 } });
    });

    test('can match fields for objects in a given position in an array with dot notation', () => {
      attempt({ 'grades.0.grade': 92 });
    });

    test('can match fields for all objects within an array with dot notation', () => {
      attempt({ 'grades.mean': { $gt: 70 } });
    });

    test('can match fields for all objects within an array with $elemMatch', () => {
      attempt({ grades: { $elemMatch: { mean: { $gt: 70 } } } });
    });

    test('can match type of fields with $type', () => {
      attempt({ today: { $type: 9 } });
    });

    test('can match with $where expression', () => {
      attempt({ $where: 'this.getJobs === 6 && this.grades.length < 10' });
    });
  });

  describe('Logical Operators', function () {
    describe('$and', () => {
      test('can use conjunction true AND true', () => {
        attempt({ $and: [{ firstName: 'Francis' }, { lastName: /^a.+e/i }] });
      });

      test('can use conjunction true AND false', () => {
        attempt(
          { $and: [{ firstName: 'Francis' }, { lastName: 'Amoah' }] },
          false,
        );
      });

      test('can use conjunction false AND true', () => {
        attempt(
          { $and: [{ firstName: 'Enoch' }, { lastName: 'Asante' }] },
          false,
        );
      });

      test('can use conjunction false AND false', () => {
        attempt(
          { $and: [{ firstName: 'Enoch' }, { age: { $exists: true } }] },
          false,
        );
      });
    });

    describe('$or', () => {
      test('can use conjunction true OR true', () => {
        attempt({ $or: [{ firstName: 'Francis' }, { lastName: /^a.+e/i }] });
      });

      test('can use conjunction true OR false', () => {
        attempt({ $or: [{ firstName: 'Francis' }, { lastName: 'Amoah' }] });
      });

      test('can use conjunction false OR true', () => {
        attempt({ $or: [{ firstName: 'Enoch' }, { lastName: 'Asante' }] });
      });

      test('can use conjunction false OR false', () => {
        attempt(
          { $or: [{ firstName: 'Enoch' }, { age: { $exists: true } }] },
          false,
        );
      });
    });

    describe('$nor', () => {
      test('can use conjunction true NOR true', () => {
        attempt(
          { $nor: [{ firstName: 'Francis' }, { lastName: /^a.+e/i }] },
          false,
        );
      });

      test('can use conjunction true NOR false', () => {
        attempt(
          { $nor: [{ firstName: 'Francis' }, { lastName: 'Amoah' }] },
          false,
        );
      });

      test('can use conjunction false NOR true', () => {
        attempt(
          { $nor: [{ firstName: 'Enoch' }, { lastName: 'Asante' }] },
          false,
        );
      });

      test('can use conjunction false NOR false', () => {
        attempt({ $nor: [{ firstName: 'Enoch' }, { age: { $exists: true } }] });
      });
    });
  });

  describe('Query array operators', function () {
    test('can match object using $all with $elemMatch', () => {
      const data = [
        {
          _id: '5234ccb7687ea597eabee677',
          code: 'efg',
          tags: ['school', 'book'],
          qty: [
            { size: 'S', num: 10, color: 'blue' },
            { size: 'M', num: 100, color: 'blue' },
            { size: 'L', num: 100, color: 'green' },
          ],
        },
        {
          _id: '52350353b2eff1353b349de9',
          code: 'ijk',
          tags: ['electronics', 'school'],
          qty: [{ size: 'M', num: 100, color: 'green' }],
        },
      ];
      const q = new Query(
        {
          qty: {
            $all: [
              { $elemMatch: { size: 'M', num: { $gt: 50 } } },
              { $elemMatch: { num: 100, color: 'green' } },
            ],
          },
        },
        createContext(),
      );

      let result = true;
      data.forEach((obj) => {
        result = result && q.test(obj);
      });

      expect(result).toBe(true);
    });

    describe('selector tests', () => {
      const data = [
        {
          key0: [
            {
              key1: [
                [[{ key2: [{ a: 'value2' }, { a: 'dummy' }, { b: 20 }] }]],
                { key2: 'value' },
              ],
              key1a: { key2a: 'value2a' },
            },
          ],
        },
      ];

      function attempt(query, expected): void {
        const result = find(data, query);
        expect(result).toStrictEqual(expected);
      }

      test('should not match without array index selector to nested value ', () => {
        attempt({ 'key0.key1.key2.a': 'value2' }, []);
      });

      test('should not match without enough depth for array index selector to nested value', () => {
        attempt({ 'key0.key1.0.key2.a': 'value2' }, []);
      });

      test('should match with full array index selector to deeply nested value', () => {
        attempt({ 'key0.key1.0.0.key2.a': 'value2' }, data);
      });

      test('should match with array index selector to nested value at depth 1', () => {
        attempt({ 'key0.key1.0.0.key2': { b: 20 } }, data);
      });

      test('should match with full array index selector to nested value', () => {
        attempt({ 'key0.key1.1.key2': 'value' }, data);
      });

      test('should match without array index selector to nested value at depth 1', () => {
        attempt({ 'key0.key1.key2': 'value' }, data);
      });

      test('should match shallow nested value with array index selector', () => {
        attempt({ 'key0.key1.1.key2': 'value' }, data);
      });

      // fixtures = [
      //   [{'key0.key1': [[{key2: [{a: 'value2'}, {a: 'dummy'}, {b: 20}]}]]}, 'should match full key selector'],
      //   [{'key0.key1.0': [[{key2: [{a: 'value2'}, {a: 'dummy'}, {b: 20}]}]]}, 'should match with key<-->index selector'],
      //   [{'key0.key1.0.0': [{key2: [{a: 'value2'}, {a: 'dummy'}, {b: 20}]}]}, 'should match with key<-->multi-index selector'],
      //   [{'key0.key1.0.0.key2': [{a: 'value2'}, {a: 'dummy'}, {b: 20}]}, 'should match with key<-->multi-index<-->key selector']
      // ];
      //
      // // should match whole objects
      // fixtures.forEach(function (row) {
      //   const query = row[0], message = row[1];
      //   const result = find(data, query);
      //
      //   // using iterator
      //   if (!isEqual(result, data)) {
      //     throw new Error(message)
      //   }
      //   assert(result.length === 0, "iterator should be empty");
      // });
    });

    test('should match nested array of objects without indices', () => {
      // https://github.com/kofrasa/mingo/issues/51
      const data = [{ key0: [{ key1: ['value'] }, { key1: ['value1'] }] }];
      const result = findFirst(data, { 'key0.key1': { $eq: 'value' } });
      expect(result).toStrictEqual(data[0]);
    });

    test('should project all matched elements of nested array', () => {
      // https://github.com/kofrasa/mingo/issues/93
      const data = [
        {
          id: 1,
          sub: [
            { id: 11, name: 'OneOne', test: true },
            { id: 22, name: 'TwoTwo', test: false },
          ],
        },
      ];

      const result = find(data, {}, { 'sub.id': 1, 'sub.name': 1 });
      expect(result).toStrictEqual([
        {
          sub: [
            { id: 11, name: 'OneOne' },
            { id: 22, name: 'TwoTwo' },
          ],
        },
      ]);
    });

    test('should project multiple nested elements', () => {
      /*
       https://github.com/kofrasa/mingo/issues/105 -
       fix merging distinct objects during projection
      */
      const result = find(
        [{ items: [{ from: 1 }, { to: 2 }] }],
        {},
        { 'items.from': 1, 'items.to': 1 },
      );
      expect(result).toStrictEqual([{ items: [{ from: 1 }, { to: 2 }] }]);
    });

    test('project multiple nested elements with missing keys', () => {
      // extended test for missing keys of nested values
      const result = find(
        [{ items: [{ from: 1, to: null }, { to: 2 }] }],
        {},
        { 'items.from': 1, 'items.to': 1 },
      );
      expect(result).toStrictEqual([
        {
          items: [
            {
              from: 1,
              to: null,
            },
            { to: 2 },
          ],
        },
      ]);
    });

    test('project multiple nested objects with missing keys and matched out of order', () => {
      /*
       https://github.com/kofrasa/mingo/issues/106 -
       fix nested elements splitting after projection due to out of order matching
      */
      const result = find(
        [{ history: [{ user: 'Jeff', notes: 'asdf' }, { user: 'Gary' }] }],
        {},
        {
          'history.user': 1,
          'history.notes': 1,
        },
      );

      expect(result).toStrictEqual([
        {
          history: [
            {
              user: 'Jeff',
              notes: 'asdf',
            },
            {
              user: 'Gary',
            },
          ],
        },
      ]);
    });
  });

  test('$regex test - can match nested values', function () {
    // no regex - returns expected list: 1 element - ok
    const res = [];
    res.push(
      find([{ l1: [{ tags: ['tag1', 'tag2'] }, { notags: 'yep' }] }], {
        'l1.tags': 'tag1',
      }),
    );

    // with regex - but searched property is not an array: ok
    res.push(
      find([{ l1: [{ tags: 'tag1' }, { notags: 'yep' }] }], {
        'l1.tags': { $regex: '.*tag.*', $options: 'i' },
      }),
    );

    // with regex - but searched property is an array, with all elements
    // matching: not ok - expected 1, returned 0
    res.push(
      find([{ l1: [{ tags: ['tag1', 'tag2'] }, { tags: ['tag66'] }] }], {
        'l1.tags': {
          $regex: 'tag',
          $options: 'i',
        },
      }),
    );

    // with regex - but searched property is an array, only one element matching:
    // not ok - returns 0 elements - expected 1
    res.push(
      find([{ l1: [{ tags: ['tag1', 'tag2'] }, { notags: 'yep' }] }], {
        'l1.tags': { $regex: 'tag', $options: 'i' },
      }),
    );

    expect(res.every((x) => x.length === 1)).toBe(true);
  });

  describe('$expr tests', function () {
    // https://docs.mongodb.com/manual/reference/operator/query/expr/

    test('compare two fields from a single document', () => {
      const res = find(
        [
          { _id: 1, category: 'food', budget: 400, spent: 450 },
          { _id: 2, category: 'drinks', budget: 100, spent: 150 },
          { _id: 3, category: 'clothes', budget: 100, spent: 50 },
          { _id: 4, category: 'misc', budget: 500, spent: 300 },
          { _id: 5, category: 'travel', budget: 200, spent: 650 },
        ],
        { $expr: { $gt: ['$spent', '$budget'] } },
      );

      expect(res).toStrictEqual([
        { _id: 1, category: 'food', budget: 400, spent: 450 },
        { _id: 2, category: 'drinks', budget: 100, spent: 150 },
        { _id: 5, category: 'travel', budget: 200, spent: 650 },
      ]);
    });

    test('using $expr with conditional statements', () => {
      const res = find(
        [
          { _id: 1, item: 'binder', qty: 100, price: 12 },
          { _id: 2, item: 'notebook', qty: 200, price: 8 },
          { _id: 3, item: 'pencil', qty: 50, price: 6 },
          { _id: 4, item: 'eraser', qty: 150, price: 3 },
        ],
        {
          $expr: {
            $lt: [
              {
                $cond: {
                  if: { $gte: ['$qty', 100] },
                  then: { $divide: ['$price', 2] },
                  else: { $divide: ['$price', 4] },
                },
              },
              5,
            ],
          },
        },
      );

      expect(res).toStrictEqual([
        { _id: 2, item: 'notebook', qty: 200, price: 8 },
        { _id: 3, item: 'pencil', qty: 50, price: 6 },
        { _id: 4, item: 'eraser', qty: 150, price: 3 },
      ]);
    });
  });

  test('null or missing fields', function () {
    const data = [{ _id: 1, item: null }, { _id: 2 }];
    const fixtures = [
      // query, result, message
      [
        { item: null },
        [{ _id: 1, item: null }, { _id: 2 }],
        'should return all documents',
      ],
      [
        { item: { $type: 10 } },
        [{ _id: 1, item: null }],
        'should return one document with null field',
      ],
      [
        { item: { $exists: false } },
        [{ _id: 2 }],
        'should return one document without null field',
      ],
      [
        { item: { $in: [null, false] } },
        [{ _id: 1, item: null }, { _id: 2 }],
        '$in should return all documents',
      ],
    ];
    for (let i = 0; i < fixtures.length; i++) {
      const arr = fixtures[i];
      const res = find(data, arr[0]);
      expect(res).toStrictEqual(arr[1]);
    }
  });
});

test('Match $all with $elemMatch on nested elements', () => {
  const data = [
    {
      user: {
        username: 'User1',
        projects: [
          { name: 'Project 1', rating: { complexity: 6 } },
          { name: 'Project 2', rating: { complexity: 2 } },
        ],
      },
    },
    {
      user: {
        username: 'User2',
        projects: [
          { name: 'Project 1', rating: { complexity: 6 } },
          { name: 'Project 2', rating: { complexity: 8 } },
        ],
      },
    },
  ];
  const criteria = {
    'user.projects': {
      $all: [{ $elemMatch: { 'rating.complexity': { $gt: 6 } } }],
    },
  };
  // It should return one user object
  const result = find(data, criteria).length;
  expect(result).toBe(1);
});

describe('Query $elemMatch operator', function () {
  test('simple $elemMatch query', () => {
    const result = find(
      [
        { _id: 1, results: [82, 85, 88] },
        { _id: 2, results: [75, 88, 89] },
      ],
      { results: { $elemMatch: { $gte: 80, $lt: 85 } } },
    )[0];

    expect(result).toStrictEqual({ _id: 1, results: [82, 85, 88] });
  });

  test('$elemMatch on embedded documents', () => {
    const products = [
      {
        _id: 1,
        results: [
          { product: 'abc', score: 10 },
          { product: 'xyz', score: 5 },
        ],
      },
      {
        _id: 2,
        results: [
          { product: 'abc', score: 8 },
          { product: 'xyz', score: 7 },
        ],
      },
      {
        _id: 3,
        results: [
          { product: 'abc', score: 7 },
          { product: 'xyz', score: 8 },
        ],
      },
    ];
    const result = findFirst(products, {
      results: { $elemMatch: { product: 'xyz', score: { $gte: 8 } } },
    });

    expect(result).toStrictEqual({
      _id: 3,
      results: [
        { product: 'abc', score: 7 },
        { product: 'xyz', score: 8 },
      ],
    });
  });

  test('$elemMatch single document', () => {
    const products = [
      {
        _id: 1,
        results: [
          { product: 'abc', score: 10 },
          { product: 'xyz', score: 5 },
        ],
      },
      {
        _id: 2,
        results: [
          { product: 'abc', score: 8 },
          { product: 'xyz', score: 7 },
        ],
      },
      {
        _id: 3,
        results: [
          { product: 'abc', score: 7 },
          { product: 'xyz', score: 8 },
        ],
      },
    ];
    const result = find(products, {
      results: { $elemMatch: { product: 'xyz' } },
    });
    expect(result).toStrictEqual(products);
  });

  test('general comparison matching', () => {
    // Test for https://github.com/kofrasa/mingo/issues/103
    const fixtures = [
      [{ $eq: 50 }],
      [{ $lt: 50 }],
      [{ $lte: 50 }],
      [{ $gt: 50 }],
      [{ $gte: 50 }],
    ];

    fixtures.forEach((args) => {
      const query = new Query(
        { scores: { $elemMatch: args[0] } },
        createContext(),
      );
      const op = Object.keys(args[0])[0];
      // test if an object matches query
      if (!query.test({ scores: [10, 50, 100] })) {
        throw new Error('$elemMatch: should filter with ' + op);
      }
    });
  });
});
