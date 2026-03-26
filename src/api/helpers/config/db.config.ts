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

// TODO: Validate required database configuration
if (
  !config.db.host ||
  !config.db.port ||
  !config.db.db_user ||
  !config.db.db_password ||
  !config.db.db_name
) {
  log.error("Missing required database configuration:");
  log.error(`Host: ${config.db.host}`);
  log.error(`Port: ${config.db.port}`);
  log.error(`User: ${config.db.db_user}`);
  log.error(`Database: ${config.db.db_name}`);
  throw new Error(`Database configuration error: Missing required parameters`);
}

const AppDataSource = new DataSource({
  type: "postgres",
  host: config.db.host,
  port: config.db.port,
  username: config.db.db_user,
  password: config.db.db_password,
  database: config.db.db_name,
  entities: [User, Account, Loan, Payee, Token, Transaction],
  logging:
    config.node_env === "development" ? ["error", "warn", "schema"] : ["error"],
  synchronize: config.node_env === "development" || config.node_env === "test", // Only sync in dev & test environment
  migrations: ["src/api/migrations/**/*.ts"],
  migrationsTableName: config.db.db_migration_name,
  ssl: config.node_env === "production" ? { rejectUnauthorized: false } : false,
  poolSize: 10,
  extra: {
    connectionTimeoutMillis: 5000, // 5 seconds timeout
  },
});

const db_init = async () => {
  try {
    await AppDataSource.initialize();
    log.info(
      `Database connection established successfully to ${config.db.host}:${config.db.port}/${config.db.db_name}`,
    );

    // Verify connection with a test query
    await AppDataSource.query("SELECT 1");
    log.info("Database connection verified");
  } catch (error: any) {
    log.error("Database initialization error:", error.message);
    log.error("Stack trace:", error.stack);
    throw error; // Re-throw to prevent application startup
  }
};

export { AppDataSource, db_init };
