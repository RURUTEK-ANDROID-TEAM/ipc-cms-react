import LiveView from "@/components/live-view/live-view";
import type { Route } from "./+types/home";
import Login from "./auth/login";
import SignUp from "./auth/signup";
import Dashboard from "./dashboard/dashboard";
export function meta({ }: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  return <LiveView />
}
