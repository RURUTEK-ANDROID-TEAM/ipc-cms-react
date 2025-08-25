import { DataTable } from "@/components/dashboard/data-table";
import data from "./data.json";
import React from "react";

const Management = () => {
  return (
    <div>
      <DataTable data={data} />
    </div>
  );
};

export default Management;
