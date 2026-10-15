import type { ReactNode } from 'react';

type Props = {
  eyebrow?: string;
  title: string;
  trailing?: ReactNode;
  className?: string;
};

export function PageHeader({ eyebrow, title, trailing, className = '' }: Props) {
  return (
    <div
      className={`od-enter flex items-end justify-between gap-4 ${className}`.trim()}
    >
      <div>
        {eyebrow ? (
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent mb-1">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-3xl text-tan uppercase tracking-wide">
          {title}
        </h1>
      </div>
      {trailing ? (
        <div className="shrink-0 pb-1 text-muted">{trailing}</div>
      ) : null}
    </div>
  );
}
