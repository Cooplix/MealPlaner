import type { ReactNode } from "react";

type AlertTone = "success" | "info" | "warn" | "error" | "neutral";

interface InlineAlertProps {
  tone?: AlertTone;
  title?: string;
  message: ReactNode;
  actions?: ReactNode;
  className?: string;
}

const toneClassMap: Record<AlertTone, string> = {
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

export function InlineAlert({
  tone = "neutral",
  title,
  message,
  actions,
  className,
}: InlineAlertProps) {
  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${toneClassMap[tone]} ${className ?? ""}`}>
      <div className="flex items-start gap-2">
        <span aria-hidden className="mt-0.5 text-[10px] leading-none">
          ●
        </span>
        <div className="space-y-1">
          {title && <div className="font-medium">{title}</div>}
          <div>{message}</div>
          {actions && <div className="pt-1">{actions}</div>}
        </div>
      </div>
    </div>
  );
}
