import { clearDb, createClient } from '../../factories';
import { Command, loadIncludeScript, compileExpression } from '../utils';


function quote(source: string): string {
  return '\'' + source.replace(/([^'\\]*(?:\\.[^'\\]*)*)'/g, '$1\\\'') + '\'';
}


describe.skip('date.lua', () => {
  let client;
  let script: string;

  beforeAll(async () => {
    script = await loadIncludeScript('eval.lua');
  });

  function createTestScript(include: string, extra: string= ''): string {
    return `
    ${include}

    ${extra}
    
    local expression = cjson.decode(ARGV[1])
    local context = ARGV[2]
    if (type(context) == 'string' and #context > 0) then
      context = cjson.decode(ARGV[2])
    else
      context = {}  
    end
        
    return ExprEval.evaluate(criteria, context)
  `
  }

  function createCommand(name = 'exprEval', scriptText?: string): Command {
    const numberOfKeys = 1;
    scriptText = scriptText ?? createTestScript(script);

    return {
      name,
      options: { numberOfKeys, lua: scriptText },
    };
  }

  beforeEach(async () => {
    client = await createClient(null, false);
    await clearDb(client);
    const command = createCommand();
    client.defineCommand(command.name, command.options);
  });

  afterEach(async () => {
    // await clearDb(client);
    return client.quit();
  });

  async function evalExpression(expression: string, context?: Record<string, unknown>): Promise<unknown> {
    const { compiled: compiled } = compileExpression(expression);
    const criteria = JSON.stringify(compiled);
    const data = context ? JSON.stringify(context) : '';
    return (client as any).exprEval(criteria, data)
  }

  async function checkExpression(
    expression: string,
    context: Record<string, unknown> | null,
    expectedValue: any,
    expectMatch = true,
  ) {
    const criteria = `(${expression}) == ${expectedValue}`;
    const res = await evalExpression(expression, context);
    if (expectMatch) {
      expect(res).toBe(expectedValue);
    } else {
      expect(res).not.toBe(expectedValue);
    }
  }

  function testOperator(operator, cases) {
    test.each(cases)(`${operator}: %p`, async (left, right, expected) => {
      const data = {};
      let filter: string;

      if (expected === undefined) {
        expected = right;
        data['value'] = left;
        filter = `${operator} data.value`;
      } else {
        data['left'] = left;
        data['right'] = right;
        filter = `data.left ${operator} data.right`;
      }

      const context = { data };
      await checkExpression(filter, context, expected);
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
    const expression = `value.${formatFunction(name, args)}`;

    await checkExpression(expression, data, expected);
  }

  async function testFunctionOnce(name, args, expected) {
    const expression = formatFunction(name, args);
    await checkExpression(expression, null, expected);
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

  describe('Date', () => {
    const SAMPLE_DATE_STRING = '2014-01-01T08:15:39.736Z';
    const SampleDate = new Date(SAMPLE_DATE_STRING);

    async function checkDateMethod(method, date = SampleDate) {
      const expected = date[method]();
      const context = { data: { date, expected } };
      const expression = `Date.parse(data.date).${method}()`;
      await checkExpression(expression, context, expected);
    }

    async function validateDate(date = SampleDate): Promise<void> {
      const Methods = [
        'getFullYear',
        'getMonth',
        'getDate',
        'getDayOfYear',
        'getHours',
        'getMinutes',
        'getSeconds',
      ];
    }

    describe('parse', () => {
      it('converts an RFC-3339 date string', async () => {
        const dateValue = SampleDate.getTime();
        const context = { data: { date: SAMPLE_DATE_STRING, dateValue } };
        const condition = 'Date.parse(user.date) != null';
        await checkExpression(condition, context, true);
      });

      it('constructs a date from a UTC timestamp', async () => {
        const dateValue = SampleDate.getTime();
        const context = { data: { date: SAMPLE_DATE_STRING, dateValue } };
        const condition = 'Date.parse(user.dateValue) != null';
        await checkExpression(condition, context, true);
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

    it('getDayOfYear', async () => {
      await checkDateMethod('getDayOfYear');
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

});
