// components/ApprovalTimeline.tsx
// Formal 4-stage approval timeline:
// PI Submitted → DA Processed → AR Recommended → DR Approved

import { CheckCircle2, Clock, XCircle, Circle, FileText, UserCheck, Briefcase, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface ApprovalHistoryItem {
  stage: string;
  action: string;
  by: string;
  timestamp: string;
  remarks?: string;
}

interface ApprovalTimelineProps {
  approvalHistory?: ApprovalHistoryItem[];
  currentStage: string;
  status: string;
  createdAt?: string;
  piName?: string;
}

// ── Stage definitions ──────────────────────────────────────────────────────────
const STAGES = [
  {
    key:         "pi",
    label:       "PI Submitted",
    sublabel:    "Budget request created",
    Icon:        FileText,
    activeColor: "text-sky-600",
    activeBg:    "bg-sky-50 border-sky-300",
    doneBg:      "bg-emerald-50 border-emerald-300",
    doneColor:   "text-emerald-600",
    connColor:   "bg-emerald-300",
  },
  {
    key:         "da",
    label:       "DA Processed",
    sublabel:    "Dealing Assistant review",
    Icon:        UserCheck,
    activeColor: "text-violet-600",
    activeBg:    "bg-violet-50 border-violet-300",
    doneBg:      "bg-emerald-50 border-emerald-300",
    doneColor:   "text-emerald-600",
    connColor:   "bg-emerald-300",
  },
  {
    key:         "ar",
    label:       "AR Recommended",
    sublabel:    "Accounts Representative approval",
    Icon:        Briefcase,
    activeColor: "text-amber-600",
    activeBg:    "bg-amber-50 border-amber-300",
    doneBg:      "bg-emerald-50 border-emerald-300",
    doneColor:   "text-emerald-600",
    connColor:   "bg-emerald-300",
  },
  {
    key:         "dr",
    label:       "DR Approved",
    sublabel:    "Director final approval",
    Icon:        Award,
    activeColor: "text-rose-600",
    activeBg:    "bg-rose-50 border-rose-300",
    doneBg:      "bg-emerald-50 border-emerald-300",
    doneColor:   "text-emerald-600",
    connColor:   "bg-emerald-300",
  },
];

const STAGE_ORDER = ["pi", "da", "ar", "dr"];

const fmtDate = (d?: string) => {
  if (!d) return null;
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
};

// ── Stage status resolver ──────────────────────────────────────────────────────
function resolveStageStatus(
  stageKey: string,
  currentStage: string,
  status: string,
  approvalHistory: ApprovalHistoryItem[]
): "done" | "active" | "rejected" | "pending" {
  const stageIdx   = STAGE_ORDER.indexOf(stageKey);
  const currentIdx = STAGE_ORDER.indexOf(currentStage === "pi" ? "pi" : currentStage);

  // PI stage is always "done" once the request exists
  if (stageKey === "pi") return "done";

  // Check history for explicit action
  const histEntry = approvalHistory.find(h => h.stage === stageKey);
  if (histEntry) {
    if (histEntry.action === "reject" || histEntry.action === "rejected") return "rejected";
    return "done";
  }

  // If globally rejected, everything after the reject point is pending
  if (status === "rejected") return "pending";

  // Current active stage
  if (stageKey === currentStage) return "active";

  // Stages before current are done
  if (stageIdx < currentIdx) return "done";

  // Global approved — all done
  if (status === "approved") return "done";

  return "pending";
}

// ═══════════════════════════════════════════════════════════════════════════════
export const ApprovalTimeline = ({
  approvalHistory = [],
  currentStage,
  status,
  createdAt,
  piName,
}: ApprovalTimelineProps) => {
  return (
    <div className="py-2">
      {/* ── Title ── */}
      <div className="flex items-center gap-2 mb-8">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-slate-400 px-3">
          Approval Workflow
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent via-slate-200 to-transparent" />
      </div>

      {/* ── Timeline ── */}
      <div className="relative">
        {STAGES.map((stage, idx) => {
          const stageStatus = resolveStageStatus(
            stage.key, currentStage, status, approvalHistory
          );
          const histEntry = approvalHistory.find(h => h.stage === stage.key);
          const isLast    = idx === STAGES.length - 1;
          const isDone    = stageStatus === "done";
          const isActive  = stageStatus === "active";
          const isRejected= stageStatus === "rejected";
          const isPending = stageStatus === "pending";

          // Connector color between this and next stage
          const nextDone = !isLast
            ? resolveStageStatus(STAGES[idx + 1].key, currentStage, status, approvalHistory) === "done"
            : false;

          return (
            <div key={stage.key} className="flex gap-0">
              {/* ── Left column: icon + connector ── */}
              <div className="flex flex-col items-center w-14 flex-shrink-0">
                {/* Circle icon */}
                <div className={cn(
                  "w-12 h-12 rounded-full border-2 flex items-center justify-center shadow-sm transition-all duration-300 z-10",
                  isDone     && stage.doneBg,
                  isActive   && cn(stage.activeBg, "shadow-md ring-4 ring-offset-2",
                    stage.key === "da" ? "ring-violet-100"
                    : stage.key === "ar" ? "ring-amber-100"
                    : stage.key === "dr" ? "ring-rose-100" : "ring-sky-100"),
                  isRejected && "bg-red-50 border-red-300",
                  isPending  && "bg-slate-50 border-slate-200",
                )}>
                  {isDone && (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  )}
                  {isActive && (
                    <div className="relative">
                      <stage.Icon className={cn("h-5 w-5", stage.activeColor)} />
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-current animate-ping"
                        style={{ color: "inherit" }} />
                      <span className={cn(
                        "absolute -top-1 -right-1 w-2 h-2 rounded-full",
                        stage.key === "da" ? "bg-violet-500"
                        : stage.key === "ar" ? "bg-amber-500"
                        : stage.key === "dr" ? "bg-rose-500" : "bg-sky-500"
                      )} />
                    </div>
                  )}
                  {isRejected && <XCircle className="h-5 w-5 text-red-500" />}
                  {isPending  && <Circle  className="h-5 w-5 text-slate-300" />}
                </div>

                {/* Vertical connector */}
                {!isLast && (
                  <div className={cn(
                    "w-0.5 flex-1 my-1 min-h-[2rem] rounded-full transition-colors duration-500",
                    isDone && nextDone ? "bg-emerald-300"
                    : isDone           ? "bg-gradient-to-b from-emerald-300 to-slate-200"
                    : isActive         ? "bg-gradient-to-b from-slate-300 to-slate-100"
                    :                    "bg-slate-100"
                  )} />
                )}
              </div>

              {/* ── Right column: content ── */}
              <div className={cn(
                "flex-1 ml-4 pb-8",
                isLast && "pb-2"
              )}>
                {/* Stage header */}
                <div className="flex items-start justify-between gap-3 mb-1.5 pt-2.5">
                  <div>
                    <h4 className={cn(
                      "text-sm font-semibold leading-tight",
                      isDone     && "text-emerald-700",
                      isActive   && (
                        stage.key === "da" ? "text-violet-700"
                        : stage.key === "ar" ? "text-amber-700"
                        : stage.key === "dr" ? "text-rose-700"
                        : "text-sky-700"
                      ),
                      isRejected && "text-red-700",
                      isPending  && "text-slate-400",
                    )}>
                      {stage.label}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{stage.sublabel}</p>
                  </div>

                  {/* Status pill */}
                  <span className={cn(
                    "text-[10px] font-semibold tracking-wide uppercase px-2.5 py-1 rounded-full whitespace-nowrap",
                    isDone     && "bg-emerald-100 text-emerald-700",
                    isActive   && (
                      stage.key === "da" ? "bg-violet-100 text-violet-700 animate-pulse"
                      : stage.key === "ar" ? "bg-amber-100 text-amber-700 animate-pulse"
                      : stage.key === "dr" ? "bg-rose-100 text-rose-700 animate-pulse"
                      : "bg-sky-100 text-sky-700"
                    ),
                    isRejected && "bg-red-100 text-red-700",
                    isPending  && "bg-slate-100 text-slate-400",
                  )}>
                    {isDone      && "✓ Complete"}
                    {isActive    && "● In Progress"}
                    {isRejected  && "✕ Rejected"}
                    {isPending   && "Awaiting"}
                  </span>
                </div>

                {/* PI stage special content */}
                {stage.key === "pi" && (
                  <div className="mt-2 px-3 py-2.5 rounded-lg bg-sky-50 border border-sky-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-sky-800">
                          {piName || "Principal Investigator"}
                        </p>
                        <p className="text-[11px] text-sky-500 mt-0.5">Submitted budget booking request</p>
                      </div>
                      {createdAt && (
                        <p className="text-[10px] text-sky-400 font-mono text-right">
                          {fmtDate(createdAt)}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* History entry card */}
                {histEntry && (
                  <div className={cn(
                    "mt-2 px-3 py-2.5 rounded-lg border",
                    histEntry.action === "reject" || histEntry.action === "rejected"
                      ? "bg-red-50 border-red-100"
                      : "bg-emerald-50 border-emerald-100"
                  )}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700">
                          {histEntry.action === "reject" || histEntry.action === "rejected"
                            ? "Rejected"
                            : histEntry.action === "forward" || histEntry.action === "approved"
                            ? "Approved & Forwarded"
                            : "Approved"}
                          <span className="ml-1.5 font-normal text-slate-500">
                            by {histEntry.by}
                          </span>
                        </p>
                        {histEntry.remarks && (
                          <p className="text-[11px] text-slate-500 mt-1 italic leading-relaxed">
                            "{histEntry.remarks}"
                          </p>
                        )}
                      </div>
                      {histEntry.timestamp && (
                        <p className="text-[10px] text-slate-400 font-mono whitespace-nowrap shrink-0">
                          {fmtDate(histEntry.timestamp)}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Active / pending placeholder */}
                {isActive && !histEntry && (
                  <div className="mt-2 px-3 py-2.5 rounded-lg border border-dashed border-slate-200 bg-slate-50/60">
                    <p className="text-[11px] text-slate-400 italic">
                      Pending review by{" "}
                      {stage.key === "da" ? "Dealing Assistant"
                      : stage.key === "ar" ? "Accounts Representative"
                      : "Director"}
                    </p>
                  </div>
                )}

                {isPending && !histEntry && (
                  <div className="mt-2 px-3 py-2 rounded-lg border border-dashed border-slate-100">
                    <p className="text-[11px] text-slate-300 italic">
                      Awaiting earlier stage completion
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Final outcome banner ── */}
      {(status === "approved" || status === "rejected") && (
        <div className={cn(
          "mt-2 p-4 rounded-xl border-2 flex items-center gap-3",
          status === "approved"
            ? "bg-emerald-50 border-emerald-300"
            : "bg-red-50 border-red-300"
        )}>
          {status === "approved" ? (
            <>
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  Budget Request Approved
                </p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  All stages completed · Utilization Certificate can now be generated
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <XCircle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-red-800">
                  Budget Request Rejected
                </p>
                <p className="text-xs text-red-500 mt-0.5">
                  Please review the remarks above and resubmit if necessary
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};