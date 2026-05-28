// Throw ApiError for failures the client is allowed to see, such as 400, 401, 403, 404, and 409.
export class ApiError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(
    statusCode: number,
    message: string,
    options: { code?: string; details?: unknown } = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = options.code ?? "apiError";
    this.details = options.details;
  }
}
