class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400,
    public isOperational: boolean = true,
  ) {
    super(message);

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    this.name = this.constructor.name;
    this.isOperational = isOperational;
  }
}

// Global availability
declare global {
  // @ts-expect-warning
  var AppError: any;
}

global.AppError = AppError;

export default AppError;
