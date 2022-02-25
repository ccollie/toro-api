import { ExportMimeTypes, ExportStage, JobExportOptions, JobStatus } from '@/types';
import type { MetricFragment, Status } from '@/types';
import { useCallbackRef } from '@/hooks';
import { download, noop } from '@/lib';
import { useRef } from 'react';
import { json2csv } from 'json-2-csv';
import { getJobs, getJobsByFilter } from 'src/services';

export type DownloadProgressEvent = {
  total: number;
  current: number;
  progress: number;
  isDone: boolean;
  isCancelled: boolean;
  stage?: ExportStage;
};

export interface ExportErrorEvent {
  message: string;
}

export type DownloadProgressCallback = (evt: DownloadProgressEvent) => void;
export type ExportErrorCallback = (evt: ExportErrorEvent) => void;

export interface DownloadJobProps {
  queueId: string;
  filter?: string;
  pageSize?: number;
  onProgress?: DownloadProgressCallback;
}

interface UpdateState {
  total: number;
  current: number;
  progress: number;
  pageNumber: number;
  isCancelled: boolean;
  cursor?: string;
  remainder: number;
  status: Status;
}

export function useJobDownloads(props: DownloadJobProps) {
  const count = 150;
  // todo: specify max
  const { queueId, onProgress, pageSize = 100 } = props;
  const progressCallback = useCallbackRef(onProgress);
  const cancelRef = useRef<() => void>(noop);

  function fetchByCriteria(
    filter: string,
    status: Status,
    state: UpdateState
  ): Promise<MetricFragment[]> {
    const { cursor, remainder } = state;
    const fetchCount = Math.min(count, remainder);
    return getJobsByFilter(queueId, {
      status: status as JobStatus,
      count: fetchCount,
      cursor,
      criteria: cursor ? undefined : filter,
    }).then(({ jobs, cursor, total, current }) => {
      state.total = total;
      state.current = current;
      state.cursor = cursor;
      return jobs;
    });
  }

  function fetch(
    status: Status,
    state: UpdateState
  ): Promise<MetricFragment[]> {
    state.pageNumber++;
    return getJobs(queueId, status as JobStatus, state.pageNumber, pageSize) // calculate this !!
      .then(({ counts, jobs }) => {
        let total = parseInt((counts as any)[status], 10);
        if (isNaN(total)) total = 0;
        state.total = total;
        state.current += jobs.length;
        return jobs;
      });
  }

  function stop() {
    cancelRef.current?.();
  }

  async function saveResults(
    data: MetricFragment[],
    options: JobExportOptions
  ): Promise<void> {
    const { format, showHeaders, filename, fields } = options;

    function emitContent(content: string) {
      const contentType = ExportMimeTypes[format];
      download(content, filename, contentType);
    }

    const prepped = data.map(item => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { __typename, ...rest } = item;
      if (fields && fields.length) {
        const value = Object.create(null);
        fields.forEach(name => {
          value[name] = (rest as any)[name];
        });
        return value;
      }
      return rest;
    }) as Record<string, any>[];

    let content = '';
    if (format === 'json') {
      content = JSON.stringify(prepped);
      return emitContent(content);
    } else if (format === 'csv') {
      // see https://mrodrig.github.io/json-2-csv/
      const opts = { prependHeader: true };
      if (typeof showHeaders === 'boolean')
        opts.prependHeader = !!options.showHeaders;

      return new Promise((resolve, reject) => {
        json2csv(
          prepped,
          (err, csv) => {
            if (err) return reject(err);
            csv && emitContent(csv);
            return resolve();
          },
          opts
        );
      });
    }
  }

  function init(opts: JobExportOptions): UpdateState {
    const state: UpdateState = {
      total: 0,
      current: 0,
      progress: 0,
      pageNumber: 0,
      isCancelled: false,
      cursor: undefined,
      remainder: Number.MAX_SAFE_INTEGER,
      status: opts.status,
    };
    if (typeof opts.maxJobs === 'number') {
      state.remainder = opts.maxJobs;
    }
    return state;
  }

  function updateProgress(isDone: boolean, state: UpdateState) {
    let progress: number;
    if (isDone) {
      progress = 100;
    } else {
      progress = (state.total == 0 ? 0 : state.current / state.total) * 100;
    }
    // progress callback
    if (onProgress) {
      const { isCancelled, total, current } = state;
      const evt: DownloadProgressEvent = {
        progress,
        isCancelled: isCancelled && !isDone,
        isDone,
        current,
        total,
      };
      progressCallback(evt);
    }
  }

  // todo: run in a worker
  async function start(options: JobExportOptions): Promise<void> {
    const state = init(options);
    const { filter, status } = options;
    const data: MetricFragment[] = [];
    let isDone = false;

    cancelRef.current = () => {
      state.isCancelled = true;
    };

    while (!state.isCancelled && !isDone && state.remainder) {
      let jobs: MetricFragment[];
      if (filter) {
        jobs = await fetchByCriteria(filter, status, state);
      } else {
        jobs = await fetch(status, state);
        if (jobs.length === 0) {
          isDone = true;
        }
      }
      if (typeof options.maxJobs === 'number') {
        state.total = Math.max(options.maxJobs, state.total);
        const needed = state.remainder - data.length;
        if (needed < jobs.length) {
          jobs = jobs.slice(0, needed - 1);
          isDone = true;
        }
      }
      state.remainder = Math.max(state.remainder - jobs.length, 0);
      data.push(...jobs);
      updateProgress(isDone, state);
    }

    if (state.isCancelled) {
      updateProgress(false, state);
    } else {
      // download
      try {
        await saveResults(data, options);
      } catch (e) {
        // call error callback
        console.log(e);
      }
    }
  }

  return {
    start,
    stop,
  };
}
