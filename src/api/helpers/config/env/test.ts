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
  mail: {
    from: process.env.EMAIL_FROM,
    user: process.env.USERMAIL,
    password: process.env.MAIL_PASSWORD,
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    support_email: process.env.MAIL_SUPPORT,
    app_url: process.env.APP_URL,
  },
};

export default test_config;
