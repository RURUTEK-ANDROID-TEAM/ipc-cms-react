import { SectionCards } from "@/components/dashboard/section-cards";
import Management from "./management";

export default function Dashboard() {
  return (
    <>
      <SectionCards />
      <Management hideUsersTable={true} />
    </>
  );
}
