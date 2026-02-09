import type { ReactNode } from "react";

type StatusTone = "success" | "info" | "warn" | "error" | "neutral";

interface StatusBadgeProps {
  tone?: StatusTone;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

const toneClassMap: Record<StatusTone, string> = {
  success:
    "bg-[color:var(--ui-success-bg)] border-[color:var(--ui-success-border)] text-[color:var(--ui-success-text)]",
  info:
    "bg-[color:var(--ui-info-bg)] border-[color:var(--ui-info-border)] text-[color:var(--ui-info-text)]",
  warn:
    "bg-[color:var(--ui-warn-bg)] border-[color:var(--ui-warn-border)] text-[color:var(--ui-warn-text)]",
  error:
    "bg-[color:var(--ui-error-bg)] border-[color:var(--ui-error-border)] text-[color:var(--ui-error-text)]",
  neutral:
    "bg-[color:var(--ui-neutral-bg)] border-[color:var(--ui-neutral-border)] text-[color:var(--ui-neutral-text)]",
};

export function StatusBadge({ tone = "neutral", children, icon, className }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${toneClassMap[tone]} ${className ?? ""}`}
    >
      <span aria-hidden className="text-[10px] leading-none">
        {icon ?? "●"}
      </span>
      <span>{children}</span>
    </span>
  );
}
