import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { ApiError } from "../../../api/errors";
import { eventsApi } from "../../../api/events";
import type { DashboardEvent, DashboardViewState } from "../model/dashboard.types";

function sortByStartsAtAsc(events: DashboardEvent[]) {
  return [...events].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  );
}

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Sessão expirada. Faça login novamente.";
    if (error.status === 403) return "Você não tem permissão para visualizar o dashboard.";
    return `Falha ao carregar dashboard (HTTP ${error.status}).`;
  }

  return "Erro inesperado ao carregar dashboard.";
}

export function useDashboardViewModel(): DashboardViewState {
  const [query, setQuery] = useState("");

  const eventsQuery = useQuery({
    queryKey: ["events", "dashboard"],
    queryFn: () => eventsApi.list(),
  });

  const allEvents = useMemo(() => {
    return sortByStartsAtAsc(eventsQuery.data ?? []);
  }, [eventsQuery.data]);

  const visibleEvents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return allEvents;

    return allEvents.filter((event) => {
      const title = event.title.toLowerCase();
      return title.includes(needle);
    });
  }, [allEvents, query]);

  return {
    allEvents,
    visibleEvents,
    totalEvents: allEvents.length,
    query,
    setQuery,
    isLoading: eventsQuery.isLoading,
    isError: eventsQuery.isError,
    errorMessage: eventsQuery.error ? toErrorMessage(eventsQuery.error) : null,
    refetch: eventsQuery.refetch,
  };
}
