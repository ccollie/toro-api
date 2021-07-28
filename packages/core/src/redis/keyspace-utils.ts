import { RefCountCache } from '../lib/refcount-cache';
import { KeyspaceNotifier } from './keyspace-notifier';
import { getHostConfig } from '../hosts/host-config';
import { logger } from '../logger';

function createNotifier(hostId: string): KeyspaceNotifier {
  const host = getHostConfig(hostId);
  return new KeyspaceNotifier(host.connection);
}
function disposeNotifier(hostId: string, notifier: KeyspaceNotifier): void {
  notifier.destroy().catch((err) => {
    logger.warn(err);
  });
}

const cache = new RefCountCache<KeyspaceNotifier>({
  create: createNotifier,
  cleanup: disposeNotifier,
});

export function getKeyspaceNotifier(hostId: string): KeyspaceNotifier {
  return cache.getRef(hostId);
}

export function releaseKeyspaceNotifier(hostId: string): number {
  return cache.removeReference(hostId);
}
