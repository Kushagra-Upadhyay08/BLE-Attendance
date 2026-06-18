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
  active: "bg-success/25 text-[#3d6b4d] ring-success/30",
  success: "bg-success/25 text-[#3d6b4d] ring-success/30",
  present: "bg-success/25 text-[#3d6b4d] ring-success/30",
  locked: "bg-[#8190a1]/15 text-[#5e6b78] ring-[#8190a1]/25",
  ended: "bg-[#8190a1]/15 text-[#5e6b78] ring-[#8190a1]/25",
  neutral: "bg-[#8190a1]/15 text-[#5e6b78] ring-[#8190a1]/25",
  editable: "bg-butter/35 text-[#8f6b1e] ring-butter/40",
  warning: "bg-warning/25 text-[#8a651f] ring-warning/35",
  absent: "bg-error/20 text-[#a85a4c] ring-error/30",
  info: "bg-primary/15 text-[#4f7896] ring-primary/25",
  lecture: "bg-primary/15 text-[#4f7896] ring-primary/25",
  lab: "bg-blush/30 text-[#9b6178] ring-blush/40",
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
