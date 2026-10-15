import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  header?: ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
};

const PAD = {
  sm: 'p-3',
  md: 'p-4 md:p-5',
  lg: 'p-5 md:p-6',
} as const;

export function AppCard({
  children,
  header,
  className = '',
  padding = 'md',
}: Props) {
  return (
    <div
      className={`app-card rounded-card border border-border bg-card ${PAD[padding]} ${className}`.trim()}
    >
      {header ? (
        <div className="mb-3 border-b border-border/70 pb-3">{header}</div>
      ) : null}
      {children}
    </div>
  );
}
