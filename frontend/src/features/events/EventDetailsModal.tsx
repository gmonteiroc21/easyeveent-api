import { useState } from "react";
import type { EventEntity } from "../../api/events";

type EventDetailsModalProps = {
  event: EventEntity;
  onClose: () => void;
  onSave: () => void;
  onBuy: (paymentMethod: PaymentMethod) => void;
  onEdit: () => void;
  onDelete: () => void;
};

type PaymentMethod = "pix" | "card" | "boleto";
type TicketType = "full" | "half";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function formatPrice(price: number | null | undefined) {
  if (price == null) return "-";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);
}

function toSvgDataUrl(svg: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function buildPlaceholderBanner(title: string) {
  const safeTitle = title.replace(/[<>&"']/g, "");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600" viewBox="0 0 1200 600">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1d2d59" />
          <stop offset="50%" stop-color="#b84d06" />
          <stop offset="100%" stop-color="#57d6c1" />
        </linearGradient>
      </defs>
      <rect width="1200" height="600" fill="url(#bg)" />
      <text x="60" y="520" fill="#f7faff" font-size="52" font-family="Arial, sans-serif" font-weight="700">
        ${safeTitle}
      </text>
    </svg>
  `;

  return toSvgDataUrl(svg);
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

type EventDetailsOverviewProps = {
  event: EventEntity;
  onSave: () => void;
  onStartBuy: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

function EventDetailsOverview({ event, onSave, onStartBuy, onEdit, onDelete }: EventDetailsOverviewProps) {
  return (
    <>
      <section className="eventDetailsMain">
        <h3>{event.title}</h3>
        <p>{event.description?.trim() || "Este evento ainda não possui descrição."}</p>
      </section>

      <aside className="eventDetailsSide">
        <dl className="eventMeta">
          <div>
            <dt>Início</dt>
            <dd>{formatDate(event.starts_at)}</dd>
          </div>
          <div>
            <dt>Local</dt>
            <dd>{event.location || "Não informado"}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{event.status || "-"}</dd>
          </div>
          <div>
            <dt>Preço</dt>
            <dd>{formatPrice(event.price)}</dd>
          </div>
        </dl>

        <div className="eventDetailsActions">
          <button type="button" className="btn" onClick={onSave}>
            Salvar
          </button>
          <button type="button" className="btn primary" onClick={onStartBuy} disabled={Boolean(event.owned_by_me)}>
            Comprar
          </button>
        </div>

        <div className="eventDetailsActions">
          <button type="button" className="btn" onClick={onEdit}>
            Editar
          </button>
          <button type="button" className="btn danger" onClick={onDelete}>
            Remover
          </button>
        </div>
      </aside>
    </>
  );
}

type EventPurchaseFormProps = {
  event: EventEntity;
  onBack: () => void;
  onSubmit: (paymentMethod: PaymentMethod) => void;
};

function EventPurchaseForm({ event, onBack, onSubmit }: EventPurchaseFormProps) {
  const ticketTypeAvailable = (event.price ?? 0) > 0;
  const [ticketType, setTicketType] = useState<TicketType>("full");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (ticketTypeAvailable && !ticketType) return;
    if (!paymentMethod) return;
    onSubmit(paymentMethod);
  }

  return (
    <section className="eventPurchaseSection">
      <h3>Finalizar compra</h3>
      <p className="muted">Evento: {event.title}</p>

      <form className="eventPurchaseForm" onSubmit={handleSubmit}>
        {ticketTypeAvailable ? (
          <label>
            Tipo de ingresso
            <select value={ticketType} onChange={(e) => setTicketType(e.target.value as TicketType)}>
              <option value="full">Inteira</option>
              <option value="half">Meia entrada</option>
            </select>
          </label>
        ) : (
          <p className="muted">Evento gratuito: sem seleção de tipo de ingresso.</p>
        )}

        <label>
          Método de pagamento
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
          >
            <option value="pix">PIX</option>
            <option value="card">Cartão</option>
            <option value="boleto">Boleto</option>
          </select>
        </label>

        <div className="eventDetailsActions">
          <button type="button" className="btn" onClick={onBack}>
            Voltar
          </button>
          <button type="submit" className="btn primary">
            Confirmar compra
          </button>
        </div>
      </form>
    </section>
  );
}

export function EventDetailsModal({
  event,
  onClose,
  onSave,
  onBuy,
  onEdit,
  onDelete,
}: EventDetailsModalProps) {
  const bannerSrc = event.banner?.trim() || buildPlaceholderBanner(event.title);
  const [mode, setMode] = useState<"details" | "purchase">("details");

  return (
    <div className="modalBackdrop" onMouseDown={onClose}>
      <div className="eventDetailsModal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="eventDetailsBannerWrap">
          <img className="eventDetailsBanner" src={bannerSrc} alt={`Banner do evento ${event.title}`} />

          <button className="eventDetailsClose" type="button" onClick={onClose} aria-label="Fechar modal">
            <XIcon />
          </button>
        </div>

        <div className="eventDetailsContent">
          {mode === "details" ? (
            <EventDetailsOverview
              event={event}
              onSave={onSave}
              onStartBuy={() => setMode("purchase")}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ) : (
            <EventPurchaseForm event={event} onBack={() => setMode("details")} onSubmit={onBuy} />
          )}
        </div>
      </div>
    </div>
  );
}