import { useMemo, useReducer } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

import { ApiError, extractApiBaseErrorMessage } from "../../api/errors";
import { checkinRulesApi, type CheckinRuleEntity, type CheckinRuleInput } from "../../api/checkinRules";
import { eventsApi } from "../../api/events";

const RULE_TYPE_OPTIONS = [
  "time_window",
  "capacity_limit",
  "live_count",
  "visibility_toggle",
  "half_price_policy",
  "qr_code",
  "printed_list",
  "email_confirmation",
  "document_check",
] as const;

type RuleType = (typeof RULE_TYPE_OPTIONS)[number];
type Flash = { type: "success" | "error"; message: string } | null;
const FIXED_STANDARD_RULE_TYPES: RuleType[] = ["qr_code", "printed_list", "email_confirmation"];
const ADVANCED_RULE_TYPE_OPTIONS: RuleType[] = ["capacity_limit", "live_count", "half_price_policy", "document_check"];
const FIXED_RULE_TYPES: RuleType[] = [...FIXED_STANDARD_RULE_TYPES];
const NEW_RULE_TYPE_OPTIONS = ADVANCED_RULE_TYPE_OPTIONS;

const RULE_TYPE_LABEL: Record<RuleType, string> = {
  time_window: "Janela de tempo",
  capacity_limit: "Limite de usuários",
  live_count: "Contagem ao vivo",
  visibility_toggle: "Visibilidade",
  half_price_policy: "Meia entrada",
  qr_code: "QR Code",
  printed_list: "Lista impressa",
  email_confirmation: "Confirmação por email",
  document_check: "Validação de documento",
};

type ConfigFieldType = "number" | "text" | "select" | "checkbox";

type ConfigField = {
  key: string;
  label: string;
  input: ConfigFieldType;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
};

const RULE_CONFIG_SCHEMA: Record<RuleType, ConfigField[]> = {
  time_window: [],
  capacity_limit: [
    { key: "max_users", label: "Limite de usuários", input: "number", required: true, min: 1, step: 1 },
  ],
  live_count: [
    { key: "refresh_seconds", label: "Atualização (segundos)", input: "number", required: true, min: 1, step: 1 },
  ],
  visibility_toggle: [
    { key: "show_live_count", label: "Exibir contagem ao vivo", input: "checkbox" },
    { key: "show_attendees", label: "Exibir participantes", input: "checkbox" },
  ],
  half_price_policy: [
    { key: "ratio", label: "Percentual da meia (0-1)", input: "number", required: true, min: 0.01, max: 1, step: 0.01 },
    { key: "quota", label: "Cota de meia", input: "number", min: 0, step: 1 },
  ],
  qr_code: [
    { key: "expires_in_minutes", label: "Expiração (min)", input: "number", min: 1, step: 1 },
    { key: "single_use", label: "Uso único", input: "checkbox" },
  ],
  printed_list: [
    {
      key: "format",
      label: "Formato",
      input: "select",
      required: true,
      options: [
        { value: "csv", label: "CSV" },
        { value: "pdf", label: "PDF" },
      ],
    },
  ],
  email_confirmation: [
    {
      key: "send_on",
      label: "Enviar no momento",
      input: "select",
      required: true,
      options: [
        { value: "purchase", label: "Compra" },
        { value: "checkin", label: "Check-in" },
      ],
    },
    { key: "subject", label: "Assunto do email", input: "text", placeholder: "Confirmação do evento" },
  ],
  document_check: [{ key: "required_document", label: "Documento exigido", input: "text", required: true }],
};

type DraftRule = Omit<CheckinRuleEntity, "event_id"> & { collapsed: boolean };

type RulesState = {
  serverRules: DraftRule[];
  draftRules: DraftRule[];
  dirty: boolean;
};

type RulesAction =
  | { type: "LOAD_FROM_SERVER"; payload: DraftRule[] }
  | { type: "RESET" }
  | { type: "ADD_RULE" }
  | { type: "REMOVE_RULE"; id: number }
  | {
      type: "UPDATE_RULE";
      id: number;
      field: "name" | "rule_type" | "window_before_minutes" | "window_after_minutes" | "sort_order" | "is_required";
      value: string | number | boolean;
    }
  | { type: "UPDATE_CONFIG_VALUE"; id: number; key: string; value: string | boolean }
  | { type: "TOGGLE_ACTIVE"; id: number }
  | { type: "TOGGLE_COLLAPSE"; id: number }
  | { type: "REORDER"; id: number; direction: "up" | "down" };

const initialState: RulesState = {
  serverRules: [],
  draftRules: [],
  dirty: false,
};

function cloneRules(rules: DraftRule[]) {
  return rules.map((rule) => ({ ...rule, config: { ...(rule.config || {}) }, collapsed: Boolean(rule.collapsed) }));
}

function normalizeSortOrder(rules: DraftRule[]) {
  return rules.map((rule, index) => ({ ...rule, sort_order: index + 1 }));
}

function defaultValueForField(ruleType: RuleType, field: ConfigField): string | boolean {
  if (ruleType === "qr_code" && field.key === "expires_in_minutes") return "60";
  if (field.input === "checkbox") return false;
  if (field.input === "select") return field.options?.[0]?.value ?? "";
  return "";
}

function ensureRuleConfig(ruleType: RuleType, current?: Record<string, unknown>) {
  const schema = RULE_CONFIG_SCHEMA[ruleType];
  const next: Record<string, unknown> = {};

  schema.forEach((field) => {
    if (current && Object.prototype.hasOwnProperty.call(current, field.key)) {
      next[field.key] = current[field.key];
    } else {
      next[field.key] = defaultValueForField(ruleType, field);
    }
  });

  return next;
}

function normalizeRule(rule: DraftRule): DraftRule {
  const type = RULE_TYPE_OPTIONS.includes(rule.rule_type as RuleType) ? (rule.rule_type as RuleType) : "capacity_limit";
  return {
    ...rule,
    rule_type: type,
    name: rule.name?.trim() || RULE_TYPE_LABEL[type],
    config: ensureRuleConfig(type, rule.config),
    collapsed: Boolean(rule.collapsed),
  };
}

function ensureFixedRules(rules: DraftRule[]) {
  const next = [...rules];
  let nextId = Math.min(0, ...next.map((rule) => rule.id)) - 1;

  FIXED_STANDARD_RULE_TYPES.forEach((ruleType) => {
    const exists = next.some((rule) => rule.rule_type === ruleType);
    if (exists) return;

    next.push(
      normalizeRule({
        id: nextId,
        rule_type: ruleType,
        name: RULE_TYPE_LABEL[ruleType],
        window_before_minutes: 0,
        window_after_minutes: 0,
        is_required: false,
        is_active: false,
        sort_order: next.length + 1,
        config: ensureRuleConfig(ruleType),
        collapsed: false,
      })
    );
    nextId -= 1;
  });

  return normalizeSortOrder(next);
}

function rulesReducer(state: RulesState, action: RulesAction): RulesState {
  switch (action.type) {
    case "LOAD_FROM_SERVER": {
      const normalized = ensureFixedRules(action.payload.map(normalizeRule));
      return { serverRules: cloneRules(normalized), draftRules: cloneRules(normalized), dirty: false };
    }
    case "RESET":
      return { ...state, draftRules: cloneRules(state.serverRules), dirty: false };
    case "ADD_RULE": {
      if (NEW_RULE_TYPE_OPTIONS.length === 0) return state;
      const nextId = Math.min(0, ...state.draftRules.map((rule) => rule.id)) - 1;
      const type = NEW_RULE_TYPE_OPTIONS[0] as RuleType;
      const next = [
        ...state.draftRules,
        {
          id: nextId,
          rule_type: type,
          name: "",
          window_before_minutes: 0,
          window_after_minutes: 0,
          is_required: false,
          is_active: true,
          sort_order: state.draftRules.length + 1,
          config: ensureRuleConfig(type),
          collapsed: false,
        },
      ];
      return { ...state, draftRules: normalizeSortOrder(next), dirty: true };
    }
    case "REMOVE_RULE": {
      const target = state.draftRules.find((rule) => rule.id === action.id);
      if (target && FIXED_RULE_TYPES.includes(target.rule_type as RuleType)) {
        return state;
      }
      const next = state.draftRules.filter((rule) => rule.id !== action.id);
      return { ...state, draftRules: normalizeSortOrder(next), dirty: true };
    }
    case "UPDATE_RULE": {
      const next = state.draftRules.map((rule) => {
        if (rule.id !== action.id) return rule;
        if (action.field === "rule_type") {
          const ruleType = action.value as RuleType;
          return {
            ...rule,
            rule_type: ruleType,
            name: RULE_TYPE_LABEL[ruleType],
            config: ensureRuleConfig(ruleType, rule.config),
          };
        }
        return {
          ...rule,
          [action.field]: action.value,
        };
      });
      return { ...state, draftRules: normalizeSortOrder(next), dirty: true };
    }
    case "UPDATE_CONFIG_VALUE": {
      const next = state.draftRules.map((rule) => {
        if (rule.id !== action.id) return rule;
        return {
          ...rule,
          config: {
            ...(rule.config || {}),
            [action.key]: action.value,
          },
        };
      });
      return { ...state, draftRules: next, dirty: true };
    }
    case "TOGGLE_ACTIVE": {
      const next = state.draftRules.map((rule) =>
        rule.id === action.id ? { ...rule, is_active: !rule.is_active } : rule
      );
      return { ...state, draftRules: next, dirty: true };
    }
    case "TOGGLE_COLLAPSE": {
      const next = state.draftRules.map((rule) =>
        rule.id === action.id ? { ...rule, collapsed: !rule.collapsed } : rule
      );
      return { ...state, draftRules: next };
    }
    case "REORDER": {
      const index = state.draftRules.findIndex((rule) => rule.id === action.id);
      if (index < 0) return state;
      const target = action.direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= state.draftRules.length) return state;

      const next = [...state.draftRules];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return { ...state, draftRules: normalizeSortOrder(next), dirty: true };
    }
    default:
      return state;
  }
}

function parseRuleConfig(rule: DraftRule, index: number, errors: string[]) {
  const type = rule.rule_type as RuleType;
  const schema = RULE_CONFIG_SCHEMA[type] ?? [];
  const parsed: Record<string, unknown> = {};

  for (const field of schema) {
    const raw = rule.config?.[field.key];

    if (field.input === "checkbox") {
      parsed[field.key] = Boolean(raw);
      continue;
    }

    const value = String(raw ?? "").trim();

    if (field.required && value === "") {
      errors.push(`Regra ${index + 1}: ${field.label} é obrigatório.`);
      continue;
    }

    if (value === "") {
      parsed[field.key] = value;
      continue;
    }

    if (field.input === "number") {
      const asNumber = Number(value);
      if (!Number.isFinite(asNumber)) {
        errors.push(`Regra ${index + 1}: ${field.label} deve ser numérico.`);
        continue;
      }
      if (field.min != null && asNumber < field.min) {
        errors.push(`Regra ${index + 1}: ${field.label} deve ser >= ${field.min}.`);
      }
      if (field.max != null && asNumber > field.max) {
        errors.push(`Regra ${index + 1}: ${field.label} deve ser <= ${field.max}.`);
      }
      parsed[field.key] = asNumber;
      continue;
    }

    parsed[field.key] = value;
  }

  return parsed;
}

function buildValidationErrors(rules: DraftRule[]) {
  const errors: string[] = [];

  if (rules.length === 0) {
    errors.push("Adicione pelo menos uma regra.");
  }

  if (!rules.some((rule) => rule.is_active)) {
    errors.push("Pelo menos 1 regra ativa é obrigatória.");
  }

  rules.forEach((rule, index) => {
    if (!rule.rule_type || !RULE_TYPE_OPTIONS.includes(rule.rule_type as RuleType)) {
      errors.push(`Regra ${index + 1}: tipo de regra inválido.`);
    }
    if (rule.window_before_minutes < 0) errors.push(`Regra ${index + 1}: janela antes não pode ser negativa.`);
    if (rule.window_after_minutes < 0) errors.push(`Regra ${index + 1}: janela depois não pode ser negativa.`);
    parseRuleConfig(rule, index, errors);
  });

  const requiredActive = rules.filter((rule) => rule.is_active && rule.is_required);
  if (requiredActive.length > 1) {
    const intersectionStart = Math.max(...requiredActive.map((rule) => -rule.window_before_minutes));
    const intersectionEnd = Math.min(...requiredActive.map((rule) => rule.window_after_minutes));
    if (intersectionStart > intersectionEnd) {
      errors.push("Conflito: regras obrigatórias ativas não possuem interseção de janela válida.");
    }
  }

  return errors;
}

function toInput(rule: DraftRule, index: number, errors: string[]): CheckinRuleInput {
  const parsedConfig = parseRuleConfig(rule, index, errors);

  return {
    id: rule.id > 0 ? rule.id : undefined,
    rule_type: rule.rule_type,
    name: rule.name.trim() || RULE_TYPE_LABEL[rule.rule_type as RuleType],
    window_before_minutes: Number(rule.window_before_minutes),
    window_after_minutes: Number(rule.window_after_minutes),
    is_required: Boolean(rule.is_required),
    is_active: Boolean(rule.is_active),
    sort_order: Number(rule.sort_order),
    config: parsedConfig,
  };
}

async function saveRules(eventId: number, draftRules: DraftRule[]) {
  const serializationErrors: string[] = [];
  const payload = draftRules.map((rule, index) => toInput(rule, index, serializationErrors));
  if (serializationErrors.length > 0) {
    throw new Error(serializationErrors[0]);
  }
  await checkinRulesApi.sync(eventId, payload);
}

export function CheckinRulesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { eventId } = useParams();
  const numericEventId = Number(eventId ?? "");
  const [flash, setFlash] = useReducer((_: Flash, next: Flash) => next, null);

  const [state, dispatch] = useReducer(rulesReducer, initialState);

  const eventQuery = useQuery({
    queryKey: ["event", numericEventId, "checkin-rules"],
    queryFn: () => eventsApi.get(numericEventId),
    enabled: Number.isFinite(numericEventId) && numericEventId > 0,
  });

  const rulesQuery = useQuery({
    queryKey: ["checkin-rules", numericEventId],
    queryFn: async () => {
      const rules = await checkinRulesApi.list(numericEventId);
      const mapped: DraftRule[] = rules
        .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
        .map((rule) =>
          normalizeRule({
            id: rule.id,
            rule_type: rule.rule_type,
            name: rule.name,
            window_before_minutes: rule.window_before_minutes,
            window_after_minutes: rule.window_after_minutes,
            is_required: rule.is_required,
            is_active: rule.is_active,
            sort_order: rule.sort_order,
            config: rule.config,
            collapsed: true,
          })
        );
      dispatch({ type: "LOAD_FROM_SERVER", payload: mapped });
      return rules;
    },
    enabled: Number.isFinite(numericEventId) && numericEventId > 0,
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      await saveRules(numericEventId, state.draftRules);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["checkin-rules", numericEventId] });
      await rulesQuery.refetch();
      setFlash({ type: "success", message: "Regras salvas com sucesso." });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 403) {
        setFlash({ type: "error", message: "Sem permissão para salvar regras (403)." });
        return;
      }
      if (err instanceof ApiError && err.status === 422) {
        setFlash({
          type: "error",
          message: extractApiBaseErrorMessage(err.payload) || "Configuração inválida das regras (422).",
        });
        return;
      }
      if (err instanceof Error) {
        setFlash({ type: "error", message: err.message });
        return;
      }
      setFlash({ type: "error", message: "Erro ao salvar regras de check-in." });
    },
  });

  const canEdit = Boolean(eventQuery.data?.owned_by_me);
  const validationErrors = useMemo(() => buildValidationErrors(state.draftRules), [state.draftRules]);
  const canSave = canEdit && state.dirty && validationErrors.length === 0 && !saveMut.isPending;
  const rulesForbidden = rulesQuery.error instanceof ApiError && rulesQuery.error.status === 403;
  const saveForbidden = saveMut.error instanceof ApiError && saveMut.error.status === 403;
  const standardRules = state.draftRules.filter((rule) => FIXED_STANDARD_RULE_TYPES.includes(rule.rule_type as RuleType));
  const customRules = state.draftRules.filter((rule) => !FIXED_RULE_TYPES.includes(rule.rule_type as RuleType));

  function renderRuleItem(rule: DraftRule) {
    const fields = RULE_CONFIG_SCHEMA[rule.rule_type as RuleType] ?? [];
    const isFixedRule = FIXED_RULE_TYPES.includes(rule.rule_type as RuleType);

    return (
      <article key={rule.id} className="checkinRuleItem">
        <div className="checkinRuleTop">
          <div className="checkinRuleSummary">
            <span className="checkinRuleOrder">#{rule.sort_order}</span>
            <strong>{RULE_TYPE_LABEL[rule.rule_type as RuleType]}</strong>
            <span className="muted">{rule.rule_type}</span>
          </div>
          <button type="button" className="btn" onClick={() => dispatch({ type: "TOGGLE_COLLAPSE", id: rule.id })}>
            {rule.collapsed ? "Expandir" : "Recolher"}
          </button>
        </div>

        {!rule.collapsed && (
          <>
            <div className="checkinRuleMainFields">
              <label>
                Tipo
                <select
                  className="ruleTypeSelect"
                  value={rule.rule_type}
                  disabled={!canEdit || isFixedRule}
                  onChange={(event) =>
                    dispatch({
                      type: "UPDATE_RULE",
                      id: rule.id,
                      field: "rule_type",
                      value: event.target.value,
                    })
                  }
                >
                  {(isFixedRule
                    ? [rule.rule_type as RuleType]
                    : NEW_RULE_TYPE_OPTIONS.includes(rule.rule_type as RuleType)
                      ? NEW_RULE_TYPE_OPTIONS
                      : ([rule.rule_type as RuleType, ...NEW_RULE_TYPE_OPTIONS] as RuleType[])
                  ).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="checkboxLabel">
                <input
                  type="checkbox"
                  checked={rule.is_required}
                  disabled={!canEdit}
                  onChange={(event) =>
                    dispatch({
                      type: "UPDATE_RULE",
                      id: rule.id,
                      field: "is_required",
                      value: event.target.checked,
                    })
                  }
                />
                Obrigatória
              </label>

              <label className="checkboxLabel">
                <input
                  type="checkbox"
                  checked={rule.is_active}
                  disabled={!canEdit}
                  onChange={() => dispatch({ type: "TOGGLE_ACTIVE", id: rule.id })}
                />
                Ativa
              </label>
            </div>

            {fields.length > 0 && (
              <div className="checkinRuleConfigRows">
                {fields.map((field, fieldIndex) => {
                  const rawValue = rule.config?.[field.key];
                  const textValue = typeof rawValue === "string" || typeof rawValue === "number" ? String(rawValue) : "";
                  const checkedValue = Boolean(rawValue);

                  return (
                    <div key={`${rule.id}-${field.key}`} className="checkinRuleConfigRow">
                      <div className="configKeyLabel">{field.label}</div>

                      {field.input === "select" ? (
                        <select
                          className="configValueInput"
                          value={textValue || field.options?.[0]?.value || ""}
                          disabled={!canEdit}
                          autoFocus={canEdit && fieldIndex === 0}
                          onChange={(event) =>
                            dispatch({
                              type: "UPDATE_CONFIG_VALUE",
                              id: rule.id,
                              key: field.key,
                              value: event.target.value,
                            })
                          }
                        >
                          {(field.options || []).map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : field.input === "checkbox" ? (
                        <label className="checkboxLabel configCheckbox configValueInput">
                          <input
                            type="checkbox"
                            checked={checkedValue}
                            autoFocus={canEdit && fieldIndex === 0}
                            disabled={!canEdit}
                            onChange={(event) =>
                              dispatch({
                                type: "UPDATE_CONFIG_VALUE",
                                id: rule.id,
                                key: field.key,
                                value: event.target.checked,
                              })
                            }
                          />
                          Ativar
                        </label>
                      ) : (
                        <input
                          className="configValueInput"
                          type={field.input === "number" ? "number" : "text"}
                          value={textValue}
                          min={field.min}
                          max={field.max}
                          step={field.step}
                          autoFocus={canEdit && fieldIndex === 0}
                          placeholder={field.placeholder}
                          disabled={!canEdit}
                          onChange={(event) =>
                            dispatch({
                              type: "UPDATE_CONFIG_VALUE",
                              id: rule.id,
                              key: field.key,
                              value: event.target.value,
                            })
                          }
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {canEdit && !isFixedRule && (
              <div className="checkinRuleActions">
                <button type="button" className="btn" onClick={() => dispatch({ type: "REORDER", id: rule.id, direction: "up" })}>
                  Subir
                </button>
                <button type="button" className="btn" onClick={() => dispatch({ type: "REORDER", id: rule.id, direction: "down" })}>
                  Descer
                </button>
                <button type="button" className="btn danger" onClick={() => dispatch({ type: "REMOVE_RULE", id: rule.id })}>
                  Remover
                </button>
              </div>
            )}
          </>
        )}
      </article>
    );
  }

  if (!Number.isFinite(numericEventId) || numericEventId <= 0) {
    return <p className="muted">Evento inválido.</p>;
  }

  return (
    <section>
      {flash && (
        <div className={`flash ${flash.type}`}>
          {flash.message}
          <button className="linkBtn" onClick={() => setFlash(null)}>
            fechar
          </button>
        </div>
      )}

      <header className="pageHeader">
        <div>
          <h2>Regras de Check-in</h2>
          <p className="muted">
            {eventQuery.data ? `Evento: ${eventQuery.data.title}` : `Evento: ${numericEventId}`}
          </p>
        </div>
        <button type="button" className="btn" onClick={() => navigate(-1)}>
          Voltar
        </button>
      </header>

      {rulesQuery.isLoading && <p>Carregando regras...</p>}

      {rulesForbidden && (
        <div className="alert">
          Você não tem permissão para editar regras deste evento (403). A tela está em modo somente leitura.
        </div>
      )}

      {!rulesForbidden && rulesQuery.isError && (
        <div className="alert">
          Falha ao carregar regras. <button className="linkBtn" onClick={() => rulesQuery.refetch()}>tentar novamente</button>
        </div>
      )}

      {!rulesQuery.isLoading && !rulesQuery.isError && (
        <div className="checkinRulesCard">
          <div className="checkinRulesHeader">
            <strong>Regras do Evento</strong>
          </div>
{canEdit && NEW_RULE_TYPE_OPTIONS.length > 0 && (
            <div className="checkinRulesHeader">
              <span className="muted">Crie regras avançadas para validações adicionais.</span>
              <button type="button" className="btn" onClick={() => dispatch({ type: "ADD_RULE" })}>
                + Regra
              </button>
            </div>
          )}
          <h3>Confirmação de check-in</h3>
          <div className="checkinRulesList">
            {standardRules.map((rule) => renderRuleItem(rule))}
          </div>

          {customRules.length > 0 && (
            <>
              <h3>Regras avançadas</h3>
              <div className="checkinRulesList">
                {customRules.map((rule) => renderRuleItem(rule))}
              </div>
            </>
          )}

          {validationErrors.length > 0 && (
            <div className="alert">
              <strong>Validação da configuração</strong>
              <ul className="checkinRulesErrors">
                {validationErrors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          )}

          {saveForbidden && <div className="alert">Sem permissão para salvar regras (403). Apenas owner pode alterar.</div>}

          <footer className="modalFooter">
            {canEdit && (
              <>
                <button
                  type="button"
                  className="btn"
                  disabled={!state.dirty || saveMut.isPending}
                  onClick={() => dispatch({ type: "RESET" })}
                >
                  Descartar
                </button>
                <button type="button" className="btn primary" disabled={!canSave} onClick={() => saveMut.mutate()}>
                  {saveMut.isPending ? "Salvando..." : "Salvar"}
                </button>
              </>
            )}
          </footer>
        </div>
      )}
    </section>
  );
}
