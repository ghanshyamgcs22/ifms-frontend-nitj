// BookedAmountDialog.tsx  v4
// Shows booking register grouped by fund release installment.
// Each release = separate collapsible section with its own heads/requests.
// Grand total booked never exceeds totalReleasedAmount.

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, Clock, ChevronDown, ChevronRight, Loader2, Banknote } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

// ── Types ──────────────────────────────────────────────────────────────────────
interface RequestRow {
  requestId: string;
  requestNumber: string;
  purpose: string;
  invoiceNumber: string;
  bookedAmount: number;
  actualAmount: number;
  effectiveAmount: number;
  isSettled: boolean;
  createdAt: string | null;
  runningTotal?: number;
}

interface HeadRow {
  headId: string;
  headName: string;
  headType: string;
  bookedAmount: number;
  actualExpenditure: number;
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
  heads: HeadRow[];
}

export interface BookedDialogProject {
  id: string;
  gpNumber: string;
  projectName: string;
  department: string;
  totalReleasedAmount: number;
  amountBookedByPI: number;
  actualExpenditure: number;
  availableBalance: number;
}

interface Props { project: BookedDialogProject; }

const fmtINR = (n: number) =>
  "₹" + parseFloat(String(n || 0)).toLocaleString("en-IN", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

// ── Component ─────────────────────────────────────────────────────────────────
export const BookedAmountDialog = ({ project }: Props) => {
  const [open,             setOpen]             = useState(false);
  const [loading,          setLoading]          = useState(false);
  const [apiData,          setApiData]          = useState<any>(null);
  const [expandedReleases, setExpandedReleases] = useState<Record<string, boolean>>({});
  const [expandedHeads,    setExpandedHeads]    = useState<Record<string, boolean>>({});

  const released  = apiData?.totalReleasedAmount ?? project.totalReleasedAmount ?? 0;
  const booked    = apiData?.amountBookedByPI    ?? project.amountBookedByPI    ?? 0;
  const actual    = apiData?.actualExpenditure   ?? project.actualExpenditure   ?? 0;
  const remaining = Math.max(0, released - booked);
  const usedPct   = released > 0 ? Math.min(100, (booked / released) * 100) : 0;

  const handleOpen = async () => {
    setOpen(true);
    setLoading(true);
    try {
      const r = await fetch(`${API}/get-project-bookings.php?projectId=${project.id}`);
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
      console.error("Failed to fetch bookings", e);
    } finally {
      setLoading(false);
    }
  };

  const toggleRelease = (id: string) => setExpandedReleases(p => ({ ...p, [id]: !p[id] }));
  const toggleHead    = (key: string) => setExpandedHeads(p => ({ ...p, [key]: !p[key] }));

  const releases: ReleaseSection[] = apiData?.releases ?? [];

  return (
    <>
      {/* Trigger */}
      <button onClick={handleOpen} className="group inline-flex flex-col items-end gap-0.5 cursor-pointer">
        <span className="text-sm font-semibold font-mono text-slate-800 group-hover:text-slate-500 transition-colors">
          {booked.toLocaleString("en-IN")}
        </span>
        <span className="text-[9px] font-medium text-slate-400 group-hover:text-slate-600 underline underline-offset-2">
          View Bookings
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 bg-white border border-slate-200 shadow-xl rounded-xl">

          {/* Header */}
          <div className="border-b border-slate-200 px-8 pt-7 pb-5 bg-white sticky top-0 z-10">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-mono font-semibold text-slate-400 tracking-[0.2em] uppercase mb-1.5">
                  {project.gpNumber} · Booking Register
                </p>
                <DialogTitle className="text-lg font-bold text-slate-900 leading-snug">
                  {project.projectName}
                </DialogTitle>
                <p className="text-xs text-slate-500 mt-0.5">{project.department}</p>
              </div>
              <div className="shrink-0 text-right pt-1">
                <p className="text-[9px] uppercase tracking-widest text-slate-400 mb-0.5">Utilization</p>
                <p className="text-2xl font-black font-mono text-slate-900">
                  {usedPct.toFixed(1)}<span className="text-base font-normal text-slate-400">%</span>
                </p>
              </div>
            </div>
            <div className="mt-4 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-slate-700 rounded-full" style={{ width: `${usedPct}%` }} />
            </div>
          </div>

          {/* Summary strip */}
          <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50">
            {[
              { label: "Total Released",    value: fmtINR(released),  note: "Authorised funds" },
              { label: "Total Booked",      value: fmtINR(booked),    note: "Effective across all releases" },
              { label: "Available Balance", value: fmtINR(remaining), note: "Released − Booked" },
            ].map((c, i) => (
              <div key={c.label} className="px-6 py-4">
                <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">{c.label}</p>
                <p className={`text-lg font-bold font-mono ${i === 2 && remaining <= 0 ? "text-slate-400 line-through" : "text-slate-900"}`}>
                  {c.value}
                </p>
                <p className="text-[9px] text-slate-400 mt-1">{c.note}</p>
              </div>
            ))}
          </div>

          {/* Body */}
          <div className="px-8 py-6 space-y-5">
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-slate-400">
              Release-wise · Booking Ledger
            </p>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-slate-300 mr-3" />
                <span className="text-sm text-slate-400">Loading bookings…</span>
              </div>
            ) : releases.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                <Clock className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-500">No Approved Bookings</p>
                <p className="text-xs text-slate-400 mt-1">Bookings appear once requests pass DA → AR → DR.</p>
              </div>
            ) : (
              releases.map((rel, ri) => {
                const relExpanded = expandedReleases[rel.releaseId] !== false;
                const relUsedPct  = rel.totalReleased > 0 ? Math.min(100, (rel.totalBooked / rel.totalReleased) * 100) : 0;

                return (
                  <div key={rel.releaseId} className="border border-slate-200 rounded-xl overflow-hidden">

                    {/* ── Release header ── */}
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
                        </p>
                      </div>
                      <div className="flex items-center gap-8 shrink-0">
                        {[
                          { label: "Released",   v: rel.totalReleased,      cls: "text-slate-300" },
                          { label: "Booked",     v: rel.totalBooked,        cls: "text-white font-bold" },
                          { label: "Actual",     v: rel.totalActual,        cls: "text-emerald-400" },
                          { label: "Remaining",  v: rel.remainingInRelease, cls: rel.remainingInRelease <= 0 ? "text-slate-500 line-through" : "text-slate-300" },
                        ].map(s => (
                          <div key={s.label} className="text-right">
                            <p className="text-[8px] uppercase tracking-wider text-slate-500">{s.label}</p>
                            <p className={`text-xs font-bold font-mono ${s.cls}`}>{fmtINR(s.v)}</p>
                          </div>
                        ))}
                      </div>
                    </button>

                    {/* Release progress bar */}
                    <div className="h-0.5 bg-slate-700">
                      <div className="h-full bg-emerald-500" style={{ width: `${relUsedPct}%` }} />
                    </div>

                    {/* ── Heads under this release ── */}
                    {relExpanded && (
                      <div className="divide-y divide-slate-100">
                        {rel.heads.map((head, hi) => {
                          const headKey  = `${rel.releaseId}__${head.headId}`;
                          const hExpanded = expandedHeads[headKey] !== false;

                          return (
                            <div key={head.headId}>
                              {/* Head row */}
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
                                    {head.headType} · {head.requests.length} booking{head.requests.length !== 1 ? "s" : ""}
                                    {head.requests.filter(r => r.isSettled).length > 0 && (
                                      <span className="ml-1 text-emerald-600">
                                        · {head.requests.filter(r => r.isSettled).length} settled
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <div className="flex items-center gap-6 shrink-0">
                                  {[
                                    { label: "Booked",  v: head.bookedAmount,      cls: "text-slate-700" },
                                    { label: "Actual",  v: head.actualExpenditure, cls: "text-emerald-700" },
                                  ].map(s => (
                                    <div key={s.label} className="text-right">
                                      <p className="text-[8px] uppercase tracking-wider text-slate-400">{s.label}</p>
                                      <p className={`text-xs font-bold font-mono ${s.cls}`}>{fmtINR(s.v)}</p>
                                    </div>
                                  ))}
                                </div>
                              </button>

                              {/* Requests table */}
                              {hExpanded && (
                                <table className="w-full bg-white">
                                  <thead>
                                    <tr className="border-b border-slate-100">
                                      {["#", "Ref. No.", "Purpose", "Invoice", "Date",
                                        "Booked", "Actual", "Effective", "Cumul."].map(h => (
                                        <th key={h} className="text-left text-[8px] font-bold uppercase tracking-widest text-slate-400 px-3 py-2 whitespace-nowrap">
                                          {h}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {head.requests.map((req, ri) => (
                                      <tr key={req.requestId} className={`border-b border-slate-50 transition-colors ${req.isSettled ? "bg-emerald-50/30" : "hover:bg-slate-50"}`}>
                                        <td className="px-3 py-2.5 text-xs text-slate-400 font-mono">{ri + 1}</td>
                                        <td className="px-3 py-2.5 text-xs font-mono font-semibold text-slate-700 whitespace-nowrap">
                                          {req.requestNumber}
                                        </td>
                                        <td className="px-3 py-2.5 text-xs text-slate-600 max-w-[120px]">
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
                                          {req.isSettled
                                            ? <span className="text-sm font-bold font-mono text-emerald-700">{fmtINR(req.actualAmount)}</span>
                                            : <span className="text-xs text-amber-500 italic">Pending DA</span>
                                          }
                                        </td>
                                        {/* Effective */}
                                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                          <span className={`text-sm font-bold font-mono ${req.isSettled ? "text-emerald-700" : "text-slate-800"}`}>
                                            {fmtINR(req.effectiveAmount)}
                                          </span>
                                          {req.isSettled && req.bookedAmount !== req.actualAmount && (
                                            <span className="ml-1 text-[8px] text-emerald-600">
                                              ↓{fmtINR(req.bookedAmount - req.actualAmount)} returned
                                            </span>
                                          )}
                                        </td>
                                        {/* Cumulative */}
                                        <td className="px-3 py-2.5 whitespace-nowrap">
                                          <span className="text-sm font-bold font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                            {fmtINR(req.runningTotal ?? 0)}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  {/* Head footer */}
                                  <tfoot>
                                    <tr className="border-t-2 border-slate-200 bg-slate-50">
                                      <td colSpan={5} className="px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">
                                        Total · {head.headName}
                                      </td>
                                      <td className="px-3 py-2 text-xs font-black font-mono text-slate-600 text-right">
                                        {fmtINR(head.requests.reduce((s, r) => s + r.bookedAmount, 0))}
                                      </td>
                                      <td className="px-3 py-2 text-xs font-black font-mono text-emerald-700 text-right">
                                        {fmtINR(head.actualExpenditure)}
                                      </td>
                                      <td className="px-3 py-2 text-xs font-black font-mono text-slate-900 text-right">
                                        {fmtINR(head.bookedAmount)}
                                      </td>
                                      <td className="px-3 py-2 text-right">
                                        <span className="text-sm font-black font-mono text-slate-900 bg-slate-200 px-2 py-0.5 rounded">
                                          {fmtINR(head.requests[head.requests.length - 1]?.runningTotal ?? 0)}
                                        </span>
                                      </td>
                                    </tr>
                                  </tfoot>
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
                              { label: "Actual",    v: rel.totalActual,        cls: "text-emerald-700" },
                              { label: "Remaining", v: rel.remainingInRelease, cls: rel.remainingInRelease <= 0 ? "text-slate-400 line-through" : "text-blue-700" },
                            ].map(s => (
                              <div key={s.label} className="text-right">
                                <p className="text-[8px] uppercase tracking-wider text-slate-400">{s.label}</p>
                                <p className={`text-sm font-bold font-mono ${s.cls}`}>{fmtINR(s.v)}</p>
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
              <div className="border border-slate-800 rounded-lg bg-slate-900 px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Grand Total — All Releases</p>
                  <p className="text-[9px] text-slate-600 mt-0.5 font-mono">
                    {releases.length} release{releases.length !== 1 ? "s" : ""} · Booked ≤ Released always
                  </p>
                </div>
                <div className="flex items-center gap-12">
                  <div className="text-right">
                    <p className="text-[9px] uppercase tracking-widest text-slate-500">Total Released</p>
                    <p className="text-xl font-black font-mono text-slate-400">{fmtINR(released)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] uppercase tracking-widest text-slate-500">Total Booked</p>
                    <p className="text-xl font-black font-mono text-white">{fmtINR(booked)}</p>
                  </div>
                  <div className="text-right border-l border-slate-700 pl-12">
                    <p className="text-[9px] uppercase tracking-widest text-slate-500">Available Balance</p>
                    <p className={`text-xl font-black font-mono ${remaining <= 0 ? "text-slate-500 line-through" : "text-white"}`}>
                      {fmtINR(remaining)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <p className="text-[9px] text-slate-400 text-center">
              All bookings are permanently recorded for audit. Records are preserved after balance reaches ₹0.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
