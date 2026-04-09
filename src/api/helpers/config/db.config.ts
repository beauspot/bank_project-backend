import dotenv from "dotenv";
import { DataSource } from "typeorm";

import config from "@/api/helpers/config/env";
import { Account } from "@/models/acctEntity";
import { Loan } from "@/models/loanEntity";
import { Payee } from "@/models/payeeEntity";
import { Token } from "@/models/tokenEntity";
import { Transaction } from "@/models/transactionEntity";
import { User } from "@/models/userEntity";
import log from "@/utils/logging";

// Load environment variables
dotenv.config();

// Environment-specific .env loading
if (config.node_env === "test") dotenv.config({ path: ".env.test" });

log.info(`Current Environment: ${config.node_env} Environment`);

// Validate required database configuration
const validateConfig = () => {
  const required = ["host", "port", "db_user", "db_password", "db_name"];
  const missing = required.filter(
    (field) => !config.db[field as keyof typeof config.db],
  );

  if (missing.length > 0) {
    log.error(`Missing required database configuration: ${missing.join(", ")}`);
    throw new Error(
      `Database configuration error: Missing ${missing.join(", ")}`,
    );
  }

  // Validate port is a number
  if (isNaN(config.db.port)) {
    throw new Error(`Invalid database port: ${config.db.port}`);
  }
};

validateConfig();

// SSL configuration
const getSSLConfig = () => {
  if (config.node_env !== "production") return false;

  return {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false",
    ...(process.env.DB_CA_CERT && { ca: process.env.DB_CA_CERT }),
  };
};

// Pool size configuration
const getPoolSize = () => {
  switch (config.node_env) {
    case "production":
      return parseInt(process.env.DB_POOL_SIZE || "20");
    case "test":
      return 5;
    default:
      return 10;
  }
};

// Migration path configuration
const getMigrationsPath = () => {
  const basePath = config.node_env === "development" ? "src" : "dist";
  return [`${basePath}/api/migrations/**/*.{ts,js}`];
};

const AppDataSource = new DataSource({
  type: "postgres",
  host: config.db.host,
  port: config.db.port,
  username: config.db.db_user,
  password: config.db.db_password,
  database: config.db.db_name,
  entities: [User, Account, Loan, Payee, Token, Transaction],
  logging:
    config.node_env === "development"
      ? ["error", "warn", "schema"] // Add query logging in dev
      : ["error"],
  synchronize: config.node_env === "development" || config.node_env === "test",
  migrations: getMigrationsPath(),
  migrationsTableName: config.db.db_migration_name || "migrations",
  migrationsRun: false,
  migrationsTransactionMode: "all",
  ssl: getSSLConfig(),
  poolSize: getPoolSize(),
  extra: {
    connectionTimeoutMillis: parseInt(
      process.env.DB_CONNECTION_TIMEOUT || "5000",
    ),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || "30000"),
    max: getPoolSize(),
  },
});

const db_init = async (retries = 5, delay = 3000): Promise<void> => {
  let currentRetry = 0;

  while (currentRetry < retries) {
    try {
      await AppDataSource.initialize();
      log.info(
        `Database connection established successfully to ${config.db.host}:${config.db.port}/${config.db.db_name}`,
      );

      // Verify connection
      await AppDataSource.query("SELECT 1");
      log.info("Database connection verified");

      // Setup graceful shutdown after successful connection
      setupGracefulShutdown();

      return;
    } catch (error: any) {
      currentRetry++;
      log.error(
        `Database connection attempt ${currentRetry}/${retries} failed:`,
        error.message,
      );

      if (currentRetry === retries) {
        log.error("Max retries reached. Application cannot start.");
        throw error;
      }

      log.info(`Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
};

const setupGracefulShutdown = () => {
  const shutdown = async (signal: string) => {
    log.info(`${signal} received. Closing database connections...`);

    try {
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
        log.info("Database connections closed successfully");
      }
      process.exit(0);
    } catch (error: any) {
      log.error("Error during database shutdown:", error);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    if (!AppDataSource.isInitialized) return false;
    await AppDataSource.query("SELECT 1");
    return true;
  } catch (error: any) {
    log.error("Database health check failed:", error);
    return false;
  }
};

// Export configuration for use in tests
export const getDataSource = (): DataSource => AppDataSource;

export { AppDataSource, db_init, checkDatabaseHealth };
