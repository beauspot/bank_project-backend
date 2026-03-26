import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import dayjs from "dayjs";
import pino from "pino";

import config from "@/api/helpers/config/env";

// Get environment from config
const nodeEnv = config.node_env;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logDir = path.resolve(__dirname, "../../../../logs");

// Ensure logs directory exists in production
if (nodeEnv === "production") {
  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true, mode: 0o755 });
    }
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error(`Error creating log directory: ${err.message}`);
    process.exit(1);
  }

  // Ensure write permission
  try {
    fs.accessSync(logDir, fs.constants.W_OK);
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error(
      `No write permissions for log directory: ${logDir} ${error.message}`,
    );
    process.exit(1);
  }
}

// Set up streams based on environment
let streams;
if (nodeEnv === "development") {
  // Development/Test: logs to terminal
  streams = [
    {
      level: "trace", // Capture all log levels
      stream: pino.transport({
        target: "pino-pretty",
        options: { colorize: true },
      }),
    },
  ];
} else if (nodeEnv === "test") {
  // For Tests.. no worker threads behind the scenes.
  streams = [{ level: "silent", stream: process.stdout }];
} else {
  // Production: logs to files
  streams = [
    { level: "info", stream: pino.destination(path.join(logDir, "info.log")) },
    {
      level: "error",
      stream: pino.destination(path.join(logDir, "error.log")),
    },
    {
      level: "debug",
      stream: pino.destination(path.join(logDir, "debug.log")),
    },
    { level: "warn", stream: pino.destination(path.join(logDir, "warn.log")) },
    {
      level: "fatal",
      stream: pino.destination(path.join(logDir, "fatal.log")),
    },
    {
      level: "trace",
      stream: pino.destination(path.join(logDir, "trace.log")),
    },
  ];
}

// Initialize the logger
const logging = pino(
  {
    level: "trace", // Capture all log levels
    base: { pid: false },
    timestamp: () => `,"time":"${dayjs().format()}"`,
  },
  pino.multistream(streams), // Use pino.multistream for handling multiple streams
);

/** Create the global definition */

// TODO: log should be available globally to be used around the project.
declare global {
  // @ts-expect-warning
  var log: pino.Logger;
}

/** Link the global logger correctly */
globalThis.log = logging;

// ** Test Logging **
logging.info(`Logger initialized - TESTING - Environment: ${nodeEnv}`);
logging.error("Logger initialized - TESTING - Environment: Error level");

export default logging;
