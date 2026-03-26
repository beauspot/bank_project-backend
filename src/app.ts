// import path from "path";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Express, Response } from "express";
import rateLimit from "express-rate-limit";
import session from "express-session";
import helmet, { HelmetOptions } from "helmet";
import morgan from "morgan";
// import swaggerUI from "swagger-ui-express";
// import YAML from "yamljs";

import config from "@/api/helpers/config/env";
import routeNotFound from "@/middlewares/__404__notfound";
import globalErrorHandler from "@/middlewares/errHandler";
import redisModule from "@/utils/redis";

// Redis
const { redisStore } = redisModule;

// Rate-limiter Config
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

const helmetConfig: HelmetOptions = {
  frameguard: { action: "deny" },
  xssFilter: true,
  referrerPolicy: { policy: "same-origin" },
  hsts: { maxAge: 15552000, includeSubDomains: true, preload: true },
};

function createAppServer(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(helmet(helmetConfig));
  app.use(helmet.hidePoweredBy());
  app.use(helmet.noSniff());
  app.use(helmet.ieNoOpen());
  app.use(helmet.dnsPrefetchControl());
  app.use(helmet.permittedCrossDomainPolicies());
  app.use(cookieParser());
  app.use(compression());
  app.use(limiter);
  app.use(
    session({
      secret: config.session.session_secret || "default_fallback_secret",
      resave: false,
      saveUninitialized: false, // if true throws an error
      store: redisStore,
      cookie: {
        maxAge: 30 * 60 * 1000, // 30mins
        secure: config.node_env === "production",
        httpOnly: true,
        sameSite: "strict",
      },
    }),
  );

  if (config.node_env === "development") {
    morgan.token("headers", (req) => JSON.stringify(req.headers));
    app.use(
      morgan(
        ":method :url :status :res[content-length] - :response-time ms :headers",
      ),
    );
  }

  /**
   * @GET endpoint to be available only on development or staging environments
   * to provide access to the API documentation.
   */
  if (config.node_env === "development" || config.node_env === "test") {
    app.get("/", (_, res: Response) =>
      res.send(
        `<h1>${config.app_name.appName} API Documentation</h1><a href="/api-docs">Documentation</a>`,
      ),
    );

    // TODO: SWAGGER API Documentation Endpoint Comes under this line
    /**
     * @GET this is to enable swagger documentation to
     * only be accessible on development/test mode,
     * and not on production.
     */
  }

  app.use(routeNotFound);

  app.use(globalErrorHandler);

  return app;
}

export default createAppServer;
