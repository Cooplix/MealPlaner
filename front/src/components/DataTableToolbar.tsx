import type { ReactNode } from "react";

type TitleTag = "h2" | "h3" | "div";

interface DataTableToolbarProps {
  title?: ReactNode;
  titleAs?: TitleTag;
  meta?: ReactNode;
  controls?: ReactNode;
  className?: string;
}

export function DataTableToolbar({
  title,
  titleAs = "div",
  meta,
  controls,
  className,
}: DataTableToolbarProps) {
  const Title = titleAs;
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between ${className ?? ""}`}>
      <div className="space-y-1">
        {title && <Title className="text-lg font-semibold text-[color:var(--ui-title)]">{title}</Title>}
        {meta && <div className="text-sm text-[color:var(--ui-muted)]">{meta}</div>}
      </div>
      {controls && <div className="flex flex-wrap items-end gap-3">{controls}</div>}
    </div>
  );
}

