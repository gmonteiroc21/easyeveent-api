import type { EventEntity } from "../../../api/events";
import type { CheckinRuleEntity } from "../../../api/checkinRules";

export type RuleEvaluationContext = {
  now?: Date;
  currentParticipantsCount?: number;
  selectedTicketType?: "full" | "half";
  halfTicketSoldCount?: number;
  providedDocument?: string;
};

export type RuleEvaluationIssue = {
  level: "error" | "warning";
  ruleId: number;
  ruleType: string;
  message: string;
};

export type RuleEvaluationResult = {
  allowed: boolean;
  activeRulesCount: number;
  requiredRulesCount: number;
  errors: string[];
  warnings: string[];
  issues: RuleEvaluationIssue[];
  requiredWindowIntersection:
    | {
        startsAt: string;
        endsAt: string;
      }
    | null;
};

function sortRules(rules: CheckinRuleEntity[]) {
  return [...rules].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  return null;
}

function pushIssue(issues: RuleEvaluationIssue[], level: "error" | "warning", rule: CheckinRuleEntity, message: string) {
  issues.push({
    level,
    ruleId: rule.id,
    ruleType: rule.rule_type,
    message,
  });
}

export function evaluateRules(event: EventEntity, context: RuleEvaluationContext = {}): RuleEvaluationResult {
  const activeRules = sortRules((event.checkin_rules ?? []).filter((rule) => rule.is_active));
  const requiredRules = activeRules.filter((rule) => rule.is_required);
  const now = context.now ?? new Date();
  const issues: RuleEvaluationIssue[] = [];
  let requiredWindowIntersection: RuleEvaluationResult["requiredWindowIntersection"] = null;

  const startsAt = new Date(event.starts_at);
  const hasValidEventStart = Number.isFinite(startsAt.getTime());

  if (!hasValidEventStart) {
    requiredRules.forEach((rule) => {
      pushIssue(issues, "error", rule, "Data de início do evento inválida para validar janela de check-in.");
    });
  }

  if (requiredRules.length > 0 && hasValidEventStart) {
    const intersectionStartOffset = Math.max(...requiredRules.map((rule) => -rule.window_before_minutes));
    const intersectionEndOffset = Math.min(...requiredRules.map((rule) => rule.window_after_minutes));

    if (intersectionStartOffset > intersectionEndOffset) {
      requiredRules.forEach((rule) => {
        pushIssue(issues, "error", rule, "Conflito de janela com outras regras obrigatórias ativas.");
      });
    } else {
      const intersectionStart = addMinutes(startsAt, intersectionStartOffset);
      const intersectionEnd = addMinutes(startsAt, intersectionEndOffset);
      requiredWindowIntersection = {
        startsAt: intersectionStart.toISOString(),
        endsAt: intersectionEnd.toISOString(),
      };

      if (now < intersectionStart || now > intersectionEnd) {
        requiredRules.forEach((rule) => {
          pushIssue(issues, "error", rule, "Fora da janela permitida de check-in para regras obrigatórias.");
        });
      }
    }
  }

  activeRules.forEach((rule) => {
    if (rule.rule_type === "capacity_limit") {
      const maxUsers = asNumber(rule.config?.max_users);
      if (maxUsers != null && context.currentParticipantsCount != null && context.currentParticipantsCount >= maxUsers) {
        pushIssue(issues, "error", rule, "Limite de participantes atingido.");
      }
    }

    if (rule.rule_type === "document_check") {
      const requiredDocument = asString(rule.config?.required_document);
      if (requiredDocument && !asString(context.providedDocument)) {
        pushIssue(issues, "error", rule, `Documento obrigatório não informado (exigido: ${requiredDocument}).`);
      }
    }

    if (rule.rule_type === "half_price_policy" && context.selectedTicketType === "half") {
      const quota = asNumber(rule.config?.quota);
      if (quota != null && context.halfTicketSoldCount != null && context.halfTicketSoldCount >= quota) {
        pushIssue(
          issues,
          rule.is_required ? "error" : "warning",
          rule,
          "Cota de meia-entrada atingida para este evento."
        );
      }
    }
  });

  const errors = issues.filter((issue) => issue.level === "error").map((issue) => issue.message);
  const warnings = issues.filter((issue) => issue.level === "warning").map((issue) => issue.message);

  return {
    allowed: errors.length === 0,
    activeRulesCount: activeRules.length,
    requiredRulesCount: requiredRules.length,
    errors,
    warnings,
    issues,
    requiredWindowIntersection,
  };
}
