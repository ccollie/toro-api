import { LockManager } from '@src/server/redis';
import { clearDb, createClient, delay } from '../utils';
import * as IORedis from 'ioredis';
const DEFAULT_TTL = 500;
const LOCK_KEY = 'test-lock';

describe('LockManager', () => {

  describe('Single client', () => {
    let client: IORedis.Redis;
    let lock: LockManager;

    beforeEach(async () => {
      client = await createClient();
      await clearDb(client);
    })

    afterEach(async () => {
      client.disconnect();
      if (lock) {
        await lock.destroy();
      }
    })

    describe('Lock Acquisition', () => {
      it('attempts to acquire lock on start', async () => {
        lock = new LockManager(client, {
          key: LOCK_KEY,
          ttl: DEFAULT_TTL
        });
        const exists = await client.exists(lock.key);
        expect(!!exists).toBe(true);
      });

      it('can manually acquire the lock', async () => {
        let lock = new LockManager(client);
        const acquired = await lock.acquire();
        expect(acquired).toBe(true);
        const exists = await client.exists(lock.key);
        expect(!!exists).toBe(true);
      });

      it('re-acquires lock if it is lost', async () => {
        let lock = new LockManager(client, {
          ttl: 500
        });

        await lock.start();
        let acquired = false;
        lock.on('lock:acquired', () => {
          acquired = true;
        })

        await delay(300);

        // delete the lock and wait
        await client.del(lock.key);
        // we use 150 here since the keyspace notification handler is debounced for 100ms
        await delay(400);

        expect(acquired).toBe(true);
      });
    })

    describe('Lock Release', () => {
      it('releases the lock in the destructor', async () => {
        let lock = new LockManager(client);
        const key = lock.key;
        const acquired = await lock.acquire();
        expect(acquired).toBe(true);
        await lock.destroy();
        lock = null;
        const exists = await client.exists(key);
        expect(!!exists).toBe(false);
      })
    })
  });
})

describe('LockManager: Competing clients', () => {
  let client, client2: IORedis.Redis;
  let first: LockManager;
  let second: LockManager;

  const DEFAULT_TTL = 250;

  async function setup() {
    client = createClient();
    await clearDb(client);
    client2 = await createClient();
    first = new LockManager(client, {
      ttl: DEFAULT_TTL
    });
    second = new LockManager(client2, {
      ttl: DEFAULT_TTL
    });
  }

  async function tearDown() {
    client.disconnect();
    client2.disconnect();
    await Promise.all([
      first.destroy(),
      second.destroy(),
    ])
  }

  describe('Lock Aquisition', () => {

    it('allows only one client to own the lock', async () => {
      await setup();
      try {
        const firstIsOwner = await first.acquire();
        expect(firstIsOwner).toBe(true);
        const secondIsOwner = await second.acquire();
        expect(secondIsOwner).toBe(false);
      } finally {
        await tearDown();
      }
    });

    it('allows a client to acquire after the owner releases', async () => {
      await setup();
      try {
        await first.acquire();
        let secondIsOwner = await second.acquire();
        expect(secondIsOwner).toBe(false);
        await first.release();
        secondIsOwner = await second.acquire();
        expect(secondIsOwner).toBe(true);
      } finally {
        await tearDown();
      }
    });

    it('can automatically acquire when the owner releases', async () => {
      await setup()
      try {
        await first.acquire();
        let secondIsOwner = await second.acquire();
        expect(secondIsOwner).toBe(false);
        // start monitoring the lock
        await second.start();
        await first.release();
        await delay(100);
        expect(second.isOwner).toBe(true);
      } finally {
        await tearDown();
      }
    });

    it('can automatically acquire when the lock expires', async () => {
      await setup();
      try {
        await first.acquire();
        // start monitoring the lock
        await second.start();
        await delay(DEFAULT_TTL + 250);
        expect(second.isOwner).toBe(true);
      } finally {
        await tearDown();
      }
    });
  })

});
