// Defined an interface to handle all envs

export interface AppConfig {
  node_env: string;
  node_config_dir: string | undefined;
  server: {
    port: number;
  };

  app_name: {
    appName: string | undefined;
  };

  db: {
    host: string | undefined;
    port: number;
    db_name: string | undefined;
    db_password: string | undefined;
    db_user: string | undefined;
    db_migration_name: string;
  };

  session: {
    session_secret: string | undefined;
  };

  redis: {
    redis_url_host: string | undefined;
    redis_url_port: string | undefined;
  };

  paystack: {
    paystack_secret_key: string | undefined;
    paystack_public_key: string | undefined;
    prefered_bank: string | undefined;
  };

  mail: {
    host: string | undefined;
    port: string | undefined;
    user: string | undefined;
    password: string | undefined;
    from: string | undefined;
    support_email: string | undefined;
    app_url: string | undefined;
  };
}
