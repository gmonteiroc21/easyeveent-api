import type { DashboardViewState } from "../model/dashboard.types";
import { DashboardSkeleton } from "./DashboardSkeleton";
import { EmptyDashboardState } from "./EmptyDashboardState";
import { EventGrid } from "./EventGrid";

type DashboardViewProps = {
  state: DashboardViewState;
};

export function DashboardView({ state }: DashboardViewProps) {
  return (
    <section>
      <header className="pageHeader">
        <div>
          <h2>Dashboard</h2>
          <p className="muted">Visão geral dos seus eventos</p>
        </div>

        <div className="dashboardSummary">
          <span className="summaryLabel">Total de eventos</span>
          <strong>{state.totalEvents}</strong>
        </div>
      </header>

      {state.isLoading && <DashboardSkeleton />}

      {state.isError && (
        <div className="alert">
          {state.errorMessage ?? "Erro ao carregar dashboard."}{" "}
          <button className="linkBtn" onClick={() => void state.refetch()}>
            tentar novamente
          </button>
        </div>
      )}

      {!state.isLoading && !state.isError && state.visibleEvents.length === 0 && <EmptyDashboardState />}

      {!state.isLoading && !state.isError && state.visibleEvents.length > 0 && (
        <EventGrid events={state.visibleEvents} />
      )}
    </section>
  );
}
