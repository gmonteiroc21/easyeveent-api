import { env } from "./env";
import { request } from "./httpClient";
import { isEventEntity, type EventEntity } from "./events";

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
