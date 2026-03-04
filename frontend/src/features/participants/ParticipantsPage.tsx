import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

import { ApiError, extractApiBaseErrorMessage } from "../../api/errors";
import { eventsApi, type EventEntity } from "../../api/events";
import { participantsApi } from "../../api/participants";

type Flash = { type: "success" | "error"; message: string } | null;

function normalizeConfig(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => normalizeConfig(item));
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = normalizeConfig(record[key]);
        return acc;
      }, {});
  }
  return value;
}

function canonicalRules(event: EventEntity) {
  return (event.checkin_rules ?? [])
    .filter((rule) => rule.is_active)
    .map((rule) => ({
      rule_type: rule.rule_type,
      window_before_minutes: rule.window_before_minutes,
      window_after_minutes: rule.window_after_minutes,
      is_required: rule.is_required,
      is_active: rule.is_active,
      config: normalizeConfig(rule.config),
    }))
    .sort((a, b) =>
      a.rule_type.localeCompare(b.rule_type) ||
      a.window_before_minutes - b.window_before_minutes ||
      a.window_after_minutes - b.window_after_minutes ||
      Number(a.is_required) - Number(b.is_required)
    );
}

function sameRules(a: EventEntity, b: EventEntity) {
  return JSON.stringify(canonicalRules(a)) === JSON.stringify(canonicalRules(b));
}

export function ParticipantsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [flash, setFlash] = useState<Flash>(null);
  const [transferTargetByMembership, setTransferTargetByMembership] = useState<Record<number, string>>({});

  const eventsQuery = useQuery({
    queryKey: ["events", "participants-page"],
    queryFn: () => eventsApi.list(),
  });

  const ownerEvents = useMemo(
    () => (eventsQuery.data ?? []).filter((event) => event.owned_by_me),
    [eventsQuery.data]
  );
  const selectedEventId = Number(searchParams.get("eventId") ?? "");
  const selectedEventFromQuery = Number.isFinite(selectedEventId) && selectedEventId > 0 ? selectedEventId : null;

  const selectedEvent = useMemo(
    () => ownerEvents.find((event) => event.id === selectedEventFromQuery) ?? ownerEvents[0] ?? null,
    [ownerEvents, selectedEventFromQuery]
  );

  const participantsQuery = useQuery({
    queryKey: ["participants", selectedEvent?.id],
    queryFn: () => participantsApi.list(selectedEvent!.id),
    enabled: Boolean(selectedEvent?.id),
  });

  const transferMut = useMutation({
    mutationFn: async (payload: { membershipId: number; toEventId: number }) => {
      if (!selectedEvent) throw new Error("Evento não selecionado.");
      await participantsApi.transfer(selectedEvent.id, payload.membershipId, payload.toEventId);
    },
    onSuccess: async () => {
      setFlash({ type: "success", message: "Participante transferido com sucesso." });
      await participantsQuery.refetch();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 422) {
        setFlash({
          type: "error",
          message: extractApiBaseErrorMessage(error.payload) || "Transferência inválida: regras incompatíveis ou destino inválido.",
        });
        return;
      }
      if (error instanceof ApiError && error.status === 403) {
        setFlash({ type: "error", message: "Sem permissão para transferir participante." });
        return;
      }
      setFlash({ type: "error", message: "Erro ao transferir participante." });
    },
  });

  const exportMut = useMutation({
    mutationFn: async () => {
      if (!selectedEvent) throw new Error("Evento não selecionado.");
      return participantsApi.export(selectedEvent.id);
    },
    onSuccess: (payload) => {
      const blob = new Blob([payload.content], {
        type: payload.format === "csv" ? "text/csv;charset=utf-8" : "text/plain;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = payload.file_name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setFlash({ type: "success", message: "Exportação gerada com sucesso." });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 403) {
        setFlash({ type: "error", message: "Sem permissão para exportar participantes." });
        return;
      }
      setFlash({ type: "error", message: "Erro ao exportar participantes." });
    },
  });

  const compatibleDestinations = useMemo(() => {
    if (!selectedEvent) return [];
    return ownerEvents.filter((event) => event.id !== selectedEvent.id && sameRules(selectedEvent, event));
  }, [ownerEvents, selectedEvent]);

  return (
    <section>
      <header className="pageHeader">
        <div>
          <h2>Participantes</h2>
          <p className="muted">Lista de participantes por evento com transferência entre eventos owner compatíveis.</p>
        </div>
      </header>

      {flash && (
        <div className={`flash ${flash.type}`}>
          {flash.message}
          <button className="linkBtn" onClick={() => setFlash(null)}>
            fechar
          </button>
        </div>
      )}

      {eventsQuery.isLoading && <p>Carregando eventos...</p>}
      {eventsQuery.isError && <div className="alert">Não foi possível carregar seus eventos.</div>}

      {!eventsQuery.isLoading && !eventsQuery.isError && ownerEvents.length === 0 && (
        <div className="empty">Você não possui eventos como owner.</div>
      )}

      {!eventsQuery.isLoading && !eventsQuery.isError && ownerEvents.length > 0 && (
        <>
          <div className="toolbar eventsToolbar">
            <label>
              Evento
              <select
                value={selectedEvent?.id ?? ""}
                onChange={(event) => {
                  const nextEventId = Number(event.target.value);
                  const next = new URLSearchParams(searchParams);
                  next.set("eventId", String(nextEventId));
                  setSearchParams(next, { replace: true });
                }}
              >
                {ownerEvents.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn"
              disabled={exportMut.isPending || !selectedEvent}
              onClick={() => {
                setFlash(null);
                void exportMut.mutateAsync();
              }}
            >
              {exportMut.isPending ? "Exportando..." : "Exportar participantes"}
            </button>
          </div>

          {participantsQuery.isLoading && <p>Carregando participantes...</p>}
          {participantsQuery.isError && <div className="alert">Não foi possível carregar participantes.</div>}

          {!participantsQuery.isLoading && !participantsQuery.isError && (participantsQuery.data?.length ?? 0) === 0 && (
            <div className="empty">Nenhum participante neste evento.</div>
          )}

          {!participantsQuery.isLoading && !participantsQuery.isError && (participantsQuery.data?.length ?? 0) > 0 && (
            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Login</th>
                    <th>Entrou em</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(participantsQuery.data ?? []).map((membership) => {
                    const targetId = transferTargetByMembership[membership.id] ?? "";
                    const disabled = transferMut.isPending || compatibleDestinations.length === 0;
                    return (
                      <tr key={membership.id}>
                        <td>{membership.user.name}</td>
                        <td>{membership.user.email}</td>
                        <td>{membership.user.login}</td>
                        <td>{new Date(membership.created_at).toLocaleString()}</td>
                        <td className="actions">
                          <select
                            value={targetId}
                            onChange={(event) =>
                              setTransferTargetByMembership((prev) => ({
                                ...prev,
                                [membership.id]: event.target.value,
                              }))
                            }
                            disabled={disabled}
                          >
                            <option value="">
                              {compatibleDestinations.length === 0 ? "Sem destino compatível" : "Selecionar destino"}
                            </option>
                            {compatibleDestinations.map((destination) => (
                              <option key={destination.id} value={destination.id}>
                                {destination.title}
                              </option>
                            ))}
                          </select>
                          <button
                            className="btn"
                            type="button"
                            disabled={disabled || !targetId}
                            onClick={() => {
                              setFlash(null);
                              void transferMut.mutateAsync({
                                membershipId: membership.id,
                                toEventId: Number(targetId),
                              });
                            }}
                          >
                            Transferir
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
