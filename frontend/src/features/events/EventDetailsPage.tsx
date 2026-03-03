import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";

import { ApiError } from "../../api/errors";
import { dashboardApi } from "../../api/dashboardApi";
import { eventsApi } from "../../api/events";
import { EventDetailsModal } from "./EventDetailsModal";

type Flash = { type: "success" | "error"; message: string } | null;

export function EventDetailsPage() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const [flash, setFlash] = useState<Flash>(null);

  const numericEventId = Number(eventId ?? "");

  const eventQuery = useQuery({
    queryKey: ["dashboard-event", numericEventId],
    queryFn: () => dashboardApi.getShowcaseEvent(numericEventId),
    enabled: Number.isFinite(numericEventId) && numericEventId > 0,
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => eventsApi.remove(id),
    onSuccess: () => navigate("/dashboard", { replace: true }),
    onError: (err) => {
      if (err instanceof ApiError && err.status === 403) {
        setFlash({ type: "error", message: "Apenas o dono pode remover este evento." });
        return;
      }
      setFlash({ type: "error", message: "Erro ao remover o evento." });
    },
  });

  if (!Number.isFinite(numericEventId) || numericEventId <= 0) {
    return <p className="muted">Evento inválido.</p>;
  }

  if (eventQuery.isLoading) {
    return <p>Carregando detalhes do evento...</p>;
  }

  if (eventQuery.isError || !eventQuery.data) {
    return (
      <div className="alert">
        Não foi possível carregar os detalhes do evento.{" "}
        <button className="linkBtn" onClick={() => eventQuery.refetch()}>
          tentar novamente
        </button>
      </div>
    );
  }

  const event = eventQuery.data;

  return (
    <>
      {flash && (
        <div className={`flash ${flash.type}`}>
          {flash.message}
          <button className="linkBtn" onClick={() => setFlash(null)}>
            fechar
          </button>
        </div>
      )}

      <EventDetailsModal
        event={event}
        onClose={() => navigate(-1)}
        onSave={() => setFlash({ type: "success", message: "Evento salvo nos favoritos." })}
        onBuy={() => navigate(`/eventos/${event.id}/compra?mode=form`)}
        onEdit={() => navigate(`/eventos?editEventId=${event.id}`)}
        onDelete={() => {
          const ok = window.confirm("Tem certeza que deseja remover este evento?");
          if (!ok) return;
          deleteMut.mutate(event.id);
        }}
      />
    </>
  );
}
