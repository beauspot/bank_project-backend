import { AppConfig } from "@/interface/config";

const test_config: AppConfig = {
  node_env: "test",
  node_config_dir: process.env.NODE_CONFIG_DIR,
  server: {
    port: 3000,
  },
  app_name: {
    appName: "Bank-Express",
  },
  db: {
    host: "localhost",
    port: 5432,
    db_name: "test",
    db_password: "test",
    db_user: "user",
    db_migration_name: "test",
  },
  session: {
    session_secret: "secret",
  },
  redis: {
    redis_url_host: "localhost",
    redis_url_port: "6379",
  },
  paystack: {
    paystack_secret_key: process.env.TEST_SECRET_KEY,
    paystack_public_key: process.env.TEST_PUBLIC_KEY,
    prefered_bank: process.env.PREFERD_BANK,
  },
};

export default test_config;
