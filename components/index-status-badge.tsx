import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { IndexStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusConfig: Record<
  IndexStatus,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  processing: {
    label: "Indexando",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    icon: Loader2,
  },
  completed: {
    label: "Indexado",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    icon: CheckCircle2,
  },
  failed: {
    label: "Falló",
    className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
    icon: XCircle,
  },
};

/** Badge visual del estado de indexado de un documento en el baúl. */
export const IndexStatusBadge = ({ status }: { status: IndexStatus }) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge className={cn("gap-1 font-medium", config.className)}>
      <Icon className={cn("size-3.5", status === "processing" && "animate-spin")} aria-hidden />
      {config.label}
    </Badge>
  );
};
