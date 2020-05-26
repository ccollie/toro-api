import Request from './request';

export interface ScheduledJobFetchOptions {
  offset?: number;
  count?: number;
  asc?: boolean;
}

function getBasePath(host, name): string {
  return `queues/${encodeURIComponent(host)}/${encodeURIComponent(
    name,
  )}/scheduled-jobs`;
}

export class ScheduledJobsService {
  constructor(private http: Request) {}

  /**
   * Fetch scheduled getJobs
   * @param {string} host the queue host
   * @param {string} queue queue name
   * @param {object} options
   * @param {number?} options.offset offset of first job. Default 0
   * @param {number?} options.count  number of getJobs to return. Default -1 (return all)
   * @param {boolean?} options.asc  true to sort in ascending order
   */
  async getJobs(
    host: string,
    queue: string,
    options?: ScheduledJobFetchOptions,
  ): Promise<object[]> {
    const { offset = 0, count = -1, asc = true } = options || {};
    const opts = { offset, count, asc };
    return this.http.get(getBasePath(host, queue), opts);
  }

  deleteByKey(
    host: string,
    queue: string,
    keys: string | string[],
  ): Promise<string[]> {
    const url = `${getBasePath(host, queue)}`;
    if (keys && !Array.isArray(keys)) {
      keys = [keys];
    }
    return this.http.del(url, { keys }).then((response) => {
      return response.filter((x) => x.success).map(({ key }) => key);
    });
  }
}
