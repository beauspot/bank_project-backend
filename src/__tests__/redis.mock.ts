import { EventEmitter } from "events";

import { RedisStore } from "connect-redis";
import Redis from "ioredis-mock";
import { vi } from "vitest";

// Mock logger
const mockLog = {
  info: vi.fn(),
  error: vi.fn(),
};

// Create mock Redis client
const mockRedisClient = new Redis({
  lazyConnect: false,
});

const mockGet = vi.fn();
const mockSet = vi.fn();
const mockDestroy = vi.fn();

// Create a proper mock RedisStore that extends EventEmitter
class MockRedisStore extends EventEmitter {
  client: InstanceType<typeof Redis>;
  prefix: string;
  ttl: number;

  constructor(options: any) {
    super();
    this.client = options.client;
    this.prefix = options.prefix || "paymetro-sessions:";
    this.ttl = options.ttl || 1800;
  }

  get(sid: string, callback: (err: any, session?: any) => void) {
    mockGet(sid, callback);
    this.client.get(`${this.prefix}${sid}`, (err, data) => {
      if (err) return callback(err);
      callback(null, data ? JSON.parse(data) : null);
    });
  }

  set(sid: string, session: any, callback?: (err?: any) => void) {
    mockSet(sid, session, callback);
    const key = `${this.prefix}${sid}`;
    if (callback) {
      this.client.setex(key, this.ttl, JSON.stringify(session), callback);
    } else {
      this.client.setex(key, this.ttl, JSON.stringify(session), () => {});
    }
  }

  destroy(sid: string, callback?: (err?: any) => void) {
    mockDestroy(sid, callback);
    const key = `${this.prefix}${sid}`;
    if (callback) {
      this.client.del(
        key,
        callback as (err: any, result: number | undefined) => void,
      );
    } else {
      this.client.del(key, () => {});
    }
  }
}

// Create mock RedisStore instance
const mockRedisStore = new MockRedisStore({
  client: mockRedisClient,
  prefix: "paymetro-sessions:",
  ttl: 1800,
}) as unknown as RedisStore;

// Add the vitest mock functions to the store instance for testing
(mockRedisStore as any).mockGet = mockGet;
(mockRedisStore as any).mockSet = mockSet;
(mockRedisStore as any).mockDestroy = mockDestroy;

// Mock implementation for CacheData
const mockCacheData = vi.fn(
  async (key: string, ttl: number, fetchData: () => Promise<any>) => {
    try {
      const cachedData = await mockRedisClient.get(key);

      if (cachedData) {
        mockLog.info(`Cache hit for key: ${key}`);
        return JSON.parse(cachedData);
      }

      mockLog.info(`Cache miss for key: ${key}. Fetching new data...`);
      const data = await fetchData();
      await mockRedisClient.setex(key, ttl, JSON.stringify(data));
      mockLog.info(`Data cached for key: ${key} with TTL: ${ttl} seconds.`);
      return data;
    } catch (err) {
      mockLog.error(`Error Handling cache for key: ${key}. Message: ${err}`);
      throw err;
    }
  },
);

// Mock shutdown function
const mockShutdownClient = vi.fn(async (client: InstanceType<typeof Redis>) => {
  try {
    mockLog.info("closing redis client");
    await client.quit();
  } catch (error: any) {
    mockLog.error(`Error Shutting down Redis Server: ${error.message}`);
  }
});

// Mock event handlers
mockRedisClient.on("connect", () => {
  mockLog.info("Successfully connected to a Redis Server");
});

mockRedisClient.on("ready", () => {
  mockLog.info("Redis client is ready and connected.");
});

mockRedisClient.on("error", (err: Error) => {
  mockLog.error(`Error connecting to a Redis Server: ${err.message}`);
});

// Export the mock module
export default {
  redisClient: mockRedisClient,
  redisStore: mockRedisStore,
  CacheData: mockCacheData,
  shutdownClient: mockShutdownClient,
  _mockLog: mockLog,
  _resetMocks: () => {
    mockRedisClient.flushall();
    mockCacheData.mockClear();
    mockShutdownClient.mockClear();
    mockLog.info.mockClear();
    mockLog.error.mockClear();
  },
};
