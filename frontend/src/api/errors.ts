export class ApiError extends Error {
  public status: number;
  public payload: unknown;

  constructor(
    status: number,
    payload: unknown,
    message = "API request failed"
  ) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}