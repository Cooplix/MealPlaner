import type { ReactNode } from "react";

type HeadingLevel = "h1" | "h2" | "h3";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  titleAs?: HeadingLevel;
  actions?: ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  titleAs = "h2",
  actions,
  className,
}: SectionHeaderProps) {
  const TitleTag = titleAs;
  return (
    <div className={`flex flex-wrap items-start justify-between gap-3 ${className ?? ""}`}>
      <div className="space-y-1">
        <TitleTag className="text-2xl font-semibold text-[color:var(--ui-title)]">{title}</TitleTag>
        {subtitle && <p className="text-sm text-[color:var(--ui-muted)]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
