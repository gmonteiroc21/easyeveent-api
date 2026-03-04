import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { ApiError } from "../../api/errors";
import { dashboardApi } from "../../api/dashboardApi";
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

const ticketTypeLabel: Record<string, string> = {
  full: "Inteira",
  half: "Meia entrada",
};

type Flash = { type: "success" | "error"; message: string } | null;

export function PurchaseInfoPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [flash, setFlash] = useState<Flash>(null);

  const numericEventId = Number(eventId ?? "");
  const paymentMethod = searchParams.get("payment") ?? "";
  const ticketType = searchParams.get("ticket") ?? "";
  const mode = searchParams.get("mode") ?? "";

  const eventQuery = useQuery({
    queryKey: ["dashboard-event", numericEventId, "purchase"],
    queryFn: () => dashboardApi.getShowcaseEvent(numericEventId),
    enabled: Number.isFinite(numericEventId) && numericEventId > 0,
  });

  const purchaseMut = useMutation({
    mutationFn: async (values: { payment: "pix" | "card" | "boleto"; ticket?: "full" | "half" }) => {
      void values;
      await eventsApi.purchase(numericEventId);
    },
    onSuccess: (_data, values: { payment: "pix" | "card" | "boleto"; ticket?: "full" | "half" }) => {
      const params = new URLSearchParams();
      params.set("payment", values.payment);
      if (values.ticket) params.set("ticket", values.ticket);
      navigate(`/events/${numericEventId}/purchase?${params.toString()}`, { replace: true });
      setFlash({ type: "success", message: "Compra confirmada com sucesso." });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 403) {
        setFlash({ type: "error", message: "Você não pode comprar ingresso para um evento seu." });
        return;
      }
      if (error instanceof ApiError && error.status === 422) {
        setFlash({ type: "error", message: "Não foi possível concluir a compra (422)." });
        return;
      }
      setFlash({ type: "error", message: "Erro ao confirmar compra." });
    },
  });

  const paymentLabel = useMemo(() => {
    if (!paymentMethod) return "Não informado";
    return paymentMethodLabel[paymentMethod] ?? paymentMethod;
  }, [paymentMethod]);

  const ticketLabel = useMemo(() => {
    if (!ticketType) return "Não informado";
    return ticketTypeLabel[ticketType] ?? ticketType;
  }, [ticketType]);

  if (!Number.isFinite(numericEventId) || numericEventId <= 0) {
    return (
      <section>
        <h2>Compra</h2>
        <p className="muted">Evento inválido.</p>
      </section>
    );
  }

  if (eventQuery.isLoading) {
    return (
      <section>
        <h2>Compra</h2>
        <p>Carregando informações do evento...</p>
      </section>
    );
  }

  if (eventQuery.isError || !eventQuery.data) {
    return (
      <section>
        <h2>Compra</h2>
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
  const shouldShowForm = mode === "form" || !paymentMethod;
  const hasPaidTicket = (event.price ?? 0) > 0;
  const activeRulesCount = event.checkin_rules?.filter((rule) => rule.is_active).length ?? 0;
  const requiredRulesCount = event.checkin_rules?.filter((rule) => rule.is_active && rule.is_required).length ?? 0;

  return (
    <section>
      <h2>Compra</h2>
      {flash && (
        <div className={`flash ${flash.type}`}>
          {flash.message}
          <button className="linkBtn" onClick={() => setFlash(null)}>
            fechar
          </button>
        </div>
      )}

      {shouldShowForm ? (
        <>
          <p className="muted">Preencha os dados para concluir a compra</p>
          <p className="muted">
            Regras do evento:{" "}
            {activeRulesCount > 0
              ? `${activeRulesCount} ativa(s), ${requiredRulesCount} obrigatória(s)`
              : "nenhuma regra ativa"}
          </p>
          <PurchaseForm
            hasPaidTicket={hasPaidTicket}
            busy={purchaseMut.isPending}
            onCancel={() => navigate(-1)}
            onSubmit={(values) => {
              setFlash(null);
              purchaseMut.mutate(values);
            }}
          />
        </>
      ) : (
        <>
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
              {hasPaidTicket && (
                <div>
                  <dt>Tipo de ingresso</dt>
                  <dd>{ticketLabel}</dd>
                </div>
              )}
              <div>
                <dt>Método de pagamento</dt>
                <dd>{paymentLabel}</dd>
              </div>
              <div>
                <dt>Regras ativas</dt>
                <dd>{activeRulesCount}</dd>
              </div>
              <div>
                <dt>Regras obrigatórias ativas</dt>
                <dd>{requiredRulesCount}</dd>
              </div>
            </dl>
          </div>

          <div className="modalFooter">
            <button
              type="button"
              className="btn"
              onClick={() => navigate(`/events/${event.id}/purchase?mode=form`, { replace: true })}
            >
              Alterar compra
            </button>
          </div>
        </>
      )}
    </section>
  );
}

type PurchaseFormProps = {
  hasPaidTicket: boolean;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (values: { payment: "pix" | "card" | "boleto"; ticket?: "full" | "half" }) => void;
};

function PurchaseForm({ hasPaidTicket, busy, onCancel, onSubmit }: PurchaseFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payment = String(form.get("payment") ?? "") as "pix" | "card" | "boleto";
    const ticket = String(form.get("ticket") ?? "") as "full" | "half";
    if (!payment) return;
    if (hasPaidTicket) {
      if (!ticket) return;
      onSubmit({ payment, ticket });
      return;
    }
    onSubmit({ payment });
  }

  return (
    <form className="card form" onSubmit={handleSubmit}>
      {hasPaidTicket ? (
        <label>
          Tipo de ingresso
          <select name="ticket" defaultValue="full">
            <option value="full">Inteira</option>
            <option value="half">Meia entrada</option>
          </select>
        </label>
      ) : (
        <p className="muted">Evento gratuito: sem seleção de tipo de ingresso.</p>
      )}

      <label>
        Método de pagamento
        <select name="payment" defaultValue="pix">
          <option value="pix">PIX</option>
          <option value="card">Cartão</option>
          <option value="boleto">Boleto</option>
        </select>
      </label>

      <footer className="modalFooter">
        <button type="button" className="btn" onClick={onCancel} disabled={busy}>
          Voltar
        </button>
        <button type="submit" className="btn primary" disabled={busy}>
          {busy ? "Confirmando..." : "Confirmar compra"}
          </button>
      </footer>
    </form>
  );
}
