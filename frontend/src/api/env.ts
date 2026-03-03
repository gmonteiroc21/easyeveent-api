export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000",
  authLoginPath: import.meta.env.VITE_AUTH_LOGIN_PATH ?? "/auth/login",
  authHeaderPrefix: import.meta.env.VITE_AUTH_HEADER_PREFIX ?? "Bearer",


  eventsPath: import.meta.env.VITE_EVENTS_PATH ?? "/events",
  dashboardEventsPath: import.meta.env.VITE_DASHBOARD_EVENTS_PATH ?? "/dashboard/events",
  railsWrapParams: (import.meta.env.VITE_RAILS_WRAP_PARAMS ?? "true") === "true",
};
