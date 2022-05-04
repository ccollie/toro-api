import { FastRegexMatcher, optimizeConcatRegex } from '../regex';

describe('FastRegexMatcher', () => {
  it('does basic matching', () => {
    const cases: {
      regex: string;
      value: string;
      expected: boolean;
    }[] = [
      { regex: '(foo|bar)', value: 'foo', expected: true },
      { regex: '(foo|bar)', value: 'foo bar', expected: false },
      { regex: '(foo|bar)', value: 'bar', expected: true },
      { regex: 'foo.*', value: 'foo bar', expected: true },
      { regex: 'foo.*', value: 'bar foo', expected: false },
      { regex: '.*foo', value: 'foo bar', expected: false },
      { regex: '.*foo', value: 'bar foo', expected: true },
      { regex: '.*foo', value: 'foo', expected: true },
      { regex: '^.*foo$', value: 'foo', expected: true },
      { regex: '^.+foo$', value: 'foo', expected: false },
      { regex: '^.+foo$', value: 'bfoo', expected: true },
      { regex: '.*', value: '\n', expected: false },
      { regex: '.*', value: '\nfoo', expected: false },
      { regex: '.*foo', value: '\nfoo', expected: false },
      { regex: 'foo.*', value: 'foo\n', expected: false },
      { regex: 'foo\n.*', value: 'foo\n', expected: true },
      { regex: '.*foo.*', value: 'foo', expected: true },
      { regex: '.*foo.*', value: 'foo bar', expected: true },
      { regex: '.*foo.*', value: 'hello foo world', expected: true },
      { regex: '.*foo.*', value: 'hello foo\n world', expected: false },
      { regex: '.*foo\n.*', value: 'hello foo\n world', expected: true },
      { regex: '.*', value: 'foo', expected: true },
      { regex: '', value: 'foo', expected: false },
      { regex: '', value: '', expected: true },
    ];

    cases.forEach((c) => {
      const m = new FastRegexMatcher(c.regex);
      expect(m.matchString(c.value)).toBe(true);
    });
  });

  it('optimizes the regex', () => {
    const cases: {
      regex: string;
      prefix: string;
      suffix: string;
      contains: string;
    }[] = [
      { regex: 'foo(hello|bar)', prefix: 'foo', suffix: '', contains: '' },
      {
        regex: 'foo(hello|bar)world',
        prefix: 'foo',
        suffix: 'world',
        contains: '',
      },
      { regex: 'foo.*', prefix: 'foo', suffix: '', contains: '' },
      {
        regex: 'foo.*hello.*bar',
        prefix: 'foo',
        suffix: 'bar',
        contains: 'hello',
      },
      { regex: '.*foo', prefix: '', suffix: 'foo', contains: '' },
      { regex: '^.*foo$', prefix: '', suffix: 'foo', contains: '' },
      { regex: '.*foo.*', prefix: '', suffix: '', contains: 'foo' },
      { regex: '.*foo.*bar.*', prefix: '', suffix: '', contains: 'foo' },
      { regex: '.*(foo|bar).*', prefix: '', suffix: '', contains: '' },
      { regex: '.*[abc].*', prefix: '', suffix: '', contains: '' },
      { regex: '.*((?i)abc).*', prefix: '', suffix: '', contains: '' },
      { regex: '.*(?i:abc).*', prefix: '', suffix: '', contains: '' },
      { regex: '(?i:abc).*', prefix: '', suffix: '', contains: '' },
      { regex: '.*(?i:abc)', prefix: '', suffix: '', contains: '' },
      { regex: '.*(?i:abc)def.*', prefix: '', suffix: '', contains: 'def' },
      { regex: '(?i).*(?-i:abc)def', prefix: '', suffix: '', contains: 'abc' },
      { regex: '.*(?msU:abc).*', prefix: '', suffix: '', contains: 'abc' },
      { regex: '[aA]bc.*', prefix: '', suffix: '', contains: 'bc' },
    ];

    cases.forEach((c) => {
      const parsed = new RegExp(c.regex);
      const { prefix, suffix, contains } = optimizeConcatRegex(parsed);
      expect(prefix).toBe(c.prefix);
      expect(suffix).toBe(c.suffix);
      expect(contains).toBe(c.contains);
    });
  });
});
