import { DashboardView } from "./view/DashboardView";
import { useDashboardViewModel } from "./viewmodel/useDashboardViewModel";

export function DashboardPage() {
  const state = useDashboardViewModel();

  return <DashboardView state={state} />;
}
