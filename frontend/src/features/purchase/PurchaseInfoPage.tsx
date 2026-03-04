import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { ApiError } from "../../api/errors";
import { dashboardApi } from "../../api/dashboardApi";
import { eventsApi, type PurchaseResponse } from "../../api/events";
import type { CheckinRuleEntity } from "../../api/checkinRules";
import { evaluateRules } from "../checkin/model/evaluateRules";

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
type PurchaseFormValues = { payment: "pix" | "card" | "boleto"; ticket: "full" | "half"; document: string };
const emptyEvaluation = {
  allowed: true,
  activeRulesCount: 0,
  requiredRulesCount: 0,
  errors: [],
  warnings: [],
  issues: [],
  requiredWindowIntersection: null,
} as const;

function getRequiredDocumentRule(rules: CheckinRuleEntity[] | undefined): { requiresDocument: boolean; documentLabel: string } {
  const activeRules = (rules ?? []).filter((rule) => rule.is_active).sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  const documentRule = activeRules.find((rule) => rule.rule_type === "document_check");
  const rawLabel = documentRule?.config?.required_document;
  const label = typeof rawLabel === "string" ? rawLabel.trim() : "";
  if (!label) return { requiresDocument: false, documentLabel: "" };
  return { requiresDocument: true, documentLabel: label };
}

function getApiErrorDetails(err: ApiError): string[] {
  const payload = err.payload;
  if (!payload || typeof payload !== "object") return [];
  const details = (payload as Record<string, unknown>).details;
  if (!details || typeof details !== "object") return [];
  const base = (details as Record<string, unknown>).base;
  if (!Array.isArray(base)) return [];
  return base.filter((item): item is string => typeof item === "string" && item.trim() !== "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPurchaseResponse(value: unknown): value is PurchaseResponse {
  if (!isRecord(value)) return false;
  if (!isRecord(value.membership) || !isRecord(value.purchase)) return false;
  return (
    typeof value.membership.id === "number" &&
    typeof value.membership.user_id === "number" &&
    typeof value.membership.event_id === "number"
  );
}

export function PurchaseInfoPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [flash, setFlash] = useState<Flash>(null);
  const [formValues, setFormValues] = useState<PurchaseFormValues>({ payment: "pix", ticket: "full", document: "" });
  const [documentError, setDocumentError] = useState<string | null>(null);

  const numericEventId = Number(eventId ?? "");
  const paymentMethod = searchParams.get("payment") ?? "";
  const ticketType = searchParams.get("ticket") ?? "";
  const mode = searchParams.get("mode") ?? "";
  const purchaseResult = isPurchaseResponse(location.state) ? location.state : null;
  const qrCode = purchaseResult?.purchase?.qr_code ?? null;
  const emailConfirmation = purchaseResult?.purchase?.email_confirmation ?? null;
  const qrImageUrl = qrCode?.token
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrCode.token)}`
    : null;

  const eventQuery = useQuery({
    queryKey: ["dashboard-event", numericEventId, "purchase"],
    queryFn: () => dashboardApi.getShowcaseEvent(numericEventId),
    enabled: Number.isFinite(numericEventId) && numericEventId > 0,
  });

  const purchaseMut = useMutation({
    mutationFn: async (values: PurchaseFormValues) => {
      return eventsApi.purchase(numericEventId, {
        ticket_type: values.ticket ?? "full",
        payment_method: values.payment,
        document: values.document?.trim() || undefined,
      });
    },
    onSuccess: (data, values: PurchaseFormValues) => {
      const params = new URLSearchParams();
      params.set("payment", values.payment);
      if (values.ticket) params.set("ticket", values.ticket);
      navigate(`/events/${numericEventId}/purchase?${params.toString()}`, { replace: true, state: data });
      setFlash({ type: "success", message: "Compra confirmada com sucesso." });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 403) {
        setFlash({ type: "error", message: "Você não pode comprar ingresso para um evento seu." });
        return;
      }
      if (error instanceof ApiError && error.status === 422) {
        const baseErrors = getApiErrorDetails(error);
        const capacityError = baseErrors.find((message) => message.toLowerCase().includes("limite de participantes"));
        setFlash({
          type: "error",
          message: capacityError || baseErrors[0] || "Não foi possível concluir a compra (422).",
        });
        return;
      }
      setFlash({ type: "error", message: "Erro ao confirmar compra." });
    },
  });

  const cancelMut = useMutation({
    mutationFn: async () => {
      await eventsApi.cancelPurchase(numericEventId);
    },
    onSuccess: async () => {
      await eventQuery.refetch();
      setFlash({ type: "success", message: "Inscrição cancelada com sucesso." });
      navigate("/dashboard", { replace: true });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 403) {
        setFlash({ type: "error", message: "Apenas participantes podem cancelar a inscrição." });
        return;
      }
      if (error instanceof ApiError && error.status === 422) {
        const baseErrors = getApiErrorDetails(error);
        setFlash({ type: "error", message: baseErrors[0] || "Não foi possível cancelar a inscrição (422)." });
        return;
      }
      setFlash({ type: "error", message: "Erro ao cancelar inscrição." });
    },
  });

  const paymentLabel = useMemo(() => {
    const fromPurchase = purchaseResult?.purchase?.payment_method;
    if (typeof fromPurchase === "string" && fromPurchase.trim() !== "") {
      return paymentMethodLabel[fromPurchase] ?? fromPurchase;
    }
    if (!paymentMethod) return "Não informado";
    return paymentMethodLabel[paymentMethod] ?? paymentMethod;
  }, [paymentMethod, purchaseResult]);

  const ticketLabel = useMemo(() => {
    const fromPurchase = purchaseResult?.purchase?.ticket_type;
    if (typeof fromPurchase === "string" && fromPurchase.trim() !== "") {
      return ticketTypeLabel[fromPurchase] ?? fromPurchase;
    }
    if (!ticketType) return "Não informado";
    return ticketTypeLabel[ticketType] ?? ticketType;
  }, [ticketType, purchaseResult]);

  const eventData = eventQuery.data;
  const alreadyJoined = Boolean(eventData?.joined_by_me);
  const shouldShowForm = Boolean(eventData) && !alreadyJoined && (mode === "form" || !paymentMethod);
  const hasPaidTicket = (eventData?.price ?? 0) > 0;
  const documentRequirement = getRequiredDocumentRule(eventData?.checkin_rules);
  const currentParticipantsCount =
    typeof eventData?.participants_live_count === "number" ? eventData.participants_live_count : undefined;
  const ruleEvaluation = eventData
    ? evaluateRules(eventData, {
        currentParticipantsCount,
        selectedTicketType: hasPaidTicket ? formValues.ticket : undefined,
        providedDocument: documentRequirement.requiresDocument ? formValues.document : undefined,
      })
    : emptyEvaluation;
  const activeRulesCount = ruleEvaluation.activeRulesCount;
  const requiredRulesCount = ruleEvaluation.requiredRulesCount;
  const capacityBlocked = ruleEvaluation.issues.some(
    (issue) => issue.level === "error" && issue.ruleType === "capacity_limit"
  );
  const missingDocument =
    documentRequirement.requiresDocument && formValues.document.trim() === "";
  const blockedByRules = !ruleEvaluation.allowed;
  const showCapacitySnackbar = shouldShowForm && capacityBlocked && !flash;

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
      {showCapacitySnackbar && (
        <div className="flash error">Limite de participantes atingido para este evento.</div>
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
          {ruleEvaluation.errors.length > 0 && (
            <div className="alert">
              <strong>Compra bloqueada por regras:</strong>
              <ul className="checkinRulesErrors">
                {ruleEvaluation.errors.map((message, index) => (
                  <li key={`purchase-rule-error-${index}`}>{message}</li>
                ))}
              </ul>
            </div>
          )}
          {ruleEvaluation.warnings.length > 0 && (
            <div className="alert">
              <strong>Avisos das regras:</strong>
              <ul className="checkinRulesErrors">
                {ruleEvaluation.warnings.map((message, index) => (
                  <li key={`purchase-rule-warning-${index}`}>{message}</li>
                ))}
              </ul>
            </div>
          )}
          <PurchaseForm
            hasPaidTicket={hasPaidTicket}
            busy={purchaseMut.isPending}
            values={formValues}
            onValuesChange={(next) => {
              setFormValues(next);
              if (documentError && next.document.trim() !== "") setDocumentError(null);
            }}
            blocked={blockedByRules || missingDocument}
            requiresDocument={documentRequirement.requiresDocument}
            documentLabel={documentRequirement.documentLabel}
            documentError={documentError}
            onCancel={() => navigate(-1)}
            onSubmit={(values) => {
              const evaluation = evaluateRules(event, {
                currentParticipantsCount,
                selectedTicketType: hasPaidTicket ? values.ticket : undefined,
                providedDocument: documentRequirement.requiresDocument ? values.document : undefined,
              });
              if (documentRequirement.requiresDocument && values.document.trim() === "") {
                setDocumentError(`Informe seu ${documentRequirement.documentLabel}.`);
                setFlash({
                  type: "error",
                  message: `Documento obrigatório não informado (exigido: ${documentRequirement.documentLabel}).`,
                });
                return;
              }
              if (!evaluation.allowed) {
                setFlash({
                  type: "error",
                  message: evaluation.errors[0] || "Compra bloqueada pelas regras do evento.",
                });
                return;
              }
              setFlash(null);
              setDocumentError(null);
              purchaseMut.mutate(values);
            }}
          />
        </>
      ) : (
        <>
          <p className="muted">
            {alreadyJoined ? "Você já participa deste evento. Compra confirmada." : "Informações da compra"}
          </p>

          <div className={`checkinInfoCard ${qrCode ? "withQr" : ""}`}>
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
              {qrCode && (
                <div>
                  <dt>Expira em</dt>
                  <dd>{new Date(qrCode.expires_at).toLocaleString()}</dd>
                </div>
              )}
              {emailConfirmation && (
                <div>
                  <dt>Confirmação por email</dt>
                  <dd>{emailConfirmation.simulated ? "Simulada" : "Enviada"}</dd>
                </div>
              )}
            </dl>
            {qrCode && (
              <aside className="purchaseQrPanel">
                <p className="purchaseQrTitle">QR Code de Check-in</p>
                {qrImageUrl ? (
                  <img className="purchaseQrImage" src={qrImageUrl} alt={`QR Code do evento ${event.title}`} />
                ) : (
                  <div className="purchaseQrFallback">QR indisponível</div>
                )}
                <p className="purchaseQrMeta">{qrCode.single_use ? "Uso único" : "Múltiplos usos"}</p>
              </aside>
            )}
          </div>

          <div className="modalFooter">
            {!alreadyJoined && (
              <button
                type="button"
                className="btn"
                onClick={() => navigate(`/events/${event.id}/purchase?mode=form`, { replace: true })}
              >
                Alterar compra
              </button>
            )}
            {alreadyJoined && event.membership_role_by_me === "participant" && (
              <button
                type="button"
                className="btn danger"
                disabled={cancelMut.isPending}
                onClick={() => {
                  const confirmed = window.confirm("Tem certeza que deseja cancelar sua inscrição neste evento?");
                  if (!confirmed) return;
                  setFlash(null);
                  void cancelMut.mutateAsync();
                }}
              >
                {cancelMut.isPending ? "Cancelando..." : "Cancelar inscrição"}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}

type PurchaseFormProps = {
  hasPaidTicket: boolean;
  busy: boolean;
  blocked: boolean;
  requiresDocument: boolean;
  documentLabel: string;
  documentError: string | null;
  values: PurchaseFormValues;
  onValuesChange: (values: PurchaseFormValues) => void;
  onCancel: () => void;
  onSubmit: (values: PurchaseFormValues) => void;
};

function PurchaseForm({
  hasPaidTicket,
  busy,
  blocked,
  requiresDocument,
  documentLabel,
  documentError,
  values,
  onValuesChange,
  onCancel,
  onSubmit,
}: PurchaseFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!values.payment) return;
    if (hasPaidTicket) {
      if (!values.ticket) return;
      onSubmit({ payment: values.payment, ticket: values.ticket, document: values.document });
      return;
    }
    onSubmit({ payment: values.payment, ticket: "full", document: values.document });
  }

  return (
    <form className="card form" onSubmit={handleSubmit}>
      {hasPaidTicket ? (
        <label>
          Tipo de ingresso
          <select
            name="ticket"
            value={values.ticket}
            onChange={(event) =>
              onValuesChange({
                ...values,
                ticket: event.target.value as "full" | "half",
              })
            }
          >
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
          name="payment"
          value={values.payment}
          onChange={(event) =>
            onValuesChange({
              ...values,
              payment: event.target.value as "pix" | "card" | "boleto",
            })
          }
        >
          <option value="pix">PIX</option>
          <option value="card">Cartão</option>
          <option value="boleto">Boleto</option>
        </select>
      </label>

      {requiresDocument && (
        <label>
          {`Informe seu ${documentLabel}`}
          <input
            name="document"
            value={values.document}
            onChange={(event) =>
              onValuesChange({
                ...values,
                document: event.target.value,
              })
            }
            placeholder={`Ex: ${documentLabel}`}
          />
          {documentError && <span className="error">{documentError}</span>}
        </label>
      )}

      <footer className="modalFooter">
        <button type="button" className="btn" onClick={onCancel} disabled={busy}>
          Voltar
        </button>
        <button type="submit" className="btn primary" disabled={busy || blocked}>
          {busy ? "Confirmando..." : blocked ? "Compra bloqueada" : "Confirmar compra"}
        </button>
      </footer>
    </form>
  );
}
