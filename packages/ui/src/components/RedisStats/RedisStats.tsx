import formatBytes from 'pretty-bytes';
import React from 'react';
import { RedisLogo } from 'src/components/Icons';
import s from './RedisStats.module.css';
import { RedisInfo as ValidMetrics } from 'src/types';

const getMemoryUsage = (
  used_memory?: ValidMetrics['used_memory'],
  total_system_memory?: ValidMetrics['total_system_memory']
) => {
  if (used_memory === undefined) {
    return '-';
  }
  const usedMemory = used_memory;

  if (total_system_memory === undefined) {
    return formatBytes(usedMemory);
  }
  const totalSystemMemory = total_system_memory;

  return `${((usedMemory / totalSystemMemory) * 100).toFixed(2)}%`;
};

export const RedisStats = ({ stats }: { stats: Partial<ValidMetrics> }) => {
  const {
    redis_version,
    used_memory = 0,
    total_system_memory = 0,
    mem_fragmentation_ratio,
    connected_clients,
    blocked_clients,
  } = stats;

  return (
    <div className={s.stats}>
      <div>
        <RedisLogo />
      </div>

      <div>
        Version
        <span>{redis_version}</span>
      </div>

      <div>
        Memory usage
        <span>{getMemoryUsage(used_memory, total_system_memory)}</span>
        {total_system_memory && used_memory ? (
          <small>
            {formatBytes(used_memory)} of {formatBytes(total_system_memory)}
          </small>
        ) : (
          <small className="error">Could not retrieve memory stats</small>
        )}
      </div>

      <div>
        Fragmentation ratio
        <span>{mem_fragmentation_ratio}</span>
      </div>

      <div>
        Connected clients
        <span>{connected_clients}</span>
      </div>

      <div>
        Blocked clients
        <span>{blocked_clients}</span>
      </div>
    </div>
  );
};
