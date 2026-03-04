import { env } from "./env";
import { request } from "./httpClient";

export type ParticipantUser = {
  id: number;
  name: string;
  email: string;
  login: string;
};

export type ParticipantMembership = {
  id: number;
  user_id: number;
  event_id: number;
  role: "owner" | "participant";
  document?: string | null;
  created_at: string;
  updated_at: string;
  user: ParticipantUser;
};

export type ParticipantsExportPayload = {
  file_name: string;
  content: string;
  format: "csv" | "pdf" | string;
  participants_count: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isParticipantUser(value: unknown): value is ParticipantUser {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "number" &&
    typeof value.name === "string" &&
    typeof value.email === "string" &&
    typeof value.login === "string"
  );
}

function isMembership(value: unknown): value is ParticipantMembership {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "number" &&
    typeof value.user_id === "number" &&
    typeof value.event_id === "number" &&
    (value.role === "owner" || value.role === "participant") &&
    (value.document == null || typeof value.document === "string") &&
    typeof value.created_at === "string" &&
    typeof value.updated_at === "string" &&
    isParticipantUser(value.user)
  );
}

function isExportPayload(value: unknown): value is ParticipantsExportPayload {
  if (!isRecord(value)) return false;
  return (
    typeof value.file_name === "string" &&
    typeof value.content === "string" &&
    typeof value.format === "string" &&
    typeof value.participants_count === "number"
  );
}

function basePath(eventId: number) {
  return `${env.eventsPath}/${eventId}/participants`;
}

export const participantsApi = {
  async list(eventId: number): Promise<ParticipantMembership[]> {
    const payload = await request<unknown>(basePath(eventId));
    if (Array.isArray(payload) && payload.every(isMembership)) return payload;
    throw new Error("Resposta inesperada ao listar participantes.");
  },

  async transfer(eventId: number, membershipId: number, toEventId: number): Promise<void> {
    await request<unknown>(`${basePath(eventId)}/${membershipId}/transfer`, {
      method: "POST",
      body: { to_event_id: toEventId },
    });
  },

  async export(eventId: number): Promise<ParticipantsExportPayload> {
    const payload = await request<unknown>(`${basePath(eventId)}/export`);
    if (isExportPayload(payload)) return payload;
    throw new Error("Resposta inesperada ao exportar participantes.");
  },
};
