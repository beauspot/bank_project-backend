/* import defaultConfig from "@/config/env/default";
import prod_config from "@/config/env/production";
import testConfig from "@/config/env/test"; */

// src/api/helpers/config/env/index.ts

let config: Record<string, any>;

switch (process.env.NODE_ENV) {
  case "production": {
    const { default: prodConfig } = await import("@/config/env/production");
    config = prodConfig;
    break;
  }
  case "test": {
    const { default: testConfig } = await import("@/config/env/test");
    config = testConfig;
    break;
  }
  default: {
    const { default: devConfig } = await import("@/config/env/default");
    config = devConfig;
    break;
  }
}

export default config;

/* const env = process.env.NODE_ENV || "development";

const configs: Record<string, any> = {
  development: defaultConfig,
  test: testConfig,
  production: prod_config,
};

export default configs[env] || defaultConfig; */

// TODO: All Configs must be exported globally for ease of accessibility.
