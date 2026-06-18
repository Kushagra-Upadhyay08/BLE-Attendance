import { cn } from "./utils";

export function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<"button"> & {
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg";
}) {
  const variantClass =
    variant === "outline"
      ? "border border-border bg-card text-foreground hover:bg-surface-2"
      : variant === "ghost"
      ? "bg-transparent text-foreground hover:bg-surface-2"
      : variant === "destructive"
      ? "bg-error text-white hover:opacity-95"
      : "bg-primary text-primary-foreground hover:brightness-[0.98]";

  const sizeClass = size === "sm" ? "h-9 px-3 text-sm" : size === "lg" ? "h-11 px-6 text-base" : "h-10 px-4 text-sm";

  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all disabled:pointer-events-none disabled:opacity-50",
        variantClass,
        sizeClass,
        className
      )}
    />
  );
}
