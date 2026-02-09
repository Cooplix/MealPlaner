import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: ReactNode;
  className?: string;
}

export function EmptyState({ title, message, icon, className }: EmptyStateProps) {
  return (
    <div
      className={`rounded-lg border border-dashed px-4 py-6 text-center text-sm text-[color:var(--ui-muted)] ${className ?? ""}`}
    >
      {icon && <div className="mb-2 text-lg">{icon}</div>}
      <div className="font-medium text-[color:var(--ui-title)]">{title}</div>
      {message && <div className="mt-1">{message}</div>}
    </div>
  );
}
