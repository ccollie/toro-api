const binaryOps: Record<string, boolean> = {
  '+': true,
  '-': true,
  '*': true,
  '/': true,
  '%': true,
  '^': true,

  // See https://github.com/prometheus/prometheus/pull/9248
  atan2: true,

  // cmp ops
  '==': true,
  '!=': true,
  '>': true,
  '<': true,
  '>=': true,
  '<=': true,

  // logical set ops
  and: true,
  or: true,
  unless: true,

  // New ops for MetricsQL
  if: true,
  ifnot: true,
  default: true,
};

const binaryOpPriorities: Record<string, number> = {
  default: -1,

  if: 0,
  ifnot: 0,

  // See https://prometheus.io/docs/prometheus/latest/querying/operators/#binary-operator-precedence
  or: 1,

  and: 2,
  unless: 2,

  '==': 3,
  '!=': 3,
  '<': 3,
  '>': 3,
  '<=': 3,
  '>=': 3,

  '+': 4,
  '-': 4,

  '*': 5,
  '/': 5,
  '%': 5,
  atan2: 5,

  '^': 6,
};

export function isBinaryOp(op: string): boolean {
  return binaryOps[op.toLowerCase()];
}

export function binaryOpPriority(op: string): number {
  return binaryOpPriorities[op.toLowerCase()];
}

const opKeys = Object.keys(binaryOps);

export function scanBinaryOpPrefix(s: string): number {
  let n = 0;
  for (let i = 0; i < opKeys.length; i++) {
    const op = opKeys[i];
    const len = op.length;
    if (s.length < len) {
      continue;
    }
    const ss = s.slice(0, len);
    if (ss == op && len > n) {
      n = op.length;
    }
  }
  return n;
}
