import { useMemo } from "react";

export const DateCell = ({ date }: { date: string }) => {
  const formattedDate = useMemo(() => {
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  }, [date]);

  return <span>{formattedDate}</span>;
};
