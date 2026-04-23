import * as dotenv from "dotenv";

import { AppConfig } from "@/interface/config";
dotenv.config();

// Default configuration for the application
// This file is used to set up default values for the environment variables
// and can be overridden by environment-specific configurations.

// put an interface here to make sure the config matches certain criteria.
// Set validation with zod.

const default_config: AppConfig = {
  node_env: process.env.NODE_ENV || "development",
  node_config_dir: process.env.NODE_CONFIG_DIR,
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  },
  app_name: {
    appName: process.env.APP_NAME,
  },
  db: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
    db_name: process.env.DB_NAME,
    db_password: process.env.DB_PASS,
    db_user: process.env.DB_USER,
    db_migration_name: process.env.DBM_MIGRATION || "migrations",
  },
  session: {
    session_secret: process.env.SESSION_SECRET,
  },
  redis: {
    redis_url_host: process.env.REDIS_URL_HOST,
    redis_url_port: process.env.REDIS_URL_PORT,
  },
  paystack: {
    paystack_secret_key: process.env.TEST_SECRET_KEY,
    paystack_public_key: process.env.TEST_PUBLIC_KEY,
    prefered_bank: process.env.PREFERD_BANK,
  },
  mail: {
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    user: process.env.MAIL_USER,
    password: process.env.MAIL_PASSWORD,
    from: process.env.MAIL_FROM,
    support_email: process.env.MAIL_SUPPORT,
    app_url: process.env.APP_URL,
  },
};

export default default_config;
