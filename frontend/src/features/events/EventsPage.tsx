import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { DateRangePicker } from "../../components/DateRangePicker";
import { ApiError } from "../../api/errors";
import { eventsApi } from "../../api/events.ts";
import type { EventEntity, EventInput } from "../../api/events.ts";
import { EventDetailsModal } from "./EventDetailsModal";

type Flash = { type: "success" | "error"; message: string } | null;


const statusOptions = ["draft", "published", "cancelled", "finished"] as const;

const formSchema = z.object({
  title: z.string().trim().min(1, "Informe o título do evento"),
  description: z.string().trim().optional(),
  starts_at: z.string().min(1, "Informe a data/hora de início"),
  location: z.string().trim().optional(),
  price: z.union([z.string().trim(), z.number()]).optional(), // ✅ sem transform
  banner: z.string().trim().optional(),
  status: z.string().trim().optional(),
});

type FormData = z.infer<typeof formSchema>;

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <path
        d="M19.14 12.94a7.8 7.8 0 0 0 .05-.94 7.8 7.8 0 0 0-.05-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.38 7.38 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54a7.38 7.38 0 0 0-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.7 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7.8 7.8 0 0 0-.05.94 7.8 7.8 0 0 0 .05.94L2.82 14.52a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.39 1.05.72 1.63.94l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54c.58-.22 1.13-.55 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function toDateTimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function fromDateTimeLocal(local: string) {
  // converte "YYYY-MM-DDTHH:mm" -> ISO
  const d = new Date(local);
  return d.toISOString();
}

function displayName(e: EventEntity) {
  return e.title;
}

export function EventsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [flash, setFlash] = useState<Flash>(null);

  // filtros
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" });
  const [location, setLocation] = useState<string>("");

  // modal/form
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EventEntity | null>(null);
  const [detailsEvent, setDetailsEvent] = useState<EventEntity | null>(null);

  const eventsQuery = useQuery({
    queryKey: ["events"],
    queryFn: () => eventsApi.list(),
  });

  const createMut = useMutation({
    mutationFn: (input: EventInput) => eventsApi.create(input),
    onSuccess: async () => {
      setFlash({ type: "success", message: "Evento criado com sucesso." });
      setModalOpen(false);
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (err) => handleApiError(err),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, input }: { id: number; input: EventInput }) =>
      eventsApi.update(id, input),
    onSuccess: async () => {
      setFlash({ type: "success", message: "Evento atualizado com sucesso." });
      setModalOpen(false);
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (err) => handleApiError(err),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => eventsApi.remove(id),
    onSuccess: async () => {
      setFlash({ type: "success", message: "Evento removido." });
      await qc.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (err) => handleApiError(err),
  });

  function handleApiError(err: unknown) {
    if (err instanceof ApiError) {
      if (err.status === 401) setFlash({ type: "error", message: "Sessão expirada. Faça login novamente." });
      else if (err.status === 403) setFlash({ type: "error", message: "Você não tem permissão para esta ação." });
      else if (err.status === 422) setFlash({ type: "error", message: "Dados inválidos (422). Verifique o formulário." });
      else setFlash({ type: "error", message: `Erro na API (HTTP ${err.status}).` });
      return;
    }
    setFlash({ type: "error", message: "Erro inesperado." });
  }

  const filtered = useMemo(() => {
    const data = eventsQuery.data ?? [];
    const needle = q.trim().toLowerCase();
    const locNeedle = location.trim().toLowerCase();

    const from = dateRange.start ? new Date(`${dateRange.start}T00:00:00`).getTime() : null;
    const to = dateRange.end ? new Date(`${dateRange.end}T23:59:59`).getTime() : null;

    return data.filter((e) => {
      const title = displayName(e).toLowerCase();
      const loc = (e.location ?? "").toLowerCase();
      const st = (e.status ?? "").toLowerCase();

      const t = new Date(e.starts_at).getTime();

      if (needle && !(title.includes(needle) || loc.includes(needle))) return false;
      if (status && st !== status.toLowerCase()) return false;
      if (locNeedle && !loc.includes(locNeedle)) return false;
      if (from !== null && t < from) return false;
      if (to !== null && t > to) return false;

      return true;
    });
  }, [eventsQuery.data, q, status, dateRange.start, dateRange.end, location]);

  const searchEventId = Number(searchParams.get("eventId") ?? "");
  const editEventId = Number(searchParams.get("editEventId") ?? "");
  const detailsEventFromQuery = useMemo(() => {
    if (!Number.isFinite(searchEventId) || searchEventId <= 0) return null;
    return (eventsQuery.data ?? []).find((item) => item.id === searchEventId) ?? null;
  }, [eventsQuery.data, searchEventId]);
  const activeDetailsEvent = detailsEvent ?? detailsEventFromQuery;
  const editingFromQuery = useMemo(() => {
    if (!Number.isFinite(editEventId) || editEventId <= 0) return null;
    return (eventsQuery.data ?? []).find((item) => item.id === editEventId) ?? null;
  }, [eventsQuery.data, editEventId]);
  const activeEditing = editing ?? editingFromQuery;
  const shouldShowEventModal = modalOpen || Boolean(activeEditing);

  function clearEditQueryParam() {
    if (!searchParams.has("editEventId")) return;
    const next = new URLSearchParams(searchParams);
    next.delete("editEventId");
    setSearchParams(next, { replace: true });
  }

  function openCreate() {
    setFlash(null);
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(e: EventEntity) {
    setFlash(null);
    setEditing(e);
    setModalOpen(true);
  }

  async function confirmDelete(id: number) {
    setFlash(null);
    const ok = window.confirm("Tem certeza que deseja remover este evento?");
    if (!ok) return;
    deleteMut.mutate(id);
  }

  function openDetails(event: EventEntity) {
    setDetailsEvent(event);
    const next = new URLSearchParams(searchParams);
    next.set("eventId", String(event.id));
    setSearchParams(next, { replace: true });
  }

  function closeDetails() {
    setDetailsEvent(null);
    const next = new URLSearchParams(searchParams);
    next.delete("eventId");
    next.delete("intent");
    setSearchParams(next, { replace: true });
  }

  function handleBuy(event: EventEntity) {
    if (event.owned_by_me) return;
    navigate(`/eventos/${event.id}/compra?mode=form`);
  }

  return (
    <section>
      <header className="pageHeader">
        <div>
          <h2>Eventos</h2>
          <p className="muted">CRUD + filtros</p>
        </div>
        <button className="btn primary" onClick={openCreate}>
          + Novo evento
        </button>
      </header>

      {flash && (
        <div className={`flash ${flash.type}`}>
          {flash.message}
          <button className="linkBtn" onClick={() => setFlash(null)}>fechar</button>
        </div>
      )}

      <div className="dashboardSearch">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Pesquisar por título..."
        />
      </div>

      <div className="toolbar eventsToolbar">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Status (todos)</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <input
          className="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Filtrar por local..."
        />

        <DateRangePicker value={dateRange} onChange={setDateRange} placeholder="Período do evento" />
      </div>

      {eventsQuery.isLoading && <p>Carregando eventos...</p>}

      {eventsQuery.isError && (
        <div className="alert">
          Erro ao carregar eventos.{" "}
          <button className="linkBtn" onClick={() => eventsQuery.refetch()}>tentar novamente</button>
        </div>
      )}

      {!eventsQuery.isLoading && !eventsQuery.isError && filtered.length === 0 && (
        <div className="empty">
          <p>Nenhum evento encontrado com os filtros atuais.</p>
        </div>
      )}

      {!eventsQuery.isLoading && !eventsQuery.isError && filtered.length > 0 && (
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Início</th>
                <th>Local</th>
                <th>Status</th>
                <th>Preço</th>
                <th style={{ width: 220 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td>{displayName(e)}</td>
                  <td>{new Date(e.starts_at).toLocaleString()}</td>
                  <td>{e.location ?? "-"}</td>
                  <td>{e.status ?? "-"}</td>
                  <td>{e.price ?? "-"}</td>
                  <td className="actions">
                    <button className="btn" type="button" onClick={() => openDetails(e)}>
                      Detalhes do Evento
                    </button>
                    <button
                      className="btn"
                      type="button"
                      onClick={() => navigate(`/eventos/${e.id}/checkin`)}
                      aria-label="Opções avançadas"
                      title="Opções avançadas"
                    >
                      <GearIcon />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {shouldShowEventModal && (
        <EventModal
          editing={activeEditing}
          busy={createMut.isPending || updateMut.isPending}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
            clearEditQueryParam();
          }}
          onSubmit={(input) => {
            setFlash(null);
            const editingTarget = activeEditing;
            if (editingTarget) {
              clearEditQueryParam();
              updateMut.mutate({ id: editingTarget.id, input });
            }
            else createMut.mutate(input);
          }}
        />
      )}

      {activeDetailsEvent && (
        <EventDetailsModal
          key={activeDetailsEvent.id}
          event={activeDetailsEvent}
          onClose={closeDetails}
          onSave={() => setFlash({ type: "success", message: "Evento salvo nos favoritos." })}
          onBuy={() => handleBuy(activeDetailsEvent)}
          onEdit={() => {
            closeDetails();
            openEdit(activeDetailsEvent);
          }}
          onDelete={() => {
            closeDetails();
            void confirmDelete(activeDetailsEvent.id);
          }}
        />
      )}
    </section>
  );
}

function EventModal({
  editing,
  busy,
  onClose,
  onSubmit,
}: {
  editing: EventEntity | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (input: EventInput) => void;
}) {
  const {
  register,
  handleSubmit,
  formState: { errors },
  setError,
} = useForm<FormData>({
  resolver: zodResolver(formSchema),
  defaultValues: editing
    ? {
        title: editing.title,
        description: editing.description ?? "",
        starts_at: toDateTimeLocal(editing.starts_at),
        location: editing.location ?? "",
        price: editing.price != null ? String(editing.price) : "",
        banner: editing.banner ?? "",
        status: editing.status ?? "",
      }
    : {
        title: "",
        description: "",
        starts_at: "",
        location: "",
        price: "",
        banner: "",
        status: "published",
      },
});

function submit(data: FormData) {
  const title = (data.title ?? "").trim();
  if (!title) {
    setError("title", { type: "manual", message: "Informe o título do evento" });
    return;
  }

  // ✅ parse do price (do form -> number|null)
  const raw = data.price;
  const priceStr = typeof raw === "number" ? String(raw) : String(raw ?? "").trim();

  let price: number | null = null;
  if (priceStr !== "") {
    const parsed = Number(priceStr.replace(",", "."));
    if (!Number.isFinite(parsed)) {
      setError("price", { type: "manual", message: "Preço inválido" });
      return;
    }
    price = parsed;
  }

  const input: EventInput = {
    title,
    description: data.description?.trim() ? data.description.trim() : null,
    starts_at: fromDateTimeLocal(data.starts_at),
    location: data.location?.trim() ? data.location.trim() : null,
    price,
    banner: data.banner?.trim() ? data.banner.trim() : null,
    status: data.status?.trim() ? data.status.trim() : null,
  };

  onSubmit(input);
}
  return (
    <div className="modalBackdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modalHeader">
          <h3>{editing ? "Editar evento" : "Novo evento"}</h3>
          <button className="linkBtn" onClick={onClose}>fechar</button>
        </header>

        <form className="form" onSubmit={handleSubmit(submit)}>
          <label>
            Título
            <input {...register("title")} placeholder="Ex: Workshop de IA" />
            {errors.title && <span className="error">{errors.title.message}</span>}
          </label>

          <label>
            Descrição
            <textarea {...register("description")} placeholder="Descreva o evento..." rows={4} />
            {errors.description && <span className="error">{errors.description.message}</span>}
          </label>

          <label>
            Início (data/hora)
            <input type="datetime-local" {...register("starts_at")} />
            {errors.starts_at && <span className="error">{errors.starts_at.message}</span>}
          </label>

          <div className="grid3">
            <label>
              Local
              <input {...register("location")} placeholder="Ex: Recife" />
            </label>

            <label>
              Status
              <select {...register("status")}>
                <option value="">Selecione</option>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Preço
              <input {...register("price")} placeholder="0" />
            </label>
          </div>

          <label>
            Banner (URL)
            <input {...register("banner")} placeholder="https://..." />
          </label>

          <footer className="modalFooter">
            <button type="button" className="btn" onClick={onClose} disabled={busy}>
              Cancelar
            </button>
            <button type="submit" className="btn primary" disabled={busy}>
              {busy ? "Salvando..." : "Salvar"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
