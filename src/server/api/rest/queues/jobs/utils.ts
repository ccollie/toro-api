import { capitalize } from 'lodash';
import { safeParse, isValidState } from '../../../../lib';

// TODO: use formatJob instead
export function toJson(job, state) {
  if (!job) return job;
  if (job.toJSON) {
    job = job.toJSON();
  }
  if (arguments.length > 1) {
    job.state = state;
  }
  job.data = safeParse(job.data) || {};
  job.opts = safeParse(job.opts) || {};
  job.stacktrace = safeParse(job.stacktrace) || [];
  if (!isNaN(parseInt(job.progress))) {
    job.progress = safeParse(job.progress);
  }
  job.returnvalue = safeParse(job.returnvalue);
  if (job.finishedOn) {
    job.duration = job.finishedOn - job.processedOn;
  }
  if (job.state === 'delayed') {
    if (!isNaN(job.delay)) {
      job.nextRun = job.timestamp + job.delay;
    }
  }
  return job;
}

export async function exportData(state, req, res) {
  const queue = res.locals.queue;
  if (!isValidState(state))
    return res
      .status(400)
      .json({ message: `Invalid state requested: ${state}` });

  let jobs = await queue[`get${capitalize(state)}`](0, 1000);
  jobs = jobs.map((job) => toJson(job, state));

  const stringData = JSON.stringify(jobs, null, 2);

  const filename = `${queue.name}-${state}-dump.json`;

  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  res.setHeader('Content-Description', 'Jobs Data Export');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Pragma', 'no-cache');
  res.send(stringData);
}
