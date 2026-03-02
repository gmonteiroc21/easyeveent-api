import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { AppShell } from "../layout/AppShell";

import { LoginPage } from "../features/auth/LoginPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { EventsPage } from "../features/events/EventsPage";
import { ParticipantsPage } from "../features/participants/ParticipantsPage";
import { CheckinRulesPage } from "../features/checkin/CheckinRulesPage";

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },

  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "eventos", element: <EventsPage /> },
      { path: "eventos/:eventId/checkin", element: <CheckinRulesPage /> },
      { path: "participantes", element: <ParticipantsPage /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}