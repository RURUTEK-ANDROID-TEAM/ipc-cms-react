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
  layout("routes/dashboard/dashboard-layout.tsx", [
    index("routes/dashboard/dashboard.tsx"), // "/dashboard"
  ]),
] satisfies RouteConfig;
