// components/ApprovalTimeline.tsx
// Dynamic timeline — works for BOTH chains:
//   ≤ ₹25,000  → PI → DA → AR → DR
//   > ₹25,000  → PI → DA → AR → DR → DRC Office → DRC (R&C) → DRC → Director

import {
  CheckCircle2, Clock, Circle,
  FileText, UserCheck, Briefcase, Award,
  Building2, FlaskConical, Users, Star,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DR_THRESHOLD = 25000;
const DRC_STAGES   = new Set(["drc_office", "drc_rc", "drc", "director"]);
const DRC_STATUSES = new Set([
  "dr_approved", "drc_office_forwarded", "sent_back_to_drc_office",
  "drc_rc_forwarded", "sent_back_to_drc_rc",
  "drc_forwarded", "sent_back_to_drc",
]);

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
  amount?: number;
  /** @deprecated kept for backward compat */
  showEmojis?: boolean;
}

// ── All stage definitions ─────────────────────────────────────────────────────
const STAGE_DEFS: Record<string, {
  label: string; sublabel: string;
  Icon: React.ComponentType<{ className?: string }>;
  activeColor: string; activeBg: string; activePing: string; activeRing: string;
}> = {
  pi: {
    label: "PI Submitted", sublabel: "Budget request created",
    Icon: FileText,
    activeColor: "text-sky-600",    activeBg: "bg-sky-50 border-sky-300",
    activePing:  "bg-sky-500",      activeRing: "ring-sky-100",
  },
  da: {
    label: "DA Processed", sublabel: "Dealing Assistant review",
    Icon: UserCheck,
    activeColor: "text-violet-600", activeBg: "bg-violet-50 border-violet-300",
    activePing:  "bg-violet-500",   activeRing: "ring-violet-100",
  },
  ar: {
    label: "AR Recommended", sublabel: "Assistant Registrar approval",
    Icon: Briefcase,
    activeColor: "text-amber-600",  activeBg: "bg-amber-50 border-amber-300",
    activePing:  "bg-amber-500",    activeRing: "ring-amber-100",
  },
  dr: {
    label: "DR",           sublabel: "Deputy Registrar",
    Icon: Award,
    activeColor: "text-purple-600", activeBg: "bg-purple-50 border-purple-300",
    activePing:  "bg-purple-500",   activeRing: "ring-purple-100",
  },
  drc_office: {
    label: "DRC Office", sublabel: "DRC Office review",
    Icon: Building2,
    activeColor: "text-cyan-600",   activeBg: "bg-cyan-50 border-cyan-300",
    activePing:  "bg-cyan-500",     activeRing: "ring-cyan-100",
  },
  drc_rc: {
    label: "DRC (R&C)", sublabel: "Research & Committee review",
    Icon: FlaskConical,
    activeColor: "text-teal-600",   activeBg: "bg-teal-50 border-teal-300",
    activePing:  "bg-teal-500",     activeRing: "ring-teal-100",
  },
  drc: {
    label: "DRC", sublabel: "DRC final evaluation",
    Icon: Users,
    activeColor: "text-indigo-600", activeBg: "bg-indigo-50 border-indigo-300",
    activePing:  "bg-indigo-500",   activeRing: "ring-indigo-100",
  },
  director: {
    label: "Director", sublabel: "Director final approval",
    Icon: Star,
    activeColor: "text-violet-700", activeBg: "bg-violet-50 border-violet-400",
    activePing:  "bg-violet-600",   activeRing: "ring-violet-100",
  },
};

const LOW_CHAIN  = ["pi", "da", "ar", "dr"];
const HIGH_CHAIN = ["pi", "da", "ar", "dr", "drc_office", "drc_rc", "drc", "director"];

function detectChain(
  amount: number | undefined,
  currentStage: string,
  status: string,
  history: ApprovalHistoryItem[]
): string[] {
  if (amount !== undefined && amount !== null) {
    return amount > DR_THRESHOLD ? HIGH_CHAIN : LOW_CHAIN;
  }
  if (DRC_STAGES.has(currentStage)) return HIGH_CHAIN;
  if (DRC_STATUSES.has(status))     return HIGH_CHAIN;
  if (history.some(h => DRC_STAGES.has(h.stage))) return HIGH_CHAIN;
  return LOW_CHAIN;
}

function resolveStatus(
  stageKey: string,
  chain: string[],
  currentStage: string,
  status: string,
  history: ApprovalHistoryItem[]
): "done" | "active" | "sentback" | "pending" {
  if (stageKey === "pi") return "done";

  const entry = history.find(h => h.stage === stageKey);
  if (entry) {
    if (entry.action === "sent_back" || entry.action === "sendback") return "sentback";
    return "done";
  }

  if (status === "approved") return "done";

  const stageIdx   = chain.indexOf(stageKey);
  const currentIdx = chain.indexOf(currentStage);

  if (stageKey === currentStage) return "active";
  if (stageIdx < currentIdx)     return "done";
  return "pending";
}

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    approve: "Approved & Forwarded", approved: "Approved & Forwarded",
    forward: "Approved & Forwarded", forwarded: "Approved & Forwarded",
    sent_back: "Sent Back", sendback: "Sent Back",
    submitted: "Submitted",
  };
  return map[action] ?? (action.charAt(0).toUpperCase() + action.slice(1));
}

const fmtDate = (d?: string) => {
  if (!d) return null;
  try {
    return new Date(d).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  } catch { return d; }
};

// ═════════════════════════════════════════════════════════════════════════════
export const ApprovalTimeline = ({
  approvalHistory = [],
  currentStage,
  status,
  createdAt,
  piName,
  amount,
}: ApprovalTimelineProps) => {

  const chain       = detectChain(amount, currentStage, status, approvalHistory);
  const isHighChain = chain.length > 4;

  const stages = chain.map(key => {
    const def = { ...STAGE_DEFS[key] };
    if (key === "dr") {
      def.label    = isHighChain ? "DR — Forward to DRC" : "DR Approved";
      def.sublabel = isHighChain ? "Forwarded to DRC Office" : "Deputy Registrar final approval";
    }
    return { key, ...def };
  });

  return (
    <div className="py-2">

      {/* Title bar */}
      <div className="flex items-center gap-2 mb-6">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-slate-400 px-3 flex items-center gap-2">
          Approval Workflow
          {isHighChain && (
            <span className="text-[9px] bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full normal-case font-medium">
              &gt; ₹25k chain
            </span>
          )}
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent via-slate-200 to-transparent" />
      </div>

      {/* Stages */}
      <div className="relative">
        {stages.map((stage, idx) => {
          const st      = resolveStatus(stage.key, chain, currentStage, status, approvalHistory);
          const entry   = approvalHistory.find(h => h.stage === stage.key);
          const isLast  = idx === stages.length - 1;
          const isDone  = st === "done";
          const isAct   = st === "active";
          const isSBack = st === "sentback";
          const isPend  = st === "pending";

          const nextSt = !isLast
            ? resolveStatus(stages[idx + 1].key, chain, currentStage, status, approvalHistory)
            : null;

          return (
            <div key={stage.key} className="flex gap-0">

              {/* Circle + connector */}
              <div className="flex flex-col items-center w-14 flex-shrink-0">
                <div className={cn(
                  "w-12 h-12 rounded-full border-2 flex items-center justify-center shadow-sm z-10 transition-all duration-300",
                  isDone  && "bg-emerald-50 border-emerald-300",
                  isAct   && cn(stage.activeBg, "shadow-md ring-4 ring-offset-2", stage.activeRing),
                  isSBack && "bg-orange-50 border-orange-300",
                  isPend  && "bg-slate-50 border-slate-200",
                )}>
                  {isDone  && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                  {isAct   && (
                    <div className="relative">
                      <stage.Icon className={cn("h-5 w-5", stage.activeColor)} />
                      <span className={cn("absolute -top-1 -right-1 w-2 h-2 rounded-full animate-ping opacity-75", stage.activePing)} />
                      <span className={cn("absolute -top-1 -right-1 w-2 h-2 rounded-full", stage.activePing)} />
                    </div>
                  )}
                  {isSBack && <RotateCcw className="h-5 w-5 text-orange-500" />}
                  {isPend  && <Circle    className="h-5 w-5 text-slate-300" />}
                </div>

                {!isLast && (
                  <div className={cn(
                    "w-0.5 flex-1 my-1 min-h-[2rem] rounded-full transition-colors duration-500",
                    isDone && nextSt === "done" ? "bg-emerald-300"
                    : isDone                    ? "bg-gradient-to-b from-emerald-300 to-slate-200"
                    : isAct                     ? "bg-gradient-to-b from-slate-300 to-slate-100"
                    :                             "bg-slate-100"
                  )} />
                )}
              </div>

              {/* Content */}
              <div className={cn("flex-1 ml-4 pb-8", isLast && "pb-2")}>

                {/* Stage header */}
                <div className="flex items-start justify-between gap-3 mb-1.5 pt-2.5">
                  <div>
                    <h4 className={cn(
                      "text-sm font-semibold leading-tight",
                      isDone  && "text-emerald-700",
                      isAct   && stage.activeColor,
                      isSBack && "text-orange-700",
                      isPend  && "text-slate-400",
                    )}>
                      {stage.label}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{stage.sublabel}</p>
                  </div>

                  <span className={cn(
                    "text-[10px] font-semibold tracking-wide uppercase px-2.5 py-1 rounded-full whitespace-nowrap",
                    isDone  && "bg-emerald-100 text-emerald-700",
                    isAct   && "bg-amber-100 text-amber-700 animate-pulse",
                    isSBack && "bg-orange-100 text-orange-700",
                    isPend  && "bg-slate-100 text-slate-400",
                  )}>
                    {isDone  && "✓ Complete"}
                    {isAct   && "● In Progress"}
                    {isSBack && "↩ Sent Back"}
                    {isPend  && "Awaiting"}
                  </span>
                </div>

                {/* PI special card */}
                {stage.key === "pi" && (
                  <div className="mt-2 px-3 py-2.5 rounded-lg bg-sky-50 border border-sky-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-sky-800">{piName || "Principal Investigator"}</p>
                        <p className="text-[11px] text-sky-500 mt-0.5">Submitted budget booking request</p>
                      </div>
                      {createdAt && (
                        <p className="text-[10px] text-sky-400 font-mono">{fmtDate(createdAt)}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* History entry */}
                {entry && (
                  <div className={cn(
                    "mt-2 px-3 py-2.5 rounded-lg border",
                    isSBack ? "bg-orange-50 border-orange-100" : "bg-emerald-50 border-emerald-100"
                  )}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700">
                          {actionLabel(entry.action)}
                          <span className="ml-1.5 font-normal text-slate-500">by {entry.by}</span>
                        </p>
                        {entry.remarks && (
                          <p className="text-[11px] text-slate-500 mt-1 italic leading-relaxed">
                            "{entry.remarks}"
                          </p>
                        )}
                      </div>
                      {entry.timestamp && (
                        <p className="text-[10px] text-slate-400 font-mono whitespace-nowrap shrink-0">
                          {fmtDate(entry.timestamp)}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Active placeholder */}
                {isAct && !entry && (
                  <div className="mt-2 px-3 py-2.5 rounded-lg border border-dashed border-slate-200 bg-slate-50/60">
                    <p className="text-[11px] text-slate-400 italic">
                      Pending review by {stage.label}
                    </p>
                  </div>
                )}

                {/* Pending placeholder */}
                {isPend && !entry && (
                  <div className="mt-2 px-3 py-2 rounded-lg border border-dashed border-slate-100">
                    <p className="text-[11px] text-slate-300 italic">Awaiting earlier stage completion</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Final outcome banner */}
      {status === "approved" && (
        <div className="mt-2 p-4 rounded-xl border-2 flex items-center gap-3 bg-emerald-50 border-emerald-300">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-800">Budget Request Approved</p>
            <p className="text-xs text-emerald-600 mt-0.5">All stages completed · Booking confirmed</p>
          </div>
        </div>
      )}
    </div>
  );
};