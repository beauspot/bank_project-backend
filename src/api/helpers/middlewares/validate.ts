import { NextFunction, Request, Response } from "express";
import { AnyZodObject, ZodError } from "zod";

export const validate =
  (schema: AnyZodObject) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Using parseAsync to handle async validations
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (e: any) {
      if (e instanceof ZodError) {
        const formattedErrors = e.errors.map((err) => ({
          message: err.message,
          // Joins the path array for readability
          path: err.path.join(" > "),
        }));

        // Send the formatted errors in the response
        return res.status(400).json({
          error_message: formattedErrors,
        });
      }

      // If the error is not a ZodError, forward it
      next(e);
    }
  };
