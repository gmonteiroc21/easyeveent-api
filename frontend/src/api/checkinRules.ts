import { env } from "./env";
import { request } from "./httpClient";

export type CheckinRuleEntity = {
  id: number;
  event_id: number;
  rule_type: string;
  name: string;
  window_before_minutes: number;
  window_after_minutes: number;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  config: Record<string, unknown>;
};

export type CheckinRuleInput = {
  id?: number;
  rule_type: string;
  name: string;
  window_before_minutes: number;
  window_after_minutes: number;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  config: Record<string, unknown>;
};

type RecordUnknown = Record<string, unknown>;

function isRecord(v: unknown): v is RecordUnknown {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isCheckinRule(v: unknown): v is CheckinRuleEntity {
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

function wrapBody(data: CheckinRuleInput): unknown {
  return env.railsWrapParams ? { checkin_rule: data } : data;
}

function basePath(eventId: number) {
  return `${env.eventsPath}/${eventId}/checkin_rules`;
}

export const checkinRulesApi = {
  async list(eventId: number): Promise<CheckinRuleEntity[]> {
    const payload = await request<unknown>(basePath(eventId));
    if (Array.isArray(payload) && payload.every(isCheckinRule)) return payload;
    throw new Error("Resposta inesperada ao listar regras de check-in.");
  },

  async create(eventId: number, input: CheckinRuleInput): Promise<CheckinRuleEntity> {
    const payload = await request<unknown>(basePath(eventId), {
      method: "POST",
      body: wrapBody(input),
    });
    if (isCheckinRule(payload)) return payload;
    throw new Error("Resposta inesperada ao criar regra de check-in.");
  },

  async update(eventId: number, id: number, input: CheckinRuleInput): Promise<CheckinRuleEntity> {
    const payload = await request<unknown>(`${basePath(eventId)}/${id}`, {
      method: "PATCH",
      body: wrapBody(input),
    });
    if (isCheckinRule(payload)) return payload;
    throw new Error("Resposta inesperada ao atualizar regra de check-in.");
  },

  async remove(eventId: number, id: number): Promise<void> {
    await request<unknown>(`${basePath(eventId)}/${id}`, { method: "DELETE" });
  },

  async sync(eventId: number, rules: CheckinRuleInput[]): Promise<CheckinRuleEntity[]> {
    const payload = await request<unknown>(`${basePath(eventId)}/sync`, {
      method: "PUT",
      body: { rules },
    });
    if (Array.isArray(payload) && payload.every(isCheckinRule)) return payload;
    throw new Error("Resposta inesperada ao sincronizar regras de check-in.");
  },
};
