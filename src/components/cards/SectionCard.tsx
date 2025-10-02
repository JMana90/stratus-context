
import React, { PropsWithChildren } from "react";

type Props = PropsWithChildren<{
  title: string;
  right?: React.ReactNode;
  className?: string;
}>;

export default function SectionCard({ title, right, className, children }: Props) {
  return (
    <div className={`rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 ${className ?? ""}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">{title}</h3>
        {right ?? null}
      </div>
      <div>{children}</div>
    </div>
  );
}