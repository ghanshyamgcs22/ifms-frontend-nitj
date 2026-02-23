// ExpenditureDialog.tsx  v3
// Shows expenditure register grouped by fund release installment.
// Each release = collapsible section → heads → per-request rows with actual/variance.
// Grand total booked never exceeds totalReleasedAmount.

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, AlertCircle, Loader2, ChevronDown, ChevronRight, Banknote } from "lucide-react";

const API = "https://ifms-backend-nitj.onrender.com/api";

// ── Types ──────────────────────────────────────────────────────────────────────
interface RequestRow {
  requestId: string;
  requestNumber: string;
  purpose: string;
  invoiceNumber: string;
  bookedAmount: number;
  actualExpenditure: number;
  effectiveAmount: number;
  expenditureFilled: boolean;
  isSettled: boolean;
  createdAt: string | null;
  cumulActual?: number;
}

interface HeadRow {
  headId: string;
  headName: string;
  headType: string;
  bookedAmount: number;
  rawBookedAmount: number;
  actualExpenditure: number;
  approvedCount: number;
  filledCount: number;
  allFilled: boolean;
  requests: RequestRow[];
}

interface ReleaseSection {
  releaseId: string;
  releaseNumber: string;
  letterNumber: string;
  letterDate: string;
  totalReleased: number;
  totalBooked: number;
  totalActual: number;
  remainingInRelease: number;
  approvedCount: number;
  filledCount: number;
  allFilled: boolean;
  heads: HeadRow[];
}

export interface ProjectForExpDialog {
  id: string;
  gpNumber: string;
  projectName: string;
  department: string;
  totalSanctionedAmount: number;
  totalReleasedAmount: number;
  amountBookedByPI: number;
  actualExpenditure: number;
}

interface Props { project: ProjectForExpDialog; }

const fmtINR = (n: number) =>
  "₹" + parseFloat(String(n || 0)).toLocaleString("en-IN", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

// ── Component ─────────────────────────────────────────────────────────────────
export const ExpenditureDialog = ({ project }: Props) => {
  const [open,             setOpen]             = useState(false);
  const [loading,          setLoading]          = useState(false);
  const [apiData,          setApiData]          = useState<any>(null);
  const [expandedReleases, setExpandedReleases] = useState<Record<string, boolean>>({});
  const [expandedHeads,    setExpandedHeads]    = useState<Record<string, boolean>>({});

  const handleOpen = async () => {
    setOpen(true);
    setLoading(true);
    try {
      const r = await fetch(`${API}/get-project-expenditure.php?projectId=${project.id}`);
      const d = await r.json();
      if (d.success && d.data) {
        setApiData(d.data);
        const re: Record<string, boolean> = {};
        const he: Record<string, boolean> = {};
        (d.data.releases ?? []).forEach((rel: ReleaseSection) => {
          re[rel.releaseId] = true;
          rel.heads.forEach(h => { he[`${rel.releaseId}__${h.headId}`] = true; });
        });
        setExpandedReleases(re);
        setExpandedHeads(he);
      }
    } catch (e) {
      console.error("Failed to fetch expenditure", e);
    } finally {
      setLoading(false);
    }
  };

  const toggleRelease = (id: string) => setExpandedReleases(p => ({ ...p, [id]: !p[id] }));
  const toggleHead    = (key: string) => setExpandedHeads(p => ({ ...p, [key]: !p[key] }));

  const sanctioned = apiData?.totalSanctionedAmount ?? project.totalSanctionedAmount ?? 0;
  const released   = apiData?.totalReleasedAmount   ?? project.totalReleasedAmount   ?? 0;
  const booked     = apiData?.amountBookedByPI      ?? project.amountBookedByPI      ?? 0;
  const actual     = apiData?.actualExpenditure     ?? project.actualExpenditure     ?? 0;
  const remaining  = Math.max(0, released - booked);
  const approved   = apiData?.approvedRequestCount   ?? 0;
  const filled     = apiData?.filledExpenditureCount ?? 0;
  const expComplete = apiData?.expenditureComplete   ?? false;

  const bookedPct = released > 0 ? Math.min(100, (booked / released) * 100) : 0;
  const actualPct = released > 0 ? Math.min(100, (actual / released) * 100) : 0;

  const releases: ReleaseSection[] = apiData?.releases ?? [];

  return (
    <>
      {/* Trigger */}
      <button onClick={handleOpen} className="group inline-flex flex-col items-end gap-0.5 cursor-pointer">
        <span className="text-sm font-semibold font-mono text-slate-800 group-hover:text-slate-500 transition-colors">
          {(project.actualExpenditure ?? 0).toLocaleString("en-IN")}
        </span>
        <span className="text-[9px] font-medium text-slate-400 group-hover:text-slate-600 underline underline-offset-2">
          View Detail
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 bg-white border border-slate-200 shadow-xl rounded-xl">

          {/* Header */}
          <div className="border-b border-slate-100 px-8 pt-7 pb-5 bg-white sticky top-0 z-10">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-mono font-semibold text-slate-400 tracking-[0.2em] uppercase mb-1.5">
                  {project.gpNumber} · Expenditure Register
                </p>
                <DialogTitle className="text-lg font-bold text-slate-900 leading-snug">
                  {project.projectName}
                </DialogTitle>
                <p className="text-xs text-slate-500 mt-0.5">{project.department}</p>
              </div>
              <div className="shrink-0 pt-1">
                {approved === 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1 rounded">
                    No Approved Requests
                  </span>
                ) : expComplete ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded">
                    <CheckCircle2 className="h-3.5 w-3.5" /> All Expenditures Entered
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded">
                    <AlertCircle className="h-3.5 w-3.5" /> {filled}/{approved} Entries Filled
                  </span>
                )}
              </div>
            </div>

            {/* Progress bars */}
            <div className="mt-5 space-y-2">
              {[
                { label: "Booked",            pct: bookedPct, color: "bg-slate-600" },
                { label: "Actual Expenditure", pct: actualPct, color: "bg-emerald-500" },
              ].map(bar => (
                <div key={bar.label} className="flex items-center gap-3">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 w-32">{bar.label}</span>
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${bar.color} rounded-full`} style={{ width: `${bar.pct}%` }} />
                  </div>
                  <span className="text-[9px] font-mono text-slate-500 w-20 text-right">
                    {bar.pct.toFixed(1)}% of Released
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Summary strip */}
          <div className="grid grid-cols-5 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50">
            {[
              { label: "Sanctioned",  value: sanctioned, note: "Fixed total",          hi: false },
              { label: "Released",    value: released,   note: `${sanctioned > 0 ? ((released/sanctioned)*100).toFixed(0) : 0}% of sanctioned`, hi: false },
              { label: "Booked",      value: booked,     note: "Approved requests",    hi: false },
              { label: "Actual Exp.", value: actual,     note: actual > 0 ? `${booked > 0 ? ((actual/booked)*100).toFixed(0) : 0}% of booked` : "Pending DA", hi: false },
              { label: "Remaining",   value: remaining,  note: "Released − Booked",    hi: true  },
            ].map(c => (
              <div key={c.label} className={`px-4 py-3 ${c.hi ? "bg-blue-50" : "bg-white"}`}>
                <p className="text-[9px] uppercase tracking-wider font-semibold text-slate-400 mb-0.5">{c.label}</p>
                <p className={`text-sm font-bold font-mono ${c.hi ? "text-blue-700" : "text-slate-800"}`}>{fmtINR(c.value)}</p>
                <p className="text-[9px] text-slate-400 mt-0.5">{c.note}</p>
              </div>
            ))}
          </div>

          {/* Body */}
          <div className="px-8 py-6 space-y-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-slate-400">
              Release-wise · Expenditure Ledger
            </p>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-slate-300 mr-3" />
                <span className="text-sm text-slate-400">Loading expenditure data…</span>
              </div>
            ) : releases.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                <AlertCircle className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-500">No approved requests yet</p>
                <p className="text-xs text-slate-400 mt-1">Expenditure entries appear once requests are fully approved.</p>
              </div>
            ) : (
              releases.map((rel, ri) => {
                const relExpanded = expandedReleases[rel.releaseId] !== false;
                const relUsedPct  = rel.totalReleased > 0 ? Math.min(100, (rel.totalBooked / rel.totalReleased) * 100) : 0;
                const relActPct   = rel.totalReleased > 0 ? Math.min(100, (rel.totalActual / rel.totalReleased) * 100) : 0;

                return (
                  <div key={rel.releaseId} className="border border-slate-200 rounded-xl overflow-hidden">

                    {/* Release header */}
                    <button
                      onClick={() => toggleRelease(rel.releaseId)}
                      className="w-full flex items-center gap-4 px-5 py-4 bg-slate-800 hover:bg-slate-700 transition-colors text-left"
                    >
                      {relExpanded
                        ? <ChevronDown  className="h-4 w-4 text-slate-400 shrink-0" />
                        : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                      }
                      <Banknote className="h-4 w-4 text-slate-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white">
                          Release {ri + 1} — {rel.releaseNumber}
                        </p>
                        <p className="text-[9px] text-slate-400 mt-0.5 uppercase tracking-wider">
                          {rel.letterDate ? `Letter Date: ${fmtDate(rel.letterDate)}` : ""}
                          {rel.letterNumber ? ` · Ref: ${rel.letterNumber}` : ""}
                          {" · "}{rel.filledCount}/{rel.approvedCount} expenditures filled
                        </p>
                      </div>
                      <div className="flex items-center gap-7 shrink-0">
                        {[
                          { label: "Released",  v: rel.totalReleased,      cls: "text-slate-300" },
                          { label: "Booked",    v: rel.totalBooked,        cls: "text-white font-bold" },
                          { label: "Actual",    v: rel.totalActual,        cls: "text-emerald-400" },
                          { label: "Remaining", v: rel.remainingInRelease, cls: rel.remainingInRelease <= 0 ? "text-slate-500 line-through" : "text-slate-300" },
                        ].map(s => (
                          <div key={s.label} className="text-right">
                            <p className="text-[8px] uppercase tracking-wider text-slate-500">{s.label}</p>
                            <p className={`text-xs font-bold font-mono ${s.cls}`}>{fmtINR(s.v)}</p>
                          </div>
                        ))}
                        <div>
                          {rel.allFilled ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 border border-emerald-700 px-2 py-0.5 rounded">
                              <CheckCircle2 className="h-2.5 w-2.5" /> Done
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 border border-amber-700 px-2 py-0.5 rounded">
                              <AlertCircle className="h-2.5 w-2.5" /> Partial
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Dual progress bar */}
                    <div className="h-1 bg-slate-700 relative">
                      <div className="absolute inset-y-0 left-0 bg-slate-400" style={{ width: `${relUsedPct}%` }} />
                      <div className="absolute inset-y-0 left-0 bg-emerald-500" style={{ width: `${relActPct}%` }} />
                    </div>

                    {/* Heads under this release */}
                    {relExpanded && (
                      <div className="divide-y divide-slate-100">
                        {rel.heads.map((head, hi) => {
                          const headKey  = `${rel.releaseId}__${head.headId}`;
                          const hExpanded = expandedHeads[headKey] !== false;
                          const variance  = head.bookedAmount - head.actualExpenditure;

                          return (
                            <div key={head.headId}>
                              <button
                                onClick={() => toggleHead(headKey)}
                                className="w-full flex items-center gap-4 px-5 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                              >
                                {hExpanded
                                  ? <ChevronDown  className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                  : <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                }
                                <span className="w-4 h-4 rounded bg-slate-300 flex items-center justify-center shrink-0">
                                  <span className="text-[7px] font-black text-slate-700">{hi + 1}</span>
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-slate-800">{head.headName}</p>
                                  <p className="text-[9px] text-slate-400 uppercase tracking-wider">
                                    {head.headType} · {head.filledCount}/{head.approvedCount} filled
                                  </p>
                                </div>
                                <div className="flex items-center gap-6 shrink-0">
                                  {[
                                    { label: "Booked",    v: head.bookedAmount,        cls: "text-slate-700" },
                                    { label: "Actual",    v: head.actualExpenditure,   cls: "text-emerald-700 font-bold" },
                                    { label: "Variance",  v: variance, prefix: variance >= 0 ? "+" : "",
                                      cls: variance > 0 ? "text-emerald-600" : variance < 0 ? "text-red-600" : "text-slate-400" },
                                  ].map(s => (
                                    <div key={s.label} className="text-right">
                                      <p className="text-[8px] uppercase tracking-wider text-slate-400">{s.label}</p>
                                      <p className={`text-xs font-bold font-mono ${s.cls}`}>
                                        {(s as any).prefix ?? ""}{fmtINR(s.v)}
                                      </p>
                                    </div>
                                  ))}
                                  <div>
                                    {head.allFilled ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                                        <CheckCircle2 className="h-2.5 w-2.5" /> Done
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                                        <AlertCircle className="h-2.5 w-2.5" /> Partial
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </button>

                              {/* Requests table */}
                              {hExpanded && (
                                <table className="w-full bg-white">
                                  <thead>
                                    <tr className="border-b border-slate-100">
                                      {["#","Ref. No.","Purpose","Invoice","Date","Booked","Actual Exp.","Variance","Cumul. Actual","Status"].map(h => (
                                        <th key={h} className="text-left text-[8px] font-bold uppercase tracking-widest text-slate-400 px-3 py-2 whitespace-nowrap">
                                          {h}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {head.requests.map((req, ri) => {
                                      const v = req.bookedAmount - req.actualExpenditure;
                                      return (
                                        <tr key={req.requestId} className={`border-b border-slate-50 transition-colors ${req.isSettled ? "bg-emerald-50/30" : "hover:bg-slate-50"}`}>
                                          <td className="px-3 py-2.5 text-xs text-slate-400 font-mono">{ri + 1}</td>
                                          <td className="px-3 py-2.5 text-xs font-mono font-semibold text-slate-700 whitespace-nowrap">{req.requestNumber}</td>
                                          <td className="px-3 py-2.5 text-xs text-slate-600 max-w-[110px]">
                                            <span className="line-clamp-1">{req.purpose || "—"}</span>
                                          </td>
                                          <td className="px-3 py-2.5 text-xs font-mono text-slate-500 whitespace-nowrap">{req.invoiceNumber || "—"}</td>
                                          <td className="px-3 py-2.5 text-xs text-slate-400 whitespace-nowrap">{fmtDate(req.createdAt)}</td>
                                          {/* Booked */}
                                          <td className="px-3 py-2.5 text-xs font-bold font-mono text-slate-600 text-right whitespace-nowrap">
                                            {fmtINR(req.bookedAmount)}
                                          </td>
                                          {/* Actual */}
                                          <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                            {req.expenditureFilled
                                              ? <span className="text-sm font-bold font-mono text-emerald-700">{fmtINR(req.actualExpenditure)}</span>
                                              : <span className="text-xs text-amber-500 italic">Pending DA</span>
                                            }
                                          </td>
                                          {/* Variance */}
                                          <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                            {req.expenditureFilled
                                              ? <span className={`text-xs font-bold font-mono ${v > 0 ? "text-emerald-700" : v < 0 ? "text-red-600" : "text-slate-400"}`}>
                                                  {v >= 0 ? "+" : ""}{fmtINR(v)}
                                                </span>
                                              : <span className="text-slate-300 text-xs">—</span>
                                            }
                                          </td>
                                          {/* Cumulative Actual */}
                                          <td className="px-3 py-2.5 whitespace-nowrap">
                                            <span className="text-sm font-bold font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                              {fmtINR(req.cumulActual ?? 0)}
                                            </span>
                                          </td>
                                          {/* Status */}
                                          <td className="px-3 py-2.5 whitespace-nowrap">
                                            {req.expenditureFilled
                                              ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 border border-emerald-200 bg-emerald-50 px-2 py-0.5 rounded">
                                                  <CheckCircle2 className="h-2.5 w-2.5" /> Entered
                                                </span>
                                              : <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 border border-amber-200 bg-amber-50 px-2 py-0.5 rounded">
                                                  <AlertCircle className="h-2.5 w-2.5" /> Pending
                                                </span>
                                            }
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                  {head.requests.length > 1 && (
                                    <tfoot>
                                      <tr className="border-t-2 border-slate-200 bg-slate-50">
                                        <td colSpan={5} className="px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">
                                          Subtotal · {head.headName}
                                        </td>
                                        <td className="px-3 py-2 text-xs font-black font-mono text-slate-700 text-right">
                                          {fmtINR(head.requests.reduce((s, r) => s + r.bookedAmount, 0))}
                                        </td>
                                        <td className="px-3 py-2 text-xs font-black font-mono text-emerald-700 text-right">
                                          {fmtINR(head.actualExpenditure)}
                                        </td>
                                        <td className="px-3 py-2 text-xs font-black font-mono text-right">
                                          <span className={variance >= 0 ? "text-emerald-700" : "text-red-600"}>
                                            {variance >= 0 ? "+" : ""}{fmtINR(variance)}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                          <span className="text-sm font-black font-mono text-slate-900 bg-slate-200 px-2 py-0.5 rounded">
                                            {fmtINR(head.requests[head.requests.length - 1]?.cumulActual ?? 0)}
                                          </span>
                                        </td>
                                        <td />
                                      </tr>
                                    </tfoot>
                                  )}
                                </table>
                              )}
                            </div>
                          );
                        })}

                        {/* Release footer */}
                        <div className="flex items-center justify-between px-5 py-3 bg-slate-100 border-t border-slate-200">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                            Release {ri + 1} Total
                          </p>
                          <div className="flex items-center gap-8">
                            {[
                              { label: "Released",  v: rel.totalReleased,      cls: "text-slate-600" },
                              { label: "Booked",    v: rel.totalBooked,        cls: "text-slate-900 font-black" },
                              { label: "Actual",    v: rel.totalActual,        cls: "text-emerald-700 font-black" },
                              { label: "Variance",  v: rel.totalBooked - rel.totalActual,
                                cls: (rel.totalBooked - rel.totalActual) >= 0 ? "text-emerald-700" : "text-red-600",
                                prefix: (rel.totalBooked - rel.totalActual) >= 0 ? "+" : "" },
                              { label: "Remaining", v: rel.remainingInRelease,
                                cls: rel.remainingInRelease <= 0 ? "text-slate-400 line-through" : "text-blue-700" },
                            ].map(s => (
                              <div key={s.label} className="text-right">
                                <p className="text-[8px] uppercase tracking-wider text-slate-400">{s.label}</p>
                                <p className={`text-sm font-bold font-mono ${s.cls}`}>
                                  {(s as any).prefix ?? ""}{fmtINR(s.v)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Grand Total */}
            {releases.length > 0 && (
              <div className="border border-slate-800 rounded-lg bg-slate-900 px-6 py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                  Grand Total — All Releases Combined
                </p>
                <div className="grid grid-cols-4 gap-8">
                  {[
                    { label: "Total Released", value: released,        color: "text-slate-400" },
                    { label: "Total Booked",   value: booked,          color: "text-white" },
                    { label: "Total Actual",   value: actual,          color: "text-emerald-400" },
                    { label: "Remaining",      value: remaining,       color: remaining <= 0 ? "text-slate-500 line-through" : "text-white" },
                  ].map(s => (
                    <div key={s.label}>
                      <p className="text-[9px] uppercase tracking-widest text-slate-500 mb-1">{s.label}</p>
                      <p className={`text-xl font-black font-mono ${s.color}`}>{fmtINR(s.value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
