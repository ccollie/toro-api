// Copyright 2020 The Prometheus Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import ret, { reconstruct, Token, types } from 'ret';

export class FastRegexMatcher {
  readonly re: RegExp;
  readonly prefix: string;
  readonly suffix: string;
  readonly contains: string;

  constructor(v: string) {
    this.re = new RegExp('^(?:' + v + ')$');
    const { prefix, suffix, contains } = optimizeConcatRegex(this.re);
    this.prefix = prefix;
    this.suffix = suffix;
    this.contains = contains;
  }

  matchString(s: string): boolean {
    if (this.prefix && !s.startsWith(this.prefix)) {
      return false;
    }
    if (this.suffix && !s.endsWith(this.suffix)) {
      return false;
    }
    if (this.contains && !s.includes(this.contains)) {
      return false;
    }
    return this.re.test(s);
  }

  get regexString(): string {
    return this.re.source;
  }
}

function isEndAnchor(token: Token): boolean {
  return token.type === types.POSITION && token.value === '$';
}

function removeAnchors(stack: Token[]) {
  // We can safely remove begin and end text matchers respectively
  // at the beginning and end of the regexp.
  while (
    stack.length > 0 &&
    stack[0].type == types.POSITION &&
    stack[0].value === '^'
  ) {
    stack.splice(0, 1);
  }
  while (stack.length > 0 && isEndAnchor(stack[stack.length - 1])) {
    stack.splice(stack.length - 1, 1);
  }
}

function extractLiteral(stack: Token[], start = 0): string {
  let result = '';
  if (stack[0].type == types.CHAR) {
    for (let i = start; i < stack.length; i++) {
      const tok = stack[i];
      if (tok.type === types.CHAR) {
        result = result + String.fromCharCode(tok.value);
      } else {
        stack.splice(start, result.length);
        break;
      }
    }
  }
  return result;
}

function makeNonCapture(stack: Token[]) {
  stack.forEach((token) => {
    if (token.type === types.GROUP && token.remember) {
      token.remember = false;
    }
  });
}

// optimizeConcatRegex returns literal prefix/suffix text that can be safely
// checked against the label value before running the regexp matcher.
export function optimizeConcatRegex(r: RegExp): {
  prefix?: string;
  suffix?: string;
  contains?: string;
  re?: RegExp;
} {
  const tokens = ret(r.source);
  const { stack, options } = tokens;

  let prefix = '';
  let suffix = '';
  let contains = '';
  let re: RegExp;

  if (Array.isArray(options)) {
    options.forEach(makeNonCapture);
    if (options.length > 0) {
      const modified = reconstruct(tokens);
      re = new RegExp(modified);
    }
    return { prefix, suffix, contains, re };
  }

  if (!Array.isArray(stack) || stack.length === 0) {
    return { prefix, suffix, contains };
  }
  // We can safely remove begin and end text matchers respectively
  // at the beginning and end of the regexp.
  removeAnchors(stack);
  if (stack.length === 0) {
    return { prefix, suffix, contains };
  }

  const ignoreCase = r.ignoreCase;

  // Given Prometheus regex matchers are always anchored to the begin/end
  // of the text, if the first/last operations are literals, we can safely
  // treat them as prefix/suffix.
  if (stack[0].type === types.CHAR && !ignoreCase) {
    prefix = extractLiteral(stack);
  }
  const last = stack[stack.length - 1];
  if (last.type == types.CHAR && !ignoreCase) {
    // find beginning of string
    let i = stack.length - 1;
    while (i - 1 >= 0 && stack[i].type === types.CHAR) {
      i--;
    }
    suffix = extractLiteral(stack, i);
  }

  // If contains any literal which is not a prefix/suffix, we keep the
  // 1st one. We do not keep the whole list of literals to simplify the
  // fast path.
  for (let i = 1; i < stack.length; i++) {
    if (stack[i].type === types.CHAR && !r.ignoreCase) {
      contains = extractLiteral(stack, i);
      break;
    }
  }

  makeNonCapture(stack);

  if (stack?.length + options?.length > 0) {
    const modified = reconstruct(tokens);
    re = new RegExp(modified);
  }

  return {
    prefix,
    suffix,
    contains,
    re,
  };
}
