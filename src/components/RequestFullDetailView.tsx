// components/RequestFullDetail.tsx
// ✅ MEITY format Points 1–8 with correct numbering
// ✅ Point 7(a) material    — read-only for ALL reviewers (PI-only field)
// ✅ Point 7(b) expenditure — editable by AR and DR only
// ✅ Point 8    mode        — editable by DRC R&C and DRC only
// ✅ Live local state updates immediately after save (no full re-fetch needed)

import { useState, useEffect } from "react";
import {
  FileText, Eye, ExternalLink, Pencil, Lock, CheckCircle2,
  AlertTriangle, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const API = import.meta.env.VITE_API_URL;

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
  invoiceNumber?: string;
  createdAt?: string;
  purpose?: string;
  description?: string;
  material?: string;       // 7(a) — PI only, never editable by reviewers
  expenditure?: string;    // 7(b) — AR / DR editable
  mode?: string;           // 8    — DRC R&C / DRC editable
  quotationFile?: string;
  quotationFileName?: string;
  daRemarks?: string;
  arRemarks?: string;
  drRemarks?: string;
  drcOfficeRemarks?: string;
  drcRcRemarks?: string;
  drcRemarks?: string;
  directorRemarks?: string;
  latestQuery?: {
    query: string; raisedBy: string; raisedByLabel?: string;
    raisedAt?: string; resolved: boolean; piResponse?: string;
  } | null;
}

// Only 7(b) is editable by AR/DR — 7(a) material is locked
const POINT7B_STAGES = new Set(["ar", "dr"]);
// Point 8 editable by DRC R&C and DRC
const POINT8_STAGES  = new Set(["drc_rc", "drc"]);

interface Props {
  request: RequestDetailData;
  viewerStage: string;
  onFieldSaved?: (updates: { expenditure?: string; mode?: string }) => void;
}

const fmtDate = (d?: string) =>
  !d ? "—" : new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const fmtAmount = (n?: number) =>
  !n ? "—" : `₹${(n / 100000).toFixed(2)}L  (₹${n.toLocaleString("en-IN")})`;

export const RequestFullDetail = ({ request, viewerStage, onFieldSaved }: Props) => {
  const [showPdf,   setShowPdf]   = useState(false);
  const [pdfUrl,    setPdfUrl]    = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  // Live local copies so UI updates immediately after save
  const [liveExpenditure, setLiveExpenditure] = useState(request.expenditure ?? "");
  const [liveMode,        setLiveMode]        = useState(request.mode        ?? "");

  useEffect(() => { setLiveExpenditure(request.expenditure ?? ""); }, [request.expenditure]);
  useEffect(() => { setLiveMode(request.mode ?? ""); },              [request.mode]);

  // 7(b) edit state — AR / DR only
  const canEdit7b  = POINT7B_STAGES.has(viewerStage);
  const [edit7b,   setEdit7b]   = useState(false);
  const [expVal,   setExpVal]   = useState("");
  const [saving7b, setSaving7b] = useState(false);

  // Point 8 edit state — DRC R&C / DRC only
  const canEditP8  = POINT8_STAGES.has(viewerStage);
  const [editP8,   setEditP8]   = useState(false);
  const [modeVal,  setModeVal]  = useState("");
  const [savingP8, setSavingP8] = useState(false);

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
    window.open(`${API}/download-file.php?requestId=${request.id}&type=quotation`, "_blank");
  };

  const startEdit7b = () => { setExpVal(liveExpenditure); setEdit7b(true); };

  const save7b = async () => {
    setSaving7b(true);
    try {
      const res  = await fetch(`${API}/update-request-fields.php`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: request.id, stage: viewerStage, expenditure: expVal }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setLiveExpenditure(expVal);
      toast.success("Point 7(b) saved.");
      onFieldSaved?.({ expenditure: expVal });
      setEdit7b(false);
    } catch (e: any) { toast.error(e.message || "Save failed"); }
    finally { setSaving7b(false); }
  };

  const startEditP8 = () => { setModeVal(liveMode); setEditP8(true); };

  const saveP8 = async () => {
    setSavingP8(true);
    try {
      const res  = await fetch(`${API}/update-request-fields.php`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: request.id, stage: viewerStage, mode: modeVal }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setLiveMode(modeVal);
      toast.success("Point 8 (Mode) saved.");
      onFieldSaved?.({ mode: modeVal });
      setEditP8(false);
    } catch (e: any) { toast.error(e.message || "Save failed"); }
    finally { setSavingP8(false); }
  };

  const remarksList = [
    { label: "DA Remarks",         value: request.daRemarks,        cls: "bg-blue-50 border-blue-200 text-blue-700" },
    { label: "AR Remarks",         value: request.arRemarks,        cls: "bg-sky-50 border-sky-200 text-sky-700" },
    { label: "DR Remarks",         value: request.drRemarks,        cls: "bg-purple-50 border-purple-200 text-purple-700" },
    { label: "DRC Office Remarks", value: request.drcOfficeRemarks, cls: "bg-cyan-50 border-cyan-200 text-cyan-700" },
    { label: "DR (R&C) Remarks",  value: request.drcRcRemarks,     cls: "bg-teal-50 border-teal-200 text-teal-700" },
    { label: "DRC Remarks",        value: request.drcRemarks,       cls: "bg-indigo-50 border-indigo-200 text-indigo-700" },
    { label: "Director Remarks",   value: request.directorRemarks,  cls: "bg-violet-50 border-violet-200 text-violet-700" },
  ].filter(r => r.value?.trim());

  return (
    <div className="space-y-4">

      <button type="button" onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-800 text-white rounded-lg text-xs font-semibold tracking-wide">
        <span>📋 FULL REQUEST DETAILS (MEITY FORMAT)</span>
        {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </button>

      {!collapsed && (
        <>
          {/* Open query banner */}
          {request.latestQuery && !request.latestQuery.resolved && (
            <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-300 rounded-xl">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-amber-900">
                  Open Query — by {request.latestQuery.raisedByLabel || request.latestQuery.raisedBy}
                  {request.latestQuery.raisedAt && <span className="ml-1.5 font-normal text-amber-600">on {fmtDate(request.latestQuery.raisedAt)}</span>}
                </p>
                <p className="text-sm text-amber-800 italic mt-1">"{request.latestQuery.query}"</p>
              </div>
            </div>
          )}
          {request.latestQuery?.resolved && request.latestQuery.piResponse && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <p className="text-xs font-semibold text-emerald-700 mb-1">✓ Query Resolved — PI Response:</p>
              <p className="text-sm text-emerald-900 italic">"{request.latestQuery.piResponse}"</p>
            </div>
          )}

          {/* Header grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm">
            {[
              ["Request No.",  request.requestNumber || "—"],
              ["GP Number",    request.gpNumber || "—"],
              ["File Number",  request.fileNumber || "—"],
              ["PI Name",      request.piName || "—"],
              ["Department",   request.department || "—"],
              ["Project Type", request.projectType || "—"],
              ["Head",         [request.headName, request.headType].filter(Boolean).join(" — ") || "—"],
              ["Amount",       fmtAmount(request.amount)],
              ["Invoice No.",  request.invoiceNumber || "—"],
              ["Date",         fmtDate(request.createdAt)],
            ].map(([l, v]) => (
              <div key={l as string}>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{l}</p>
                <p className="font-medium text-slate-800 mt-0.5">{v}</p>
              </div>
            ))}
          </div>

          {/* MEITY form table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">

            {/* Quotation file row */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-700">Quotation File</p>
                  <p className="text-[11px] text-slate-400">{request.quotationFileName || "Quotation.pdf"}</p>
                  {request.fileNumber && <p className="text-[11px] font-mono font-bold text-blue-700 mt-0.5">File No: {request.fileNumber}</p>}
                </div>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={handleViewFile}
                className="h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-50 gap-1.5">
                <Eye className="h-3 w-3" />{showPdf ? "Hide" : "View"}
              </Button>
            </div>

            {showPdf && pdfUrl && (
              <div className="border-b border-slate-200">
                <div className="flex items-center justify-between px-4 py-2 bg-slate-100 border-b border-slate-200">
                  <p className="text-xs font-semibold text-slate-700">📄 Quotation Preview</p>
                  <div className="flex items-center gap-3">
                    <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" /> New tab
                    </a>
                    <button type="button" onClick={() => setShowPdf(false)} className="text-xs text-slate-500 hover:text-slate-800">✕ Close</button>
                  </div>
                </div>
                <iframe src={pdfUrl} className="w-full" style={{ height: "420px" }} title="Quotation" />
              </div>
            )}

            <div className="divide-y divide-slate-100">

              {/* 1 — Project name */}
              <ReadRow num={1} label="Name of the Project" value={request.projectTitle} />

              {/* 2 — Indentor & Dept */}
              <ReadRow num={2} label="Name of Indentor & Department"
                value={[request.piName, request.department].filter(Boolean).join(", ")} />

              {/* 3 — Purpose */}
              <ReadRow num={3} label="Purpose" value={request.purpose} />

              {/* 4 — Description */}
              <ReadRow num={4} label="Detailed Description" value={request.description} multiline />

              {/* 5 — Invoice */}
              <ReadRow num={5} label="Invoice / Bill Number" value={request.invoiceNumber} />

              {/* 6 — Amount */}
              <ReadRow num={6} label="Total Amount (Estimated) Involved in Purchase" value={fmtAmount(request.amount)} />

              {/* ── 7 — Material & Expenditure ── */}
              <div className="flex items-start">
                <div className="w-12 shrink-0 flex justify-center pt-4">
                  <span className="text-xs font-bold text-slate-400">7</span>
                </div>
                <div className="flex-1 py-3 pr-4 pl-1 space-y-4">

                  {/* 7(a) — Material — LOCKED for all reviewers */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                        (a) Material to be Purchased &amp; Qty:
                      </p>
                      {/* Always read-only — no Edit button, just a lock badge */}
                      <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                        <Lock className="h-2.5 w-2.5" /> PI only — fixed
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">
                      {(request.material ?? "").trim()
                        ? request.material
                        : <span className="text-slate-400 italic">Not entered</span>}
                    </p>
                  </div>

                  {/* 7(b) — Expenditure — editable by AR / DR */}
                  <div className={canEdit7b ? "bg-blue-50/40 -mx-1 px-1 py-2 rounded-lg" : ""}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                        (b) Availability of Funds &amp; Head of Expenditure:
                      </p>
                      {canEdit7b && !edit7b && (
                        <button type="button" onClick={startEdit7b}
                          className="flex items-center gap-1 text-[11px] px-2 py-1 rounded border border-blue-300 bg-white text-blue-600 hover:bg-blue-50">
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                      )}
                      {canEdit7b && edit7b && (
                        <div className="flex gap-1.5">
                          <button type="button" onClick={() => setEdit7b(false)}
                            className="text-[11px] px-2 py-1 rounded border border-slate-300 text-slate-500 hover:bg-slate-50">Cancel</button>
                          <button type="button" onClick={save7b} disabled={saving7b}
                            className="flex items-center gap-1 text-[11px] px-2 py-1 rounded border border-blue-400 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                            <CheckCircle2 className="h-3 w-3" />{saving7b ? "Saving…" : "Save"}
                          </button>
                        </div>
                      )}
                      {!canEdit7b && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Lock className="h-3 w-3" /> Read-only
                        </span>
                      )}
                    </div>
                    {edit7b ? (
                      <Textarea value={expVal} onChange={e => setExpVal(e.target.value)}
                        rows={3} className="border-2 border-blue-300 text-sm resize-none w-full" />
                    ) : (
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">
                        {liveExpenditure.trim()
                          ? liveExpenditure
                          : <span className="text-slate-400 italic">Not entered</span>}
                      </p>
                    )}
                    {canEdit7b && (
                      <p className="text-[10px] text-blue-500 mt-1">✏️ Editable by <strong>AR</strong> and <strong>DR</strong> only</p>
                    )}
                  </div>

                </div>
              </div>

              {/* ── 8 — Mode of Procurement ── editable by DRC R&C & DRC ── */}
              <div className={`flex items-start ${canEditP8 ? "bg-teal-50/30" : ""}`}>
                <div className="w-12 shrink-0 flex justify-center pt-4">
                  <span className="text-xs font-bold text-slate-400">8</span>
                </div>
                <div className="flex-1 py-3 pr-4 pl-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Mode of Procurement</p>
                    {canEditP8 && !editP8 && (
                      <button type="button" onClick={startEditP8}
                        className="flex items-center gap-1 text-[11px] px-2 py-1 rounded border border-teal-300 bg-white text-teal-600 hover:bg-teal-50">
                        <Pencil className="h-3 w-3" /> Edit
                      </button>
                    )}
                    {canEditP8 && editP8 && (
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => setEditP8(false)}
                          className="text-[11px] px-2 py-1 rounded border border-slate-300 text-slate-500 hover:bg-slate-50">Cancel</button>
                        <button type="button" onClick={saveP8} disabled={savingP8}
                          className="flex items-center gap-1 text-[11px] px-2 py-1 rounded border border-teal-400 bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">
                          <CheckCircle2 className="h-3 w-3" />{savingP8 ? "Saving…" : "Save"}
                        </button>
                      </div>
                    )}
                    {!canEditP8 && (
                      <span className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Lock className="h-3 w-3" /> Read-only
                      </span>
                    )}
                  </div>
                  {editP8 ? (
                    <Textarea value={modeVal} onChange={e => setModeVal(e.target.value)}
                      rows={3} className="border-2 border-teal-300 text-sm resize-none w-full" />
                  ) : (
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">
                      {liveMode.trim()
                        ? liveMode
                        : <span className="text-slate-400 italic">Not entered</span>}
                    </p>
                  )}
                  {canEditP8 && (
                    <p className="text-[10px] text-teal-500 mt-1">✏️ Editable by <strong>DR (R&C)</strong> and <strong>DRC</strong> only</p>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Remarks chain */}
          {remarksList.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide px-1">Remarks from each stage</p>
              {remarksList.map(({ label, value, cls }) => (
                <div key={label} className={`p-3 rounded-lg border ${cls}`}>
                  <p className="text-xs font-semibold mb-1">{label}:</p>
                  <p className="text-sm text-slate-700">{value}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ── Simple numbered read-only row ─────────────────────────────────────────────
const ReadRow = ({ num, label, value, multiline = false }: {
  num: number; label: string; value?: string; multiline?: boolean;
}) => (
  <div className="flex items-start">
    <div className="w-12 shrink-0 flex justify-center pt-3.5">
      <span className="text-xs font-bold text-slate-400">{num}</span>
    </div>
    <div className="flex-1 py-3 pr-4 pl-1">
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      {value?.trim()
        ? <p className={`text-sm text-slate-800 ${multiline ? "whitespace-pre-wrap" : ""}`}>{value}</p>
        : <p className="text-sm text-slate-400 italic">Not entered</p>}
    </div>
  </div>
);