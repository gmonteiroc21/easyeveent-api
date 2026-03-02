import { Link } from "react-router-dom";

import type { DashboardEvent } from "../model/dashboard.types";
import { EventStatusBadge } from "./EventStatusBadge";

type EventDashboardCardProps = {
  event: DashboardEvent;
};

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

export function EventDashboardCard({ event }: EventDashboardCardProps) {
  const hasBanner = Boolean(event.banner);

  return (
    <article className="eventCard">
      <div className="eventCardMedia">
        {hasBanner ? (
          <img src={event.banner ?? ""} alt={`Banner do evento ${event.title}`} loading="lazy" />
        ) : (
          <div className="eventCardBannerFallback" aria-hidden>
            <span>{event.title}</span>
          </div>
        )}
      </div>

      <div className="eventCardBody">
        <div className="eventCardHeader">
          <h3>{event.title}</h3>
          <EventStatusBadge status={event.status} />
        </div>

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
            <dt>Preço</dt>
            <dd>{formatPrice(event.price)}</dd>
          </div>
        </dl>

        <div className="eventCardActions">
          <Link className="btn" to="/eventos">
            Ver eventos
          </Link>
          <Link className="btn primary" to={`/eventos/${event.id}/checkin`}>
            Regras de check-in
          </Link>
        </div>
      </div>
    </article>
  );
}
