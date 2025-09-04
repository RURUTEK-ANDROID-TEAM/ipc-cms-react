import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  layout("routes/auth/auth-layout.tsx", [
    index("routes/home.tsx"), // "/" → home.tsx (Login)
    route("sign-up", "routes/auth/pages/signup.tsx"), // "/sign-up"
  ]),
  route("dashboard", "routes/dashboard/dashboard-layout.tsx", [
    index("routes/dashboard/pages/dashboard.tsx"), // "/dashboard"
    route("live-view", "routes/dashboard/pages/live-view.tsx"), // "/dashboard/live-view"
    route("groups", "routes/dashboard/pages/groups.tsx"), // "/dashboard/groups"
    route("playback", "routes/dashboard/pages/playback.tsx"), // "/dashboard/playback"
    route("management", "routes/dashboard/pages/management-wrapper.tsx"), // "/dashboard/users"
  ]),
] satisfies RouteConfig;
