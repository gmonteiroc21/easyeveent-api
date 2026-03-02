import type { DashboardEvent } from "../model/dashboard.types";
import { EventDashboardCard } from "./EventDashboardCard";

type EventGridProps = {
  events: DashboardEvent[];
};

export function EventGrid({ events }: EventGridProps) {
  return (
    <div className="dashboardGrid">
      {events.map((event) => (
        <EventDashboardCard key={event.id} event={event} />
      ))}
    </div>
  );
}
