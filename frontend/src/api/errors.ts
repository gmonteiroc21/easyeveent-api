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

export function extractApiBaseErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const details = (payload as Record<string, unknown>).details;
  if (!details || typeof details !== "object") return null;
  const base = (details as Record<string, unknown>).base;
  if (!Array.isArray(base)) return null;
  const first = base.find((item) => typeof item === "string" && item.trim() !== "");
  return typeof first === "string" ? first : null;
}
