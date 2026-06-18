import { cn } from "../ui/utils";
import type { SessionStatus } from "../../lib/types";

type Tone =
  | "active"
  | "locked"
  | "ended"
  | "editable"
  | "present"
  | "absent"
  | "warning"
  | "success"
  | "neutral"
  | "info"
  | "lecture"
  | "lab";

const toneStyles: Record<Tone, string> = {
  active: "bg-success/20 text-[#4f735f] ring-success/25",
  success: "bg-success/20 text-[#4f735f] ring-success/25",
  present: "bg-success/20 text-[#4f735f] ring-success/25",
  locked: "bg-[#8d968d]/12 text-[#626a62] ring-[#8d968d]/22",
  ended: "bg-[#8d968d]/12 text-[#626a62] ring-[#8d968d]/22",
  neutral: "bg-[#8d968d]/12 text-[#626a62] ring-[#8d968d]/22",
  editable: "bg-butter/30 text-[#876d39] ring-butter/35",
  warning: "bg-warning/20 text-[#876d39] ring-warning/30",
  absent: "bg-error/16 text-[#9c5f58] ring-error/25",
  info: "bg-primary-soft text-[#51635a] ring-primary/15",
  lecture: "bg-primary-soft text-[#51635a] ring-primary/15",
  lab: "bg-blush/45 text-[#9c6865] ring-blush/50",
};

const labels: Partial<Record<Tone, string>> = {
  active: "Active",
  locked: "Locked",
  ended: "Ended",
  editable: "Editable",
};

export function StatusChip({
  tone,
  children,
  dot = false,
  className,
}: {
  tone: Tone | SessionStatus;
  children?: React.ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs ring-1 ring-inset", toneStyles[tone as Tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current opacity-80" />}
      {children ?? labels[tone as Tone] ?? tone}
    </span>
  );
}
