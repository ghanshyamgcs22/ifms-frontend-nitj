import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, XCircle, Sparkles, DollarSign } from "lucide-react";

export type Status = "pending" | "approved" | "rejected" | "released" | "sanctioned";

interface StatusBadgeProps {
  status: Status;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const variants: Record<Status, { label: string; className: string; icon: React.ElementType }> = {
    pending: {
      label: "Pending",
      className: "bg-warning/15 text-warning hover:bg-warning/25 border-warning/30 animate-pulse font-bold shadow-sm",
      icon: Clock,
    },
    approved: {
      label: "Approved",
      className: "bg-success/15 text-success hover:bg-success/25 border-success/30 font-bold shadow-sm",
      icon: CheckCircle,
    },
    rejected: {
      label: "Rejected",
      className: "bg-destructive/15 text-destructive hover:bg-destructive/25 border-destructive/30 font-bold shadow-sm",
      icon: XCircle,
    },
    released: {
      label: "Released",
      className: "bg-info/15 text-info hover:bg-info/25 border-info/30 font-bold shadow-sm",
      icon: DollarSign,
    },
    sanctioned: {
      label: "Sanctioned",
      className: "bg-primary/15 text-primary hover:bg-primary/25 border-primary/30 font-bold shadow-sm",
      icon: Sparkles,
    },
  };

  const variant = variants[status];
  const IconComponent = variant.icon;

  return (
    <Badge
      variant="outline"
      className={`${variant.className} transition-all duration-200 border-2 px-3 py-1`}
    >
      <IconComponent className="h-3 w-3 mr-1.5" />
      {variant.label}
    </Badge>
  );
};
