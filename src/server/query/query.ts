import { compileQuery } from './internal';
import { isEmpty } from './utils';
import { QueryContext } from './queryContext';

/**
 * Query object to test collection elements with
 * @param criteria the pass criteria for the query
 * @constructor
 */
export class Query {
  readonly context: QueryContext;
  private readonly criteria: any;
  private predicate: (obj, ctx) => boolean;

  constructor(criteria: any, context: QueryContext) {
    this.criteria = criteria;
    this.context = context;
    this._compile();
  }

  destroy(): void {
    this.context.destroy();
  }

  private _compile(): void {
    if (isEmpty(this.criteria)) {
      this.predicate = (): boolean => true;
    } else {
      this.predicate = compileQuery(this.criteria, this.context);
    }
  }

  /**
   * Checks if the object passes the query criteria. Returns true if so, false otherwise.
   * @param obj
   * @param ctx
   * @returns {boolean}
   */
  test(obj, ctx = {}): boolean {
    return this.predicate(obj, ctx);
  }
}
