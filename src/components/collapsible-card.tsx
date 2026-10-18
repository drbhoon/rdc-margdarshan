"use client";

import { useState } from "react";

export function CollapsibleCard({
  title,
  summary,
  defaultOpen = false,
  id,
  className,
  children,
}: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      className={`card collapsible${className ? ` ${className}` : ""}`}
      id={id}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        <h2>{title}</h2>
        {summary && (
          <span className="collapsible-summary muted">{summary}</span>
        )}
      </summary>
      <div className="collapsible-body">{children}</div>
    </details>
  );
}
