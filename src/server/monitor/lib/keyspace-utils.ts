import { KeyspaceNotifier } from '../../redis';

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

  async function mainHandler(msg) {
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
      notifier.subscribe('keyspace', jobKey, mainHandler),
      notifier.subscribe('keyspace', logsKey, logsHandler),
    ]);
  }

  await sub();

  return unsub;
}
