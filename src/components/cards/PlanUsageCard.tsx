import React from "react";
import SectionCard from "./SectionCard";

export default function PlanUsageCard() {
  const [open, setOpen] = React.useState<boolean>(() => {
    return localStorage.getItem("planCardOpen") !== "false";
  });

  React.useEffect(() => {
    localStorage.setItem("planCardOpen", String(open));
  }, [open]);

  return (
    <SectionCard
      title="Current Plan"
      right={
        <button
          type="button"
          className="text-sm underline"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Hide" : "Show"}
        </button>
      }
    >
      {open && (
        <div className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
          {/* TODO: replace with real usage metrics */}
          <div>Users • Projects • Storage • AI Requests</div>
        </div>
      )}
    </SectionCard>
  );
}