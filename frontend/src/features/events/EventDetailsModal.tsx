import { useState } from "react";
import type { EventEntity } from "../../api/events";

type EventDetailsModalProps = {
  event: EventEntity;
  onClose: () => void;
  onSave: () => void;
  onBuy: () => void;
  onEdit: () => void;
  onDelete: () => void;
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

function VerticalDotsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <circle cx="12" cy="5" r="1.8" fill="currentColor" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
      <circle cx="12" cy="19" r="1.8" fill="currentColor" />
    </svg>
  );
}

type EventDetailsOverviewProps = {
  event: EventEntity;
  onSave: () => void;
  onBuy: () => void;
};

function EventDetailsOverview({ event, onSave, onBuy }: EventDetailsOverviewProps) {
  const isOwner = Boolean(event.owned_by_me);

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

        {!isOwner && (
          <div className="eventDetailsActions">
            <button type="button" className="btn" onClick={onSave}>
              Salvar
            </button>
            <button type="button" className="btn primary" onClick={onBuy}>
              Comprar
            </button>
          </div>
        )}
      </aside>
    </>
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isOwner = Boolean(event.owned_by_me);

  return (
    <div className="modalBackdrop" onMouseDown={onClose}>
      <div className="eventDetailsModal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="eventDetailsBannerWrap">
          <img className="eventDetailsBanner" src={bannerSrc} alt={`Banner do evento ${event.title}`} />

          <div className="eventDetailsTopActions">
            {isOwner && (
              <div className="eventSettingsContainer">
                <button
                  type="button"
                  className="eventSettingsTrigger"
                  onClick={() => setSettingsOpen((prev) => !prev)}
                  aria-label="Abrir configurações do evento"
                  title="Configurações"
                >
                  <VerticalDotsIcon />
                </button>

                {settingsOpen && (
                  <div className="eventSettingsMenu">
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        setSettingsOpen(false);
                        onEdit();
                      }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn danger"
                      onClick={() => {
                        setSettingsOpen(false);
                        onDelete();
                      }}
                    >
                      Remover
                    </button>
                  </div>
                )}
              </div>
            )}

            <button className="eventDetailsClose" type="button" onClick={onClose} aria-label="Fechar modal">
              <XIcon />
            </button>
          </div>
        </div>

        <div className="eventDetailsContent">
          <EventDetailsOverview event={event} onSave={onSave} onBuy={onBuy} />
        </div>
      </div>
    </div>
  );
}
