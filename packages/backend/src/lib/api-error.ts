// Throw ApiError for failures the client is allowed to see, such as 400, 401, 403, 404, and 409.
export class ApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}
