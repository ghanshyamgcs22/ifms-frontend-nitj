// components/RequestViewDetail.tsx
// Layout:
//   1. Dark header card (request meta)
//   2. Query banner (if any)
//   3. Purchase details (read-only)
//      └─ includes 7(b) Availability of Funds — editable by AR / DR only
//      └─ Quotation file viewer
//   4. Movement History timeline
//      └─ Each stage row shows:
//         • Remarks (visible to same-stage and all later stages only)
//         • Any query raised by this stage → shown inline with PI's reply
//         • Sent-back remarks inline
// Visibility rule: viewer can see remarks from ALL stages BEFORE their position
//                  but CANNOT see remarks from stages AFTER their position.

import { useState } from "react";
import {
  FileText, Eye, ExternalLink, Pencil, Lock, CheckCircle2,
  AlertTriangle, Clock, Circle, RotateCcw, ArrowRight,
  MessageCircleQuestion, CornerDownRight, MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ApprovalHistoryItem {
  stage: string;
  action: string;
  by: string;
  timestamp: string;
  remarks?: string;
  label?: string;
}

export interface QueryItem {
  /** Which stage raised this query (e.g. "drc", "ar") */
  raisedByStage: string;
  raisedByLabel?: string;
  query: string;
  raisedAt?: string;
  resolved: boolean;
  piResponse?: string;
  piRespondedAt?: string;
}

export interface RequestDetailData {
  id: string;
  requestNumber?: string;
  gpNumber?: string;
  fileNumber?: string;
  projectTitle?: string;
  piName?: string;
  department?: string;
  headName?: string;
  headType?: string;
  projectType?: string;
  amount?: number;
  totalSanctionedAmount?: number;
  headBookedAmount?: number; // Added this
  invoiceNumber?: string;
  createdAt?: string;
  projectEndDate?: string;
  purpose?: string;
  description?: string;
  material?: string;
  expenditure?: string;
  mode?: string;
  quotationFile?: string;
  quotationFileName?: string;
  daRemarks?: string;
  arRemarks?: string;
  drRemarks?: string;
  drcOfficeRemarks?: string;
  drcRcRemarks?: string;
  drcRemarks?: string;
  directorRemarks?: string;
  currentStage: string;
  status: string;
  approvalHistory?: ApprovalHistoryItem[];
  /**
   * All queries ever raised on this request.
   * Each query is tied to the stage that raised it (raisedByStage).
   */
  queries?: QueryItem[];
  /**
   * @deprecated use `queries` array instead.
   * Kept for backward compat — treated as a single query from unknown stage.
   */
  latestQuery?: {
    query: string;
    raisedBy: string;
    raisedByLabel?: string;
    raisedAt?: string;
    resolved: boolean;
    piResponse?: string;
    piRespondedAt?: string;
  } | null;
  headSanctionedAmount?: number;
}

interface RequestViewDetailProps {
  request: RequestDetailData;
  viewerStage: string;
  onFieldSaved?: (updates: { expenditure?: string; mode?: string }) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const API = import.meta.env.VITE_API_URL;
const DR_THRESHOLD = 25_000;

const FULL_CHAIN = ["pi", "da", "ar", "dr", "drc_office", "drc_rc", "drc", "director"];
const LOW_CHAIN  = ["pi", "da", "ar", "dr"];

const STAGE_META: Record<string, { label: string; role: string; color: string; dot: string }> = {
  pi:         { label: "PI",         role: "Principal Investigator", color: "bg-sky-100 text-sky-700 border-sky-200",         dot: "bg-sky-500" },
  da:         { label: "DA",         role: "Dealing Assistant",      color: "bg-violet-100 text-violet-700 border-violet-200", dot: "bg-violet-500" },
  ar:         { label: "AR",         role: "Assistant Registrar",    color: "bg-amber-100 text-amber-700 border-amber-200",    dot: "bg-amber-500" },
  dr:         { label: "DR",         role: "Deputy Registrar",       color: "bg-purple-100 text-purple-700 border-purple-200", dot: "bg-purple-500" },
  drc_office: { label: "DRC Office", role: "DRC Office",             color: "bg-cyan-100 text-cyan-700 border-cyan-200",       dot: "bg-cyan-500" },
  drc_rc:     { label: "DR (R&C)",  role: "Research & Committee",   color: "bg-teal-100 text-teal-700 border-teal-200",       dot: "bg-teal-500" },
  drc:        { label: "DRC",        role: "DRC Final",              color: "bg-indigo-100 text-indigo-700 border-indigo-200", dot: "bg-indigo-500" },
  director:   { label: "Director",   role: "Director",               color: "bg-rose-100 text-rose-700 border-rose-200",       dot: "bg-rose-500" },
};

// Only AR and DR can edit 7(b) expenditure
const POINT7B_STAGES = new Set(["ar", "dr"]);

// ── Helpers ───────────────────────────────────────────────────────────────────

function detectChain(
  amount: number | undefined,
  currentStage: string,
  status: string,
  history: ApprovalHistoryItem[]
): string[] {
  if (amount !== undefined && amount !== null)
    return amount > DR_THRESHOLD ? FULL_CHAIN : LOW_CHAIN;
  const drcSet = new Set(["drc_office", "drc_rc", "drc", "director"]);
  if (drcSet.has(currentStage)) return FULL_CHAIN;
  if (history.some(h => drcSet.has(h.stage))) return FULL_CHAIN;
  return LOW_CHAIN;
}

const fmtDateTime = (d?: string) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  } catch { return d; }
};

const fmtDate = (d?: string | null) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return d; }
};

const fmtAmount = (n?: number | null) =>
  (n === null || n === undefined) ? "—" : `₹${Number(n).toLocaleString("en-IN")}`;

const actionLabel = (action: string) => {
  const map: Record<string, string> = {
    approve: "Approved & Forwarded", approved: "Approved & Forwarded",
    forward: "Approved & Forwarded", forwarded: "Approved & Forwarded",
    sent_back: "Sent Back", sendback: "Sent Back",
    submitted: "Submitted",
  };
  return map[action] ?? (action.charAt(0).toUpperCase() + action.slice(1));
};

// ── Sub-component: read-only detail field ─────────────────────────────────────

const DetailField = ({
  label, value, mono = false, multiline = false, tag,
}: {
  label: string; value?: string; mono?: boolean; multiline?: boolean;
  tag?: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <div className="flex items-center gap-2 flex-wrap">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      {tag}
    </div>
    {value?.trim() ? (
      <p className={`text-sm text-slate-800 leading-relaxed ${mono ? "font-mono" : ""} ${multiline ? "whitespace-pre-wrap" : ""}`}>
        {value}
      </p>
    ) : (
      <p className="text-sm text-slate-400 italic">Not entered</p>
    )}
  </div>
);

// ── Sub-component: inline query bubble shown inside a timeline row ────────────
// Shows the query raised by this stage + PI's reply (if any)

const InlineQueryBubble = ({
  queryItem,
  piName,
}: {
  queryItem: QueryItem;
  piName?: string;
}) => (
  <div className="mt-2 space-y-1.5">
    {/* Query raised by this stage */}
    <div className="flex items-start gap-1.5">
      <div className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center">
        <MessageCircleQuestion className="h-3 w-3 text-amber-600" />
      </div>
      <div className="flex-1 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">
            Query raised to PI
          </span>
          {queryItem.raisedAt && (
            <span className="text-[10px] text-amber-500">{fmtDateTime(queryItem.raisedAt)}</span>
          )}
        </div>
        <p className="text-[11px] text-slate-700 italic leading-relaxed">"{queryItem.query}"</p>
        {!queryItem.resolved && (
          <span className="inline-block mt-1 text-[10px] font-semibold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">
            ● Awaiting PI response
          </span>
        )}
      </div>
    </div>

    {/* PI's reply */}
    {queryItem.resolved && queryItem.piResponse && (
      <div className="flex items-start gap-1.5 pl-4">
        <div className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-sky-100 border border-sky-300 flex items-center justify-center">
          <CornerDownRight className="h-3 w-3 text-sky-600" />
        </div>
        <div className="flex-1 bg-sky-50 border border-sky-200 rounded-lg px-2.5 py-2">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
            <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wide">
              PI Response — {piName || "Principal Investigator"}
            </span>
            {queryItem.piRespondedAt && (
              <span className="text-[10px] text-sky-500">{fmtDateTime(queryItem.piRespondedAt)}</span>
            )}
          </div>
          <p className="text-[11px] text-slate-700 italic leading-relaxed">"{queryItem.piResponse}"</p>
          <span className="inline-block mt-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
            ✓ Resolved
          </span>
        </div>
      </div>
    )}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const RequestFullDetail = ({ request, viewerStage, onFieldSaved }: RequestViewDetailProps) => {
  const history = request.approvalHistory ?? [];
  const chain   = detectChain(request.amount, request.currentStage, request.status, history);

  // Viewer's index in the chain — used to enforce visibility rules
  const viewerIdx  = chain.indexOf(viewerStage);
  const currentIdx = chain.indexOf(request.currentStage);
  const isHighChain = chain.length > 4;

  // ── Normalise queries: merge legacy `latestQuery` into `queries` array ──
  const allQueries: QueryItem[] = [...(request.queries ?? [])];
  if (request.latestQuery && allQueries.length === 0) {
    // Back-compat: treat latestQuery as raised by whichever stage is after pi
    allQueries.push({
      raisedByStage: request.latestQuery.raisedBy ?? "unknown",
      raisedByLabel: request.latestQuery.raisedByLabel,
      query:         request.latestQuery.query,
      raisedAt:      request.latestQuery.raisedAt,
      resolved:      request.latestQuery.resolved,
      piResponse:    request.latestQuery.piResponse,
      piRespondedAt: (request.latestQuery as any).piRespondedAt,
    });
  }

  // Build a map: stageKey → QueryItem[] so we can render them in the correct row
  const queriesByStage: Record<string, QueryItem[]> = {};
  for (const q of allQueries) {
    if (!queriesByStage[q.raisedByStage]) queriesByStage[q.raisedByStage] = [];
    queriesByStage[q.raisedByStage].push(q);
  }

  // ── PDF viewer ──
  const [showPdf, setShowPdf] = useState(false);
  const [pdfUrl,  setPdfUrl]  = useState<string | null>(null);

  // ── 7(b) expenditure edit ──
  const canEdit7b  = POINT7B_STAGES.has(viewerStage);
  const [edit7b,   setEdit7b]   = useState(false);
  const [expVal,   setExpVal]   = useState(request.expenditure ?? "");
  const [saving7b, setSaving7b] = useState(false);
  const [liveExp,  setLiveExp]  = useState(request.expenditure ?? "");

  // ── File viewer ──
  const handleViewFile = async () => {
    if (request.quotationFile) {
      try {
        let dataUrl = request.quotationFile;
        if (!dataUrl.startsWith("data:")) dataUrl = `data:application/pdf;base64,${dataUrl}`;
        const blob    = await (await fetch(dataUrl)).blob();
        const blobUrl = URL.createObjectURL(blob);
        if (pdfUrl) URL.revokeObjectURL(pdfUrl);
        setPdfUrl(blobUrl);
        setShowPdf(v => !v);
      } catch { toast.error("Could not open the file."); }
      return;
    }
    // Use env variable — never hardcode localhost
    window.open(`${API}/download-file.php?requestId=${request.id}&type=quotation`, "_blank");
  };

  // ── Save 7(b) ──
  const save7b = async () => {
    setSaving7b(true);
    try {
      const res  = await fetch(`${API}/update-request-fields.php`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: request.id, stage: viewerStage, expenditure: expVal }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setLiveExp(expVal);
      toast.success("Availability of Funds saved.");
      onFieldSaved?.({ expenditure: expVal });
      setEdit7b(false);
    } catch (e: any) { toast.error(e.message || "Save failed"); }
    finally { setSaving7b(false); }
  };

  // ── Remarks map (from request fields, fallback) ─────────────────────────────
  const remarksMap: Record<string, string | undefined> = {
    pi:         undefined,
    da:         request.daRemarks,
    ar:         request.arRemarks,
    dr:         request.drRemarks,
    drc_office: request.drcOfficeRemarks,
    drc_rc:     request.drcRcRemarks,
    drc:        request.drcRemarks,
    director:   request.directorRemarks,
  };

  // ── TIMELINE rows ──────────────────────────────────────────────────────────
  // We now show EVERY movement in the history as its own row (CHRONOLOGICAL)
  // Plus any upcoming stages from the chain that haven't been reached yet.
  
  const historyRows = history.map((entry, hIdx) => {
    const stageKey = entry.stage;
    const meta     = STAGE_META[stageKey] ?? { label: stageKey, role: stageKey, color: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" };
    
    // Visibility: 
    // - standard approval: same or later stages in chain can see
    // - special: query/sendback actions are visible to ALL
    const isSpecialAction = entry.action === "sent_back" || entry.action === "sendback" || entry.action.includes("query");
    const stageIdxInChain = chain.indexOf(stageKey);
    const canSeeRemarks   = viewerIdx === -1 || stageIdxInChain <= viewerIdx || isSpecialAction;
    
    const stageRemarks = entry.remarks;
    const stageQueries = (queriesByStage[stageKey] ?? []).filter(q => {
       // Queries are special — visible to all if they are for PI
       return true; 
    });

    const isSentBackRow = entry.action === "sent_back" || entry.action === "sendback";
    
    return { 
      type: "history" as const,
      stageKey, meta, entry, 
      rowStatus: isSentBackRow ? "sentback" : "done" as any, 
      canSeeRemarks, stageRemarks, stageQueries, isSentBackRow, 
      idx: hIdx 
    };
  });

  // Upcoming stages: stages in the chain that are AFTER the currentStage
  const pendingRows = chain.slice(currentIdx + 1).map((stageKey, pIdx) => {
    const meta = STAGE_META[stageKey] ?? { label: stageKey, role: stageKey, color: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" };
    return {
      type: "pending" as const,
      stageKey, meta, entry: null,
      rowStatus: "pending" as any,
      canSeeRemarks: false,
      stageRemarks: undefined,
      stageQueries: [],
      isSentBackRow: false,
      idx: historyRows.length + pIdx
    };
  });

  // Combine them: History first, then Pending
  const timelineRows = [...historyRows, ...pendingRows];
  
  // Note: if the request is active at currentStage, ensure the currentStage is represented correctly.
  // Actually, 'history' contains past actions. The current state is usually where the request IS.
  // If the last history item is NOT the current stage, we might need an 'active' row.
  if (request.status !== "approved" && request.status !== "rejected") {
    // Current stage row (Active)
    const activeStageKey = request.currentStage;
    const meta = STAGE_META[activeStageKey];
    // We insert it between history and pending if it's not already the last history item
    const lastHistoryStage = history.length > 0 ? history[history.length - 1].stage : null;
    
    if (lastHistoryStage !== activeStageKey || (history.length > 0 && history[history.length-1].action === "sent_back")) {
       // Add an active row
       const activeRow = {
         type: "active" as const,
         stageKey: activeStageKey,
         meta,
         entry: null,
         rowStatus: "active" as any,
         canSeeRemarks: true,
         stageRemarks: remarksMap[activeStageKey],
         stageQueries: queriesByStage[activeStageKey] ?? [],
         isSentBackRow: false,
         idx: historyRows.length
       };
       // Splice it in
       timelineRows.splice(historyRows.length, 0, activeRow);
    }
  }

  // ── Active query banner data (unresolved, for banner at top) ───────────────
  const activeQuery = allQueries.find(q => !q.resolved) ?? null;

  const colorMap = {
    emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", textDim: "text-emerald-400/80", textBr: "text-emerald-400/90" },
    red: { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", textDim: "text-red-400/80", textBr: "text-red-400/90" },
    orange: { bg: "bg-orange-500/10", border: "border-orange-500/20", text: "text-orange-400", textDim: "text-orange-400/80", textBr: "text-orange-400/90" },
    amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", textDim: "text-amber-400/80", textBr: "text-amber-400/90" },
    blue: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", textDim: "text-blue-400/80", textBr: "text-blue-400/90" }
  };

  const scheme = request.status === "approved" ? colorMap.emerald
    : request.status === "rejected" ? colorMap.red
    : request.status?.includes("sent_back") || request.status?.includes("sendback") ? colorMap.orange
    : colorMap.amber;

  return (
    <div className="space-y-4 font-sans">

      {/* ══ 1. HEADER CARD ══════════════════════════════════════════════════ */}
      <div className="rounded-2xl bg-slate-900 overflow-hidden shadow-lg">
        {/* Top bar */}
        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <FileText className="h-4 w-4 text-white/80" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Budget Request</p>
                <p className="text-white font-bold text-sm font-mono">{request.requestNumber || "—"}</p>
              </div>
            </div>
            <span className={`text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wide ${
              request.status === "approved"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : request.status === "rejected"
                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : request.status?.includes("sent_back") || request.status?.includes("sendback")
                ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
            }`}>
              {request.status === "approved" ? "✓ Approved"
                : request.status === "rejected" ? "✕ Rejected"
                : request.status?.includes("sent_back") ? "↩ Sent Back"
                : activeQuery ? "● Query Raised"
                : "● In Progress"}
            </span>
          </div>
        </div>

        {/* File / GP / Project Type row — Budget Head & Head Type moved to Allocation card below */}
        <div className="grid grid-cols-3 gap-px bg-white/5">
          {[
            ["File No.",     request.fileNumber],
            ["GP Number",    request.gpNumber],
            ["Project Type", request.projectType],
          ].map(([l, v]) => (
            <div key={l} className="bg-slate-900 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{l}</p>
              <p className="text-white font-bold text-sm mt-0.5 font-mono">{v || "—"}</p>
            </div>
          ))}
        </div>

        {/* Project + PI */}
        <div className="px-5 py-4 space-y-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Project Name</p>
            <p className="text-white font-semibold text-sm mt-0.5 leading-snug">{request.projectTitle || "—"}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Principal Investigator</p>
              <p className="text-white font-semibold text-sm mt-0.5">{request.piName || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Department</p>
              <p className="text-white font-semibold text-sm mt-0.5">{request.department || "—"}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Total Sanctioned Amount of Project</p>
              <p className="text-emerald-400 font-bold text-base mt-0.5 font-mono">{fmtAmount(request.totalSanctionedAmount)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Project Completion Date</p>
              <p className="text-white font-semibold text-sm mt-0.5">{fmtDate(request.projectEndDate)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ══ 2. ALLOCATION HEAD DETAIL CARD (matches Budget Request header) ══ */}
      <div className="rounded-2xl overflow-hidden shadow-lg border border-white/10 mt-2 bg-slate-900">
        {/* Card header row */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-white/10">
          <div className={`w-8 h-8 rounded-lg ${scheme.bg} flex items-center justify-center border ${scheme.border} shrink-0`}>
            <RotateCcw className={`h-4 w-4 ${scheme.text}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${scheme.textDim}`}>Allocation Head</p>
            <p className="text-white font-bold text-base leading-tight truncate">{request.headName || "—"}</p>
          </div>
          {/* Head Type badge */}
          <span className={`shrink-0 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border ${scheme.bg} ${scheme.text} ${scheme.border}`}>
            {request.headType || "—"}
          </span>
        </div>

        {/* Amounts grid */}
        <div className="grid grid-cols-3 divide-x divide-white/10">
          {/* Requested Amount — most prominent */}
          <div className="px-5 py-4 col-span-1">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300/70 mb-1">Requested Amount</p>
            <p className={`font-black text-2xl font-mono leading-none ${scheme.text}`}>{fmtAmount(request.amount)}</p>
            <p className="text-[10px] text-blue-200/50 mt-1 font-medium">For this request</p>
          </div>

          <div className="px-5 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">Head Booked</p>
            <p className="text-white font-black text-xl font-mono leading-none">{fmtAmount(request.headBookedAmount)}</p>
            <p className="text-[10px] text-slate-500 mt-1">Total booked under head</p>
          </div>

          <div className="px-5 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">Sanction Limit</p>
            <p className={`${scheme.textBr} font-black text-xl font-mono leading-none`}>{fmtAmount(request.headSanctionedAmount)}</p>
            <p className="text-[10px] text-slate-500 mt-1">Max allowed for head</p>
          </div>
        </div>
      </div>

      {/* ══ 2. QUERY BANNER (active unresolved query only) ══════════════════ */}
      {activeQuery && (
        <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-amber-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900 leading-tight">
                Clarification Required — Open Query
              </p>
              <p className="text-[11px] text-amber-600 mt-0.5">
                Raised by{" "}
                <span className="font-semibold">
                  {activeQuery.raisedByLabel
                    || STAGE_META[activeQuery.raisedByStage]?.label
                    || activeQuery.raisedByStage}
                </span>
                {activeQuery.raisedAt && <> on {fmtDateTime(activeQuery.raisedAt)}</>}
              </p>
            </div>
          </div>
          <div className="bg-white/80 p-3 rounded-xl border border-amber-200">
            <p className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-1">Query Description:</p>
            <p className="text-sm text-slate-800 font-medium italic">"{activeQuery.query}"</p>
          </div>
          <p className="text-[11px] text-amber-700 font-medium italic">
            * Please respond to this query to proceed with the approval process.
          </p>
        </div>
      )}
      {/* Resolved query summary banner */}
      {allQueries.filter(q => q.resolved && q.piResponse).map((q, i) => (
        <div key={i} className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
          <p className="text-xs font-semibold text-emerald-700 mb-1">
            ✓ Query Resolved — PI Response
            {q.raisedByLabel || STAGE_META[q.raisedByStage]?.label
              ? ` (raised by ${q.raisedByLabel || STAGE_META[q.raisedByStage]?.label})`
              : ""}:
          </p>
          <p className="text-sm text-emerald-900 italic">"{q.piResponse}"</p>
        </div>
      ))}

      {/* ══ 3. PURCHASE DETAILS ═════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        {/* Section header */}
        <div className="px-5 py-3.5 bg-slate-800 flex items-center gap-2.5">
          <FileText className="h-4 w-4 text-slate-400" />
          <span className="text-white text-xs font-bold tracking-wide uppercase">Purchase Details</span>
        </div>

        <div className="px-5 py-5 space-y-5">

          {/* Purpose */}
          <DetailField label="Purpose" value={request.purpose} />

          {/* Detailed Description */}
          <DetailField label="Detailed Description" value={request.description} multiline />

          {/* Invoice */}
          <DetailField label="Invoice / Bill Number" value={request.invoiceNumber} mono />

          {/* Total Amount */}
          <DetailField label="Total Amount Involved in Purchase" value={fmtAmount(request.amount)} mono />

          {/* Material */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Name of Material &amp; Quantity
              </p>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-slate-100 text-slate-500 border-slate-200">
                Locked after submission
              </span>
            </div>
            {(request.material ?? "").trim() ? (
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{request.material}</p>
            ) : (
              <p className="text-sm text-slate-400 italic">Not entered</p>
            )}
          </div>

          {/* Mode of Procurement */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Mode of Procurement
              </p>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-teal-50 text-teal-700 border-teal-200">
                DRC R&amp;C / DRC may update
              </span>
            </div>
            {(request.mode ?? "").trim() ? (
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{request.mode}</p>
            ) : (
              <p className="text-sm text-slate-400 italic">Not entered</p>
            )}
          </div>

          {/* ── 7(b) Availability of Funds — editable by AR / DR only ── */}
          <div className={`rounded-xl border ${canEdit7b ? "border-blue-200 bg-blue-50/40 p-3" : "border-slate-100 bg-slate-50/40 p-3"}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                (B) Availability of Funds &amp; Head of Expenditure
              </p>
              {canEdit7b && !edit7b && (
                <button
                  type="button"
                  onClick={() => { setExpVal(liveExp); setEdit7b(true); }}
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg border border-blue-300 bg-white text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <Pencil className="h-3 w-3" /> Edit
                </button>
              )}
              {canEdit7b && edit7b && (
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEdit7b(false)}
                    className="text-[11px] px-2.5 py-1 rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={save7b}
                    disabled={saving7b}
                    className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg border border-blue-400 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    {saving7b ? "Saving…" : "Save"}
                  </button>
                </div>
              )}
              {!canEdit7b && (
                <span className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Lock className="h-2.5 w-2.5" /> Read-only
                </span>
              )}
            </div>
            {edit7b ? (
              <textarea
                value={expVal}
                onChange={e => setExpVal(e.target.value)}
                rows={3}
                className="w-full border-2 border-blue-300 rounded-lg text-sm p-2 resize-none focus:outline-none focus:border-blue-400 bg-white"
              />
            ) : (
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {liveExp.trim() ? liveExp : <span className="text-slate-400 italic">Not entered</span>}
              </p>
            )}
            {canEdit7b && (
              <p className="text-[10px] text-blue-500 mt-1.5">✏️ Editable by <strong>AR</strong> and <strong>DR</strong> only</p>
            )}
          </div>

          {/* ── Quotation file ── */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700">Quotation / Supporting File</p>
                  <p className="text-[11px] text-slate-400">{request.quotationFileName || "Quotation.pdf"}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleViewFile}
                className="flex items-center gap-1.5 h-7 px-3 text-xs font-semibold border border-blue-300 text-blue-700 hover:bg-blue-50 rounded-lg transition-colors bg-white"
              >
                <Eye className="h-3 w-3" />
                {showPdf ? "Hide" : "View PDF"}
              </button>
            </div>
            {showPdf && pdfUrl && (
              <div>
                <div className="flex items-center justify-between px-4 py-2 bg-slate-100 border-t border-slate-200">
                  <p className="text-xs font-semibold text-slate-700">📄 Quotation Preview</p>
                  <div className="flex items-center gap-3">
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" /> Open in new tab
                    </a>
                    <button
                      type="button"
                      onClick={() => setShowPdf(false)}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      ✕ Close
                    </button>
                  </div>
                </div>
                <iframe src={pdfUrl} className="w-full" style={{ height: "420px" }} title="Quotation" />
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ══ 4. MOVEMENT HISTORY TIMELINE ════════════════════════════════════ */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">

        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clock className="h-4 w-4 text-slate-400" />
            <span className="text-white text-xs font-bold tracking-wide uppercase">Movement History</span>
          </div>
          <div className="flex items-center gap-2">
            {isHighChain && (
              <span className="text-[10px] bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full font-semibold">
                &gt; ₹25k chain
              </span>
            )}
            <span className="text-[10px] bg-slate-700 text-slate-400 border border-slate-600 px-2 py-0.5 rounded-full">
              You: {STAGE_META[viewerStage]?.label ?? viewerStage}
            </span>
          </div>
        </div>

        {/* Column header */}
        <div className="grid grid-cols-[auto_200px_1fr_150px_100px] bg-slate-50 border-b border-slate-200 px-4 py-2">
          <div className="w-8" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 pl-3">Stage & Sent By</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 pl-4">Remarks & Queries</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">Date & Time</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">Status</p>
        </div>

        {/* Rows */}
        <div className="bg-white divide-y divide-slate-100">
          {timelineRows.map(({ type, stageKey, meta, entry, rowStatus, canSeeRemarks, stageRemarks, stageQueries, isSentBackRow, idx }) => {
            const isLast    = idx === timelineRows.length - 1;
            const isDone    = rowStatus === "done";
            const isActive  = rowStatus === "active";
            const isSBack   = rowStatus === "sentback";
            const isPending = rowStatus === "pending";

            // Visibility override for special cases (sendback and queries)
            const isSpecialCase = isSBack || stageQueries.length > 0;
            const finalCanSeeRemarks = canSeeRemarks || isSpecialCase;

            const sentByName = stageKey === "pi" && type === "history" && idx === 0
              ? (request.piName || "Principal Investigator")
              : entry?.by || meta.role;

            const nextStageKey = !isLast ? (timelineRows[idx + 1].stageKey) : null;
            const nextMeta     = nextStageKey ? (STAGE_META[nextStageKey] ?? null) : null;

            const ts = type === "history"
              ? (stageKey === "pi" && idx === 0 ? fmtDateTime(request.createdAt) : fmtDateTime(entry?.timestamp))
              : "—";

            return (
              <div
                key={`${stageKey}-${idx}`}
                className={`transition-colors ${
                  isActive  ? "bg-amber-50/60"
                  : isSBack ? "bg-orange-50/40"
                  : isPending ? "bg-slate-50/40 opacity-60"
                  : ""
                }`}
              >
                {/* Main row */}
                <div className="grid grid-cols-[auto_200px_1fr_150px_100px] px-4 py-4 items-start">

                  {/* Circle + connector line */}
                  <div className="w-8 flex flex-col items-center pt-0.5">
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      isDone    ? "bg-emerald-50 border-emerald-300"
                      : isActive  ? "bg-amber-50 border-amber-400 ring-2 ring-amber-100"
                      : isSBack   ? "bg-orange-50 border-orange-300"
                      : "bg-slate-50 border-slate-200"
                    }`}>
                      {isDone    && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                      {isActive  && (
                        <div className="relative">
                          <div className={`w-2 h-2 rounded-full ${meta.dot} animate-ping absolute`} />
                          <div className={`w-2 h-2 rounded-full ${meta.dot}`} />
                        </div>
                      )}
                      {isSBack   && <RotateCcw className="h-3 w-3 text-orange-500" />}
                      {isPending && <Circle className="h-3.5 w-3.5 text-slate-300" />}
                    </div>
                    {!isLast && (
                      <div className={`w-0.5 mt-1 rounded-full flex-1 min-h-[20px] ${
                        isDone ? "bg-emerald-200" : isActive ? "bg-amber-200" : "bg-slate-100"
                      }`} />
                    )}
                  </div>

                  {/* Stage label + name */}
                  <div className="pl-3 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${meta.color}`}>
                        {meta.label}
                      </span>
                      {nextMeta && (isDone || isActive) && !isSBack && (
                        <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                          <ArrowRight className="h-2.5 w-2.5" />
                          <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${nextMeta.color}`}>
                            {nextMeta.label}
                          </span>
                        </span>
                      )}
                      {isSBack && (
                        <span className="flex items-center gap-0.5 text-[10px] text-orange-500">
                          <RotateCcw className="h-2.5 w-2.5" />
                          <span className="px-1.5 py-0.5 rounded border bg-sky-50 text-sky-700 border-sky-200 text-[10px] font-semibold">
                            {entry?.label?.split(" to ")[1]?.split(" by ")[0] || "PI"}
                          </span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-slate-800 mt-1.5 truncate">{sentByName}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-tight font-medium">{meta.role}</p>
                  </div>

                  {/* ── Separate Remarks Column ── */}
                  <div className="px-4">
                    {finalCanSeeRemarks && stageKey !== "pi" && (isDone || isSBack || isActive) && (
                      <div className="space-y-3">
                        {stageRemarks?.trim() ? (
                          <div className={`rounded-xl border p-3 border-dashed ${
                            isSBack
                              ? "bg-orange-50/50 border-orange-200"
                              : "bg-slate-50/50 border-slate-200"
                          }`}>
                            <div className="flex items-center gap-2 mb-1.5">
                              {isSBack ? (
                                <RotateCcw className="h-3 w-3 text-orange-500" />
                              ) : (
                                <MessageSquare className="h-3 w-3 text-slate-400" />
                              )}
                              <p className={`text-[10px] font-bold uppercase tracking-widest ${
                                isSBack ? "text-orange-600" : "text-slate-400"
                              }`}>
                                {isSBack ? "Sent-back Reason" : "Stage Remarks"}
                              </p>
                              {isSpecialCase && (
                                <span className="ml-auto text-[9px] font-bold bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                                  Public Visibility
                                </span>
                              )}
                            </div>
                            <p className="text-[12px] text-slate-700 italic leading-relaxed font-medium">
                              "{stageRemarks}"
                            </p>
                          </div>
                        ) : (isDone || isSBack) ? (
                          <p className="text-[11px] text-slate-400 italic">No formal remarks recorded</p>
                        ) : isActive ? (
                          <div className="flex items-center gap-2 text-amber-600">
                            <Clock className="h-3 w-3 animate-pulse" />
                            <p className="text-[11px] italic font-medium">Awaiting evaluation and remarks…</p>
                          </div>
                        ) : null}

                        {/* ── Inline queries raised by this stage ── */}
                        {stageQueries.map((q, qi) => (
                          <InlineQueryBubble key={qi} queryItem={q} piName={request.piName} />
                        ))}
                      </div>
                    )}
                    
                    {/* Restricted badge for future private stages */}
                    {!finalCanSeeRemarks && stageKey !== "pi" && (isDone || isSBack || isActive) && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50/50 border border-slate-100">
                        <Lock className="h-3 w-3 text-slate-300" />
                        <span className="text-[11px] text-slate-400 font-medium italic">Approval remarks are restricted for this stage level</span>
                      </div>
                    )}
                  </div>

                  {/* Date & Time */}
                  <div className="text-center px-2">
                    {ts && ts !== "—" ? (
                      <>
                        <p className="text-[12px] font-bold text-slate-800">{ts.split(",")[0]}</p>
                        <p className="text-[11px] text-slate-500 font-medium">{ts.split(",").slice(1).join(",").trim()}</p>
                      </>
                    ) : (
                      <p className="text-[11px] text-slate-300 italic">—</p>
                    )}
                  </div>

                  {/* Status badge */}
                  <div className="flex justify-center pt-0.5">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full text-center whitespace-nowrap shadow-sm border ${
                      isDone    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : isActive  ? "bg-amber-50 text-amber-700 border-amber-200"
                      : isSBack   ? "bg-orange-50 text-orange-700 border-orange-200"
                      : "bg-slate-50 text-slate-400 border-slate-200"
                    }`}>
                      {isDone    ? "✓ Completed"
                      : isActive  ? "● Current Stage"
                      : isSBack   ? "↩ Sent Back"
                      : "Awaiting"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Approved banner */}
        {request.status === "approved" && (
          <div className="m-3 p-3.5 rounded-xl border-2 flex items-center gap-3 bg-emerald-50 border-emerald-300">
            <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-800">Budget Request Fully Approved</p>
              <p className="text-xs text-emerald-600 mt-0.5">All stages completed · Booking confirmed</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestFullDetail;