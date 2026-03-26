import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

const routeNotFound = (req: Request, res: Response, next: NextFunction) => {
  const errorMessage = `Cannot find ${req.originalUrl} on this server!`;
  log.error(`ROUTE ERROR: ${errorMessage}`);

  res.status(StatusCodes.NOT_FOUND).json({
    error: {
      message: errorMessage,
      status: "fail",
      statusCode: StatusCodes.NOT_FOUND,
    },
  });

  next();
};

export default routeNotFound;
