import { RedisStore } from "connect-redis";
import Redis from "ioredis";

import config from "@/api/helpers/config/env";
import log from "@/utils/logging";

/**
 * Used for setting up redis client.
 */

// Test Redis connection

const redisClient = new Redis({
  host: config.redis.redis_url_host,
  port: parseInt(config.redis.redis_url_port || "6379"),
  maxRetriesPerRequest: 5,
  enableOfflineQueue: true,
  db: 4,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError: (err) => {
    const targetError = "READONLY";
    if (err.message.includes(targetError)) {
      return true; // Reconnect on READONLY error
    }
    return false;
  },
});

/**
 * Used for storing the clients sessions
 */
// const RedisStore = connectRedis(session);
const redisStore = new RedisStore({
  client: redisClient,
  prefix: "paymetro-sessions:",
  ttl: 1800, // 30mins
  disableTouch: false,
  disableTTL: false,
  serializer: {
    stringify: JSON.stringify,
    parse: JSON.parse,
  },
});

// Cache helper function
const CacheData = async (
  key: string,
  ttl: number,
  fetchData: () => Promise<any>,
) => {
  try {
    // Check Redis for cached data
    const cachedData = await redisClient.get(key);

    if (cachedData) {
      log.info(`Cache hit for key: ${key}`);
      // return parsed cached data

      // return JSON.parse(cachedData)
      return JSON.parse(cachedData.toString());
    }

    // Fetch new data if not cached
    log.info(`Cache miss for key: ${key}. Fetching new data...`);
    const data = await fetchData();

    // Cache the new Data with ttl (time-to-live)
    await redisClient.setex(key, ttl, JSON.stringify(data));
    log.info(`Data cahced for key: ${key} with TTL: ${ttl} seconds.`);

    return data;
  } catch (err: unknown) {
    log.error(`Error Handling cache for key: ${key}. Message: ${err}`);
    throw err;
  }
};

const shutdownClient = async (redisClient: Redis) => {
  try {
    await new Promise((resolve) => {
      log.info("closing redis client");
      redisClient.quit();
      redisClient.on("end", resolve);
    });
  } catch (error: any) {
    log.error(`Error Shutting down Redis Server: ${error.message}`);
  }
};

// Redis client event
// Connect to redis & log success
redisClient.on("connect", () => {
  log.info("Successfully connected to a Redis Server");
});

redisClient.on("ready", () => {
  log.info("Redis client is ready and connected.");
});

// If Redis not connected successfully, Handle Errors
redisClient.on("error", (err: Error) => {
  log.error(`Error connecting to a Redis Server: ${err.message}`);
});

export default {
  redisClient,
  redisStore,
  CacheData,
  shutdownClient,
};
