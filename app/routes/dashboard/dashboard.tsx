import { SectionCards } from "@/components/dashboard/section-cards";
import Management from "./management";
import { useOutletContext } from "react-router";
import type { ReactNode } from "react";

export default function Dashboard() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <SectionCards />
      <Management hideUsersTable={true} />
    </div>
  );
}
