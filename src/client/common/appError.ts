export default class AppError extends Error {
  private readonly statusCode: number;
  private data: any;

  constructor(status = 500, message, data?: any) {
    // Calling parent constructor of base Error class.
    super(message);

    // Saving class name in the property of our custom error as a shortcut.
    this.name = this.constructor.name;

    // Capturing stack trace, excluding constructor call from it.
    Error.captureStackTrace(this, this.constructor);

    // You can use any additional properties you want.
    // I'm going to use preferred HTTP stats for this error types.
    // `500` is the default value if not specified.
    this.statusCode = status || 500;
    if (data) {
      this.data = data;
    }
  }
}
