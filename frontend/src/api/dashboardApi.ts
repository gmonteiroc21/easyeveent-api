import { env } from "./env";
import { request } from "./httpClient";
import type { EventEntity } from "./events";

function isEventEntity(v: unknown): v is EventEntity {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
  const record = v as Record<string, unknown>;
  return (
    typeof record.id === "number" &&
    typeof record.title === "string" &&
    typeof record.starts_at === "string"
  );
}

export const dashboardApi = {
  async listShowcase(): Promise<EventEntity[]> {
    const payload = await request<unknown>(env.dashboardEventsPath);
    if (Array.isArray(payload) && payload.every(isEventEntity)) return payload;
    throw new Error("Resposta inesperada ao carregar vitrine de eventos.");
  },

  async getShowcaseEvent(id: number): Promise<EventEntity> {
    const payload = await request<unknown>(`${env.dashboardEventsPath}/${id}`);
    if (isEventEntity(payload)) return payload;
    throw new Error("Resposta inesperada ao carregar detalhes do evento.");
  },
};
