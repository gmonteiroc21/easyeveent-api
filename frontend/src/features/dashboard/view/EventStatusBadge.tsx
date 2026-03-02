type EventStatusBadgeProps = {
  status: string | null | undefined;
};

const labels: Record<string, string> = {
  draft: "Rascunho",
  published: "Publicado",
  cancelled: "Cancelado",
  finished: "Encerrado",
};

export function EventStatusBadge({ status }: EventStatusBadgeProps) {
  const key = (status ?? "").toLowerCase();
  const text = labels[key] ?? (status || "Sem status");

  return <span className={`eventStatus ${key || "unknown"}`}>{text}</span>;
}
