import Request from './request';
import { RedisMetrics } from '@src/types';

export class RedisService {
  constructor(private http: Request) {}

  /**
   * Get redis stats for the given host
   * @param {string} host host name
   * @returns {Promise<RedisMetrics>}
   */
  getInfo(host: string): Promise<RedisMetrics> {
    return this.http.get(`hosts/${encodeURIComponent(host)}/redis`);
  }
}
