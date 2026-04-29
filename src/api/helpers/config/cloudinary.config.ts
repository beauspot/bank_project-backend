import { v2 as cldry } from "cloudinary";

import config from "@/config/env";
import AppError from "@/utils/appErrors";
import log from "@/utils/logging";

cldry.config({
  cloud_name: config.cloudinary.cloud_name,
  api_key: config.cloudinary.api_key,
  api_secret: config.cloudinary.api_secret,
});

// testing connection on startup
try {
  cldry.api.ping();
  log.info("✅ Cloudinary connected successfully");
} catch (error: any) {
  throw new AppError(`Cloudinary connection failed: ${error.message}`);
}

export { cldry };
