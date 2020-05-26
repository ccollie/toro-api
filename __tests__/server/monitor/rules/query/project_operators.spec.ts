import { Query } from '@src/server/query';
import { $project } from '@src/server/query/pipeline/project';
import { assert } from '@src/server/query/utils';
import { get, isEqual } from 'lodash';
import {
  find,
  findFirst,
  personData,
  studentsData,
  createContext,
} from './support';

const obj = personData;
obj['today'] = new Date();

describe('project $type operator', function () {
  const obj = {
    double: 12323.4,
    string: 'me',
    obj: {},
    array: [],
    boolean: true,
    date: new Date(),
    nothing: null,
    regex: /ab/,
    int: 49023,
    long: Math.pow(2, 32),
    decimal: 20.7823e10,
  };

  function attempt(criteria) {
    return () => {
      const context = createContext();
      const query = new Query(criteria, context);
      expect(query.test(obj)).toBe(true);
    };
  }

  test('can match $type 1 "double"', attempt({ double: { $type: 1 } }));
  test('can match $type 2 "string"', attempt({ string: { $type: 2 } }));
  test('can match $type 3 "obj"', attempt({ obj: { $type: 3 } }));
  test('can match $type 4 "array"', attempt({ array: { $type: 4 } }));
  test('can match $type 6 "undefined"', attempt({ missing: { $type: 6 } }));
  test('can match $type 8 "boolean"', attempt({ boolean: { $type: 8 } }));
  test('can match $type 9 "date"', attempt({ date: { $type: 9 } }));
  test('can match $type 10 "null"', attempt({ nothing: { $type: 10 } }));
  test('can match $type 11 "regexp"', attempt({ regex: { $type: 11 } }));
  test('can match $type 16 "int"', attempt({ int: { $type: 16 } }));
  test('can match $type 18 "long"', attempt({ long: { $type: 18 } }));
  test('can match $type 19 "decimal"', attempt({ decimal: { $type: 19 } }));
  test(
    'do not match unknown $type',
    attempt({ obj: { $not: { $type: 100 } } }),
  );
});

describe('Projection $elemMatch operator', () => {
  const data = [
    {
      id: 1,
      zipcode: '63109',
      students: [
        { name: 'john', school: 102, age: 10 },
        { name: 'jess', school: 102, age: 11 },
        { name: 'jeff', school: 108, age: 15 },
      ],
    },
    {
      id: 2,
      zipcode: '63110',
      students: [
        { name: 'ajax', school: 100, age: 7 },
        { name: 'achilles', school: 100, age: 8 },
      ],
    },
    {
      id: 3,
      zipcode: '63109',
      students: [
        { name: 'ajax', school: 100, age: 7 },
        { name: 'achilles', school: 100, age: 8 },
      ],
    },
    {
      id: 4,
      zipcode: '63109',
      students: [
        { name: 'barney', school: 102, age: 7 },
        { name: 'ruth', school: 102, age: 16 },
      ],
    },
  ];

  test('can project with $elemMatch', () => {
    const result = find(
      data,
      { zipcode: '63109' },
      { students: { $elemMatch: { school: 102 } } },
    );
    expect(result).toStrictEqual([
      { id: 1, students: [{ name: 'john', school: 102, age: 10 }] },
      { id: 3 },
      { id: 4, students: [{ name: 'barney', school: 102, age: 7 }] },
    ]);
  });

  test('can project multiple fields with $elemMatch', () => {
    const result = find(
      data,
      { zipcode: '63109' },
      { students: { $elemMatch: { school: 102, age: { $gt: 10 } } } },
    );
    expect(result).toStrictEqual([
      { id: 1, students: [{ name: 'jess', school: 102, age: 11 }] },
      { id: 3 },
      { id: 4, students: [{ name: 'ruth', school: 102, age: 16 }] },
    ]);
  });

  test('can project with $slice', () => {
    const result = findFirst(data, {}, { students: { $slice: 1 } });
    expect(result.students.length).toEqual(1);
  });
});

describe('Query projection operators', () => {
  test('should project with $slice operator', () => {
    const data = [obj];
    const result = findFirst(
      data,
      {},
      { 'languages.programming': { $slice: [-3, 2] } },
    );
    const value = get(result, 'languages.programming');
    expect(value).toEqual(['Javascript', 'Bash']);
  });
});

describe('Query projection operators', () => {
  function getResult(data, criteria, projection): any {
    const result = find(data, criteria, projection);
    return result.length ? result[1] : null;
  }

  function checkModified(a, b): void {
    if (!isEqual(a, b)) {
      throw new Error('Original value modifier');
    }
  }

  // special tests
  // https://github.com/kofrasa/mingo/issues/25
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

  const expected = {
    key0: [{ key1: [[[{ key2: [{ a: 'value2' }, { a: 'dummy' }] }]]] }],
  };

  test('should not modify original', () => {
    const result = findFirst(
      data,
      { 'key0.key1.key2': 'value' },
      { 'key0.key1.key2.a': 1 },
    );
    expect(result).toStrictEqual(expected);
    checkModified(data[0], result);
  });

  test('should project only selected object graph', () => {
    const data = [
      { name: 'Steve', age: 15, features: { hair: 'brown', eyes: 'brown' } },
    ];
    const result = getResult(data, {}, { 'features.hair': 1 });
    expect(result).toStrictEqual({ features: { hair: 'brown' } });
    checkModified(data[0], result);
  });

  test('should throw exception: Projection cannot have a mix of inclusion and exclusion', () => {
    const data = [
      { name: 'Steve', age: 15, features: { hair: 'brown', eyes: 'brown' } },
    ];

    expect(() => {
      findFirst(data, {}, { 'features.hair': 0, name: 1 });
    }).toThrow();
  });

  test('should omit key', () => {
    const data = [
      { name: 'Steve', age: 15, features: ['hair', 'eyes', 'nose'] },
    ];
    const result = findFirst(data, {}, { 'features.hair': 0 });
    expect(result).toStrictEqual({
      name: 'Steve',
      age: 15,
      features: { eyes: 'brown' },
    });
    checkModified(data[0], result);
  });

  test('should omit second element in array', () => {
    const data = [
      { name: 'Steve', age: 15, features: ['hair', 'eyes', 'nose'] },
    ];
    const expected = { name: 'Steve', age: 15, features: ['hair', 'nose'] };
    const result = findFirst(data, {}, { 'features.1': 0 });
    expect(result).toStrictEqual(expected);
    checkModified(data[0], result);
  });

  test('should select only second element in array', () => {
    const result = findFirst(data, {}, { 'features.1': 1 });
    expect(result).toStrictEqual({ features: ['eyes'] });
    checkModified(data[0], result);
  });

  test('should project nested elements in array', () => {
    const result = findFirst(
      [
        { id: 1, sub: [{ id: 11, name: 'OneOne', test: true }] },
        { id: 2, sub: [{ id: 22, name: 'TwoTwo', test: false }] },
      ],
      {},
      { 'sub.id': 1, 'sub.name': 1 },
    );
    expect(result).toStrictEqual({ sub: [{ id: 11, name: 'OneOne' }] });
  });
});

const productsData = [
  { id: 1, item: 'abc1', description: 'product 1', qty: 300 },
  { id: 2, item: 'abc2', description: 'product 2', qty: 200 },
  { id: 3, item: 'xyz1', description: 'product 3', qty: 250 },
  { id: 4, item: 'VWZ1', description: 'product 4', qty: 300 },
  { id: 5, item: 'VWZ2', description: 'product 5', qty: 180 },
];

describe('$project pipeline operator', () => {
  function attempt(input, projection, check): void {
    const compiled = $project(createContext(), projection);
    const actual = compiled(input, {});
    if (typeof check === 'function') {
      check(actual);
    } else {
      expect(actual).toStrictEqual(check);
    }
  }

  test('can project with $eq operator', () => {
    const check = [
      { item: 'abc1', qty: 300, qtyEq250: false },
      { item: 'abc2', qty: 200, qtyEq250: false },
      { item: 'xyz1', qty: 250, qtyEq250: true },
      { item: 'VWZ1', qty: 300, qtyEq250: false },
      { item: 'VWZ2', qty: 180, qtyEq250: false },
    ];

    const query = {
      item: 1,
      qty: 1,
      qtyEq250: { $eq: ['$qty', 250] },
      id: 0,
    };

    attempt(productsData, query, check);
  });

  test('can project with $cmp operator', () => {
    // $cmp
    const query = {
      item: 1,
      qty: 1,
      cmpTo250: { $cmp: ['$qty', 250] },
      id: 0,
    };

    const check = [
      { item: 'abc1', qty: 300, cmpTo250: 1 },
      { item: 'abc2', qty: 200, cmpTo250: -1 },
      { item: 'xyz1', qty: 250, cmpTo250: 0 },
      { item: 'VWZ1', qty: 300, cmpTo250: 1 },
      { item: 'VWZ2', qty: 180, cmpTo250: -1 },
    ];

    attempt(productsData, query, check);
  });

  test('Simple exclusion', () => {
    const input = studentsData;
    const query = {
      name: 0,
    };
    const check = function (result): void {
      const fields = Object.keys(result[0]);
      assert(
        fields.length === 2,
        '2/3 fields are included. Instead: ' + fields.length,
      );
      assert(fields.indexOf('name') === -1, 'name is excluded');
      assert(fields.indexOf('id') >= 0, 'id is included');
      assert(fields.indexOf('scores') >= 0, 'score is included');
    };

    attempt(input, query, check);
  });

  test('can $project new field with group operator', () => {
    const input = [
      { id: 1, quizzes: [10, 6, 7], labs: [5, 8], final: 80, midterm: 75 },
      { id: 2, quizzes: [9, 10], labs: [8, 8], final: 95, midterm: 80 },
      { id: 3, quizzes: [4, 5, 5], labs: [6, 5], final: 78, midterm: 70 },
    ];

    const query = {
      quizTotal: { $sum: '$quizzes' },
      labTotal: { $sum: '$labs' },
      examTotal: { $sum: ['$final', '$midterm'] },
    };

    const check = [
      { id: 1, quizTotal: 23, labTotal: 13, examTotal: 155 },
      { id: 2, quizTotal: 19, labTotal: 16, examTotal: 175 },
      { id: 3, quizTotal: 14, labTotal: 11, examTotal: 148 },
    ];

    attempt(input, query, check);
  });

  test('exclude fields from embedded documents', () => {
    const input = [
      {
        id: 1,
        title: 'abc123',
        isbn: '0001122223334',
        author: { last: 'zzz', first: 'aaa' },
        copies: 5,
        lastModified: '2016-07-28',
      },
    ];

    const query = { 'author.first': 0, lastModified: 0 };

    const check = [
      {
        id: 1,
        title: 'abc123',
        isbn: '0001122223334',
        author: {
          last: 'zzz',
        },
        copies: 5,
      },
    ];

    attempt(input, query, check);
  });

  test('exclude fields from embedded documents using nested array syntax', () => {
    const input = [
      {
        id: 1,
        title: 'abc123',
        isbn: '0001122223334',
        author: { last: 'zzz', first: 'aaa' },
        copies: 5,
        lastModified: '2016-07-28',
      },
    ];

    const query = { author: { first: 0 }, lastModified: 0 };

    const check = [
      {
        id: 1,
        title: 'abc123',
        isbn: '0001122223334',
        author: {
          last: 'zzz',
        },
        copies: 5,
      },
    ];

    attempt(input, query, check);
  });

  test('rename and populate sub-docs', () => {
    const query = {
      name: 1,
      type: '$scores.type',
      details: {
        plus10: { $add: ['$scores.score', 10] },
      },
    };
    const input = studentsData;
    const check = function (result): void {
      const fields = Object.keys(result[0]);
      assert(fields.length === 4, 'can project fields with $project');
      assert(fields.includes('type'), 'can rename fields with $project');
      const temp = result[0]['details'];
      assert(
        Object.keys(temp).length === 1,
        'can create and populate sub-documents',
      );
    };
    attempt(input, query, check);
  });

  test('Id exclusion', () => {
    const input = studentsData;
    const query = {
      id: 0,
    };
    const check = (result) => {
      const fields = Object.keys(result[0]);
      assert(
        fields.length === 2,
        '2/3 fields are included. Instead: ' + fields.length,
      );
      assert(fields.indexOf('name') >= 0, 'name is included');
      assert(fields.indexOf('id') === -1, 'id is excluded');
      assert(fields.indexOf('scores') >= 0, 'score is included');
    };
    attempt(input, query, check);
  });

  test('conditionally exclude fields', () => {
    // Project with $$REMOVE
    // See: https://docs.mongodb.com/manual/reference/operator/aggregation/project/#remove-example
    const input = [
      {
        id: 1,
        title: 'abc123',
        isbn: '0001122223334',
        author: { last: 'zzz', first: 'aaa' },
        copies: 5,
        lastModified: '2016-07-28',
      },
      {
        id: 2,
        title: 'Baked Goods',
        isbn: '9999999999999',
        author: { last: 'xyz', first: 'abc', middle: '' },
        copies: 2,
        lastModified: '2017-07-21',
      },
      {
        id: 3,
        title: 'Ice Cream Cakes',
        isbn: '8888888888888',
        author: { last: 'xyz', first: 'abc', middle: 'mmm' },
        copies: 5,
        lastModified: '2017-07-22',
      },
    ];

    const query = {
      title: 1,
      'author.first': 1,
      'author.last': 1,
      'author.middle': {
        $cond: {
          if: { $eq: ['', '$author.middle'] },
          then: '$$REMOVE',
          else: '$author.middle',
        },
      },
    };

    const check = [
      { id: 1, title: 'abc123', author: { last: 'zzz', first: 'aaa' } },
      { id: 2, title: 'Baked Goods', author: { last: 'xyz', first: 'abc' } },
      {
        id: 3,
        title: 'Ice Cream Cakes',
        author: { last: 'xyz', first: 'abc', middle: 'mmm' },
      },
    ];

    attempt(input, query, check);
  });

  test('project include specific fields from embedded documents', () => {
    const input = [
      {
        id: 1,
        user: '1234',
        stop: { title: 'book1', author: 'xyz', page: 32 },
      },
      {
        id: 2,
        user: '7890',
        stop: [
          { title: 'book2', author: 'abc', page: 5 },
          { title: 'book3', author: 'ijk', page: 100 },
        ],
      },
    ];

    const query = { 'stop.title': 1 };
    const check = [
      { id: 1, stop: { title: 'book1' } },
      { id: 2, stop: [{ title: 'book2' }, { title: 'book3' }] },
    ];

    attempt(input, query, check);
  });

  test('includes specific fields from embedded documents using nested array syntax', () => {
    const input = [
      {
        id: 1,
        user: '1234',
        stop: { title: 'book1', author: 'xyz', page: 32 },
      },
      {
        id: 2,
        user: '7890',
        stop: [
          { title: 'book2', author: 'abc', page: 5 },
          { title: 'book3', author: 'ijk', page: 100 },
        ],
      },
    ];
    const query = { stop: { title: 1 } };
    const check = [
      { id: 1, stop: { title: 'book1' } },
      { id: 2, stop: [{ title: 'book2' }, { title: 'book3' }] },
    ];

    attempt(input, query, check);
  });

  test('can include computed fields', () => {
    const input = [
      {
        id: 1,
        title: 'abc123',
        isbn: '0001122223334',
        author: { last: 'zzz', first: 'aaa' },
        copies: 5,
      },
    ];

    const query = {
      title: 1,
      isbn: {
        prefix: { $substr: ['$isbn', 0, 3] },
        group: { $substr: ['$isbn', 3, 2] },
        publisher: { $substr: ['$isbn', 5, 4] },
        title: { $substr: ['$isbn', 9, 3] },
        checkDigit: { $substr: ['$isbn', 12, 1] },
      },
      lastName: '$author.last',
      copiesSold: '$copies',
    };

    const check = [
      {
        id: 1,
        title: 'abc123',
        isbn: {
          prefix: '000',
          group: '11',
          publisher: '2222',
          title: '333',
          checkDigit: '4',
        },
        lastName: 'zzz',
        copiesSold: 5,
      },
    ];

    attempt(input, query, check);
  });

  test('project new array fields', () => {
    const input = [{ id: 1, x: 1, y: 1 }];
    const query = { myArray: ['$x', '$y'] };
    const check = [{ id: 1, myArray: [1, 1] }];
    attempt(input, query, check);
  });

  test('project new array fields with missing fields', () => {
    const input = [{ id: 1, x: 1, y: 1 }];
    const query = { myArray: ['$x', '$y', '$someField'] };
    const check = [{ id: 1, myArray: [1, 1, null] }];
    attempt(input, query, check);
  });

  test('should project new array fields', () => {
    const input = [{ event: { x: 'hi' } }];
    const query = {
      myArray: ['$event.x'],
    };
    const check = [{ myArray: ['hi'] }];
    attempt(input, query, check);
  });
});
