import {
  KeyspaceNotifier,
  KeyspaceNotification,
  KeyspaceNotificationType,
} from './keyspace-notifier';

export async function subscribeToJob(
  notifier: KeyspaceNotifier,
  jobKey: string,
  cb,
) {
  const logsKey = `${jobKey}:logs`;
  let unsubFunctions = [];

  function logsHandler(msg): void {
    if (msg.event === 'rpush') {
      cb('log.add', jobKey);
    } else if (msg.event === 'del') {
      cb('log.remove', jobKey);
    }
  }

  async function unsub(): Promise<void> {
    if (unsubFunctions.length) return;
    try {
      await Promise.all(unsubFunctions);
    } catch (e) {
      console.log(e);
    } finally {
      unsubFunctions = [];
    }
  }

  async function mainHandler(msg: KeyspaceNotification): Promise<void> {
    switch (msg.event) {
      case 'hset':
        cb('update', jobKey);
        break;
      case 'del':
        cb('remove', jobKey);
        await unsub();
        break;
    }
  }

  async function sub(): Promise<void> {
    unsubFunctions = await Promise.all([
      notifier.subscribe(
        KeyspaceNotificationType.KEYSPACE,
        jobKey,
        mainHandler,
      ),
      notifier.subscribe(
        KeyspaceNotificationType.KEYSPACE,
        logsKey,
        logsHandler,
      ),
    ]);
  }

  await sub();

  return unsub;
}
