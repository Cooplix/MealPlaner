import type { ReactNode } from "react";

export type InfoTone = "success" | "info" | "warn" | "error" | "neutral";

interface InfoCardProps {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  tone?: InfoTone;
  delta?: ReactNode;
  deltaTone?: InfoTone;
  tooltip?: string;
  className?: string;
}

const toneClassMap: Record<InfoTone, string> = {
  success: "border-[color:var(--ui-success-border)] bg-[color:var(--ui-success-bg)]",
  info: "border-[color:var(--ui-info-border)] bg-[color:var(--ui-info-bg)]",
  warn: "border-[color:var(--ui-warn-border)] bg-[color:var(--ui-warn-bg)]",
  error: "border-[color:var(--ui-error-border)] bg-[color:var(--ui-error-bg)]",
  neutral: "border-[color:var(--ui-border)] bg-[color:var(--ui-surface-muted)]",
};

const toneTextClassMap: Record<InfoTone, string> = {
  success: "text-[color:var(--ui-success-text)]",
  info: "text-[color:var(--ui-info-text)]",
  warn: "text-[color:var(--ui-warn-text)]",
  error: "text-[color:var(--ui-error-text)]",
  neutral: "text-[color:var(--ui-muted)]",
};

export function InfoCard({
  label,
  value,
  hint,
  tone = "neutral",
  delta,
  deltaTone,
  tooltip,
  className,
}: InfoCardProps) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClassMap[tone]} ${className ?? ""}`} title={tooltip}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-wide text-[color:var(--ui-muted)]">{label}</div>
        {delta && (
          <div className={`text-xs font-semibold ${toneTextClassMap[deltaTone ?? tone]}`}>
            {delta}
          </div>
        )}
      </div>
      <div className="mt-1 text-lg font-semibold text-[color:var(--ui-title)]">{value}</div>
      {hint && <div className="mt-1 text-xs text-[color:var(--ui-muted)]">{hint}</div>}
    </div>
  );
}

