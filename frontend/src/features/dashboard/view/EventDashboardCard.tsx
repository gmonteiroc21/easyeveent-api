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
          <stop offset="50%" stop-color="#2a5cff" />
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

export function EventDashboardCard({ event }: EventDashboardCardProps) {
  const bannerSrc = event.banner?.trim() || buildPlaceholderBanner(event.title);

  return (
    <article className="eventCard">
      <div className="eventCardMedia">
        <img src={bannerSrc} alt={`Banner do evento ${event.title}`} loading="lazy" />
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
          <Link className="btn" to={`/eventos?eventId=${event.id}&intent=buy`}>
            Comprar ingresso
          </Link>
          <Link className="btn primary" to={`/eventos?eventId=${event.id}`}>
            Detalhes do evento
          </Link>
        </div>
      </div>
    </article>
  );
}
