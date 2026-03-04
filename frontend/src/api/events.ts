// frontend/src/api/events.ts
import { env } from "./env";
import { request } from "./httpClient";
import type { CheckinRuleEntity } from "./checkinRules";

export type EventStatus = string;

export type EventEntity = {
  id: number;
  title: string;
  description?: string | null;
  starts_at: string;
  location?: string | null;
  price?: number | null;
  banner?: string | null;
  status?: EventStatus | null;
  owned_by_me?: boolean;
  checkin_rules?: CheckinRuleEntity[];
};

export type EventInput = {
  title: string;
  description?: string | null;
  starts_at: string;
  location?: string | null;
  price: number | null;
  banner?: string | null;
  status?: EventStatus | null;
};

type RecordUnknown = Record<string, unknown>;

function isRecord(v: unknown): v is RecordUnknown {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isCheckinRuleEntity(v: unknown): v is CheckinRuleEntity {
  if (!isRecord(v)) return false;
  return (
    typeof v.id === "number" &&
    typeof v.event_id === "number" &&
    typeof v.rule_type === "string" &&
    typeof v.name === "string" &&
    typeof v.window_before_minutes === "number" &&
    typeof v.window_after_minutes === "number" &&
    typeof v.is_required === "boolean" &&
    typeof v.is_active === "boolean" &&
    typeof v.sort_order === "number" &&
    isRecord(v.config)
  );
}

export function isEventEntity(v: unknown): v is EventEntity {
  if (!isRecord(v)) return false;
  if (!(typeof v.id === "number" && typeof v.title === "string" && typeof v.starts_at === "string")) {
    return false;
  }
  if (v.checkin_rules == null) return true;
  if (!Array.isArray(v.checkin_rules)) return false;
  return v.checkin_rules.every(isCheckinRuleEntity);
}

function extractEvent(payload: unknown): EventEntity {
  // aceita: { event: {...} } ou {...}
  if (isRecord(payload) && "event" in payload) {
    const inner = payload.event;
    if (isEventEntity(inner)) return inner;
  }
  if (isEventEntity(payload)) return payload;

  throw new Error("Resposta inesperada ao buscar/criar/atualizar evento.");
}

function extractEvents(payload: unknown): EventEntity[] {
  // aceita: { events: [...] } ou [...]
  if (isRecord(payload) && "events" in payload && Array.isArray(payload.events)) {
    const arr = payload.events;
    if (arr.every(isEventEntity)) return arr;
  }

  if (Array.isArray(payload) && payload.every(isEventEntity)) {
    return payload;
  }

  throw new Error("Resposta inesperada ao listar eventos.");
}

function wrapBody(data: EventInput): unknown {
  return env.railsWrapParams ? { event: data } : data;
}

export const eventsApi = {
  async list(): Promise<EventEntity[]> {
    const payload = await request<unknown>(env.eventsPath);
    return extractEvents(payload);
  },

  async get(id: number): Promise<EventEntity> {
    const payload = await request<unknown>(`${env.eventsPath}/${id}`);
    return extractEvent(payload);
  },

  async create(input: EventInput): Promise<EventEntity> {
    const payload = await request<unknown>(env.eventsPath, {
      method: "POST",
      body: wrapBody(input),
    });
    return extractEvent(payload);
  },

  async update(id: number, input: EventInput): Promise<EventEntity> {
    const payload = await request<unknown>(`${env.eventsPath}/${id}`, {
      method: "PATCH",
      body: wrapBody(input),
    });
    return extractEvent(payload);
  },

  async remove(id: number): Promise<void> {
    await request<unknown>(`${env.eventsPath}/${id}`, { method: "DELETE" });
  },

  async purchase(id: number): Promise<void> {
    await request<unknown>(`${env.eventsPath}/${id}/purchase`, { method: "POST" });
  },
};
