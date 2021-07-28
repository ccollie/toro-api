import { compile } from '../../src/lib/object-mapper';
import { registerHelpers } from '../../src/lib/hbs';

describe('Object Mapper', () => {
  registerHelpers();

  function testMapper(
    mapper: Record<string, any>,
    data: Record<string, any>,
    expected: Record<string, any>,
  ): void {
    const fn = compile(mapper);
    const actual = fn(data);
    expect(actual).toMatchObject(expected);
  }

  describe('source parsing', () => {
    it('handles a double quoted string as a string literal', () => {
      const mapper = {
        dest: '"src"',
      };
      testMapper(mapper, {}, { dest: 'src' });
    });

    it('handles non-string sources as literal', () => {
      const mapper = {
        int: 123,
        date: new Date(),
        float: 123.456,
      };

      testMapper(mapper, {}, mapper);
    });

    it('handles a function source as a mapping function', () => {
      const double = (data: Record<string, any>, dest: string) => {
        const val = data[dest];
        return parseInt(val) * 2;
      };

      const mapper = {
        int: double,
      };

      testMapper(mapper, { int: 2 }, { int: 4 });
    });

    it('handles string source paths', () => {
      const object = { a: [{ b: { c: 3 } }] };
      const mapper = { p: 'a[0].b.c' };
      testMapper(mapper, object, { p: 3 });
    });

    it('handles array source paths', () => {
      const object = { a: [{ b: { c: 3 } }] };
      const mapper = { p: ['a', '0', 'b', 'c'] };
      testMapper(mapper, object, { p: 3 });
    });

    it('source as a handlebars template', () => {
      const obj = {
        lower: 4,
        higher: 20,
        lowerValue: 'lower',
        higherValue: 'higher',
      };
      const mapper = {
        value:
          '{{~#lt (get "lower") (get "higher")}}{{lowerValue}}{{else}}{{higherValue}}{{/lt}}',
      };
      testMapper(mapper, obj, { value: obj.lowerValue });
    });
  });

  describe('destination', () => {
    it('handles simple destination path', () => {
      const mapper = {
        dest: '"src"',
      };
      testMapper(mapper, {}, { dest: 'src' });
    });

    it('handles complex destination path', () => {
      const obj = {
        id: 1000,
        name: 'cheetos',
        tax: 10,
        price: 1000,
        count: 3,
      };

      const mapper = {
        id: 'id',
        'items[0].name': 'name',
        'items[0].tax': 'tax',
        'items[0].count': 'count',
        'items[0].price': 'price',
        'items[0].total': '{{multiply (get "count") (get "price")}}',
      };

      const expected = {
        id: 1000,
        items: [
          {
            name: obj.name,
            tax: obj.tax,
            count: obj.count,
            price: obj.price,
            total: (obj.price * obj.count).toString(),
          },
        ],
      };
      testMapper(mapper, obj, expected);
    });
  });
});
