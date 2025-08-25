import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  layout("routes/auth/auth-layout.tsx", [
    index("routes/home.tsx"), // "/" → home.tsx (Login)
    route("sign-up", "routes/auth/signup.tsx"), // "/sign-up"
  ]),
  route("dashboard", "routes/dashboard/dashboard-layout.tsx", [
    index("routes/dashboard/dashboard.tsx"), // "/dashboard"
    route("live-view", "routes/dashboard/live-view.tsx"), // "/dashboard/live-view"
    route("management", "routes/dashboard/management.tsx"), // "/dashboard/users"
  ]),
] satisfies RouteConfig;
