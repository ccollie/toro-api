import React, { useEffect, useState } from 'react';
import s from 'src/pages/queue/jobs/JobCard/Details/DetailsContent/JobLogs/JobLogs.module.css';

interface JobLogsProps {
  getJobLogs: () => Promise<string[]>;
}

export const JobLogs = ({ getJobLogs }: JobLogsProps) => {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    getJobLogs().then((logs) => mounted && setLogs(logs));
    return () => {
      mounted = false;
    };
  }, []);

  if (!Array.isArray(logs) || !logs.length) {
    return null;
  }

  return (
    <ul className={s.jobLogs}>
      {logs.map((log, idx) => (
        <li key={idx}>{log}</li>
      ))}
    </ul>
  );
};
