import { ErrorRequestHandler, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { QueryFailedError, EntityNotFoundError } from "typeorm";

import AppError from "@/utils/appErrors";

const globalErrorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
) => {
  // Default error response
  const e = new Error();
  let statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
  let message = e.message; // Get the actual message rather than some random text
  let isOperational = false;

  if (err instanceof AppError) {
    statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
    message = err.message;
    isOperational = err.isOperational || false;
  } else if (err instanceof EntityNotFoundError) {
    statusCode = StatusCodes.NOT_FOUND;
    message = "Entity not found";
    isOperational = true;
  } else if (err instanceof SyntaxError) {
    statusCode = StatusCodes.BAD_REQUEST;
    message = "Invalid JSON payload";
    isOperational = true;
  } else if (err instanceof QueryFailedError) {
    switch (true) {
      case err.message.includes("duplicate key"):
        statusCode = StatusCodes.CONFLICT;
        message = "Duplicate entry, already exists";
        isOperational = true;
        break;
      case err.message.includes("foreign key constraint"):
        statusCode = StatusCodes.BAD_REQUEST;
        message = "Invalid foreign key reference";
        isOperational = true;
        break;
      case err.message.includes("does not exist"):
        statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
        message = "Database table or column not found";
        isOperational = false;
        break;
      case err.message.includes("timeout"):
        statusCode = StatusCodes.REQUEST_TIMEOUT;
        message = "Database request timed out";
        isOperational = true;
        break;
      case err.message.includes("syntax error"):
        statusCode = StatusCodes.BAD_REQUEST;
        message = "Invalid query syntax";
        isOperational = true;
        break;
      default:
        statusCode = StatusCodes.BAD_REQUEST;
        message = "Database operation failed";
        isOperational = true;
        break;
    }
  }

  // Log errors based on severity
  if (isOperational) {
    log.warn(
      {
        statusCode,
        path: req.path,
        method: req.method,
      },
      `⚠️ Operational Error: ${message}`,
    );
  } else {
    log.error(
      {
        statusCode,
        path: req.path,
        method: req.method,
      },
      `💥 Critical Error: ${err.message}`,
    );
  }

  // Log errors (optional)
  log.error({ error: err }, `🚨 ERROR: ${message}`);

  // Simplified JSON response (no stack trace in production)
  const response: Record<string, any> = {
    status: statusCode >= 500 ? "error" : "fail",
    message,
  };

  if (process.env.NODE_ENV === "development") {
    response.stack = err.stack; // Only show stack trace in development
    response.error = err.name;
  }

  res.status(statusCode).json(response);
};

export default globalErrorHandler;
