import type { ReactNode } from "react";

type PageTitleProps = {
  title: string;
  description?: string;
  rightSlot?: ReactNode;
};

export function PageTitle({ title, description, rightSlot }: PageTitleProps) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        {description ? <p className="text-sm text-muted">{description}</p> : null}
      </div>
      {rightSlot}
    </div>
  );
}
