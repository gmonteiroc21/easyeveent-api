import type { EventEntity } from "../../../api/events";

export type DashboardEvent = EventEntity;

export type DashboardViewState = {
  allEvents: DashboardEvent[];
  visibleEvents: DashboardEvent[];
  totalEvents: number;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  refetch: () => Promise<unknown>;
};
