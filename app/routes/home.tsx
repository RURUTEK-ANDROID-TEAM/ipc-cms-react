import type { Route } from "./+types/routes/pages";
import Login from "./auth/pages/login";
export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  return <Login />;
}
