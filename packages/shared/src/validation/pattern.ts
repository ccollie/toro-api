const RegexRegex  = /(?:[^[/\\]|\\.|\[(?:[^\]\\]|\\.)*\])+/;

// we could check that chars exist in a particular set, but Redis
// keys are binary safe
export function isValidJobIdPattern(pattern: string): boolean {
  if (!pattern) {
    return false;
  }

  return RegexRegex.test(pattern);
}
