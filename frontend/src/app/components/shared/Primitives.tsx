import { cn } from "../ui/utils";

export function PageHeader({
  title,
  subtitle,
  actions,
  back,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  back?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        {back}
        <h1 className="flex items-center gap-2.5 text-[1.85rem] leading-tight text-foreground">
          <span className="inline-block h-5 w-0.5 rounded-full bg-pop/80" />
          {title}
        </h1>
        {subtitle && <p className="pl-[14px] text-sm text-muted-foreground sm:text-base">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  description,
  children,
  className,
  actions,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}) {
  return (
    <section className={cn("overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_2px_rgba(42,41,37,0.035)]", className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="space-y-0.5">
            {title && <h3 className="text-base font-medium text-foreground">{title}</h3>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "primary",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  tone?: "primary" | "mint" | "blush" | "butter";
}) {
  const accent: Record<string, string> = {
    primary: "text-[#51635a]",
    mint: "text-[#5f8a78]",
    blush: "text-[#b07b78]",
    butter: "text-[#947948]",
  };

  return (
    <div className="rounded-lg border border-border bg-card p-5 transition-shadow hover:shadow-[0_10px_24px_-18px_rgba(36,48,65,0.18)]">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon && <span className={cn("[&_svg]:size-4", accent[tone])}>{icon}</span>}
        <p className="text-sm">{label}</p>
      </div>
      <p className="mt-3 font-[var(--font-serif)] text-[2rem] leading-none text-foreground">{value}</p>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface-2/60 px-6 py-14 text-center">
      {icon && <span className="grid size-12 place-items-center rounded-lg bg-card text-muted-foreground shadow-sm">{icon}</span>}
      <div className="space-y-1">
        <p className="text-base text-foreground">{title}</p>
        {description && <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
      {error ? <p className="text-xs text-error">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
