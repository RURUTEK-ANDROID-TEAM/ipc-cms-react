import { SectionCards } from "@/components/dashboard/sections/section-cards";
import Management from "./management";
import { useState } from "react";

export default function Dashboard() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleManagementUpdate = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <SectionCards key={refreshKey} />
      <Management hideUsersTable={true} onUpdate={handleManagementUpdate} />
    </div>
  );
}
