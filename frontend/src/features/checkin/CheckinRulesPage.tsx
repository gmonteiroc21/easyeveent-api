import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "react-router-dom";

import { eventsApi } from "../../api/events";

function formatPrice(price: number | null | undefined) {
  if (price == null) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);
}

const paymentMethodLabel: Record<string, string> = {
  pix: "PIX",
  card: "Cartão",
  boleto: "Boleto",
};

export function CheckinRulesPage() {
  const { eventId } = useParams();
  const [searchParams] = useSearchParams();

  const numericEventId = Number(eventId ?? "");
  const paymentMethod = searchParams.get("payment") ?? "";

  const eventQuery = useQuery({
    queryKey: ["event", numericEventId],
    queryFn: () => eventsApi.get(numericEventId),
    enabled: Number.isFinite(numericEventId) && numericEventId > 0,
  });

  const paymentLabel = useMemo(() => {
    if (!paymentMethod) return "Não informado";
    return paymentMethodLabel[paymentMethod] ?? paymentMethod;
  }, [paymentMethod]);

  if (!Number.isFinite(numericEventId) || numericEventId <= 0) {
    return (
      <section>
        <h2>Check-in</h2>
        <p className="muted">Evento inválido.</p>
      </section>
    );
  }

  if (eventQuery.isLoading) {
    return (
      <section>
        <h2>Check-in</h2>
        <p>Carregando informações do evento...</p>
      </section>
    );
  }

  if (eventQuery.isError || !eventQuery.data) {
    return (
      <section>
        <h2>Check-in</h2>
        <div className="alert">
          Não foi possível carregar as informações do evento.{" "}
          <button className="linkBtn" onClick={() => eventQuery.refetch()}>
            tentar novamente
          </button>
        </div>
      </section>
    );
  }

  const event = eventQuery.data;

  return (
    <section>
      <h2>Check-in</h2>
      <p className="muted">Informações da compra</p>

      <div className="checkinInfoCard">
        <dl className="checkinInfoList">
          <div>
            <dt>Nome do Evento</dt>
            <dd>{event.title}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{event.status || "-"}</dd>
          </div>
          <div>
            <dt>Preço</dt>
            <dd>{formatPrice(event.price)}</dd>
          </div>
          <div>
            <dt>Método de pagamento</dt>
            <dd>{paymentLabel}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
