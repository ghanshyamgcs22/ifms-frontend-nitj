// ProjectViewDialog.tsx
// Shows head-wise breakdown of booked amounts (fully approved requests only)
// and the remaining available balance per head and project-total.
// No expenditure values shown here — that is DA's domain.

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ApprovedRequest {
  requestId: string;
  requestNumber: string;
  purpose: string;
  invoiceNumber: string;
  headName: string;
  bookedAmount: number;   // requestedAmount — only shown when fully approved
  createdAt: string | null;
}

interface HeadBreakdown {
  headId: string;
  headName: string;
  headType: string;
  releasedAmount: number;
  bookedAmount: number;       // sum of approved requestedAmounts under this head
  availableBalance: number;   // Released − Booked + (Booked − Actual)
  requests: ApprovedRequest[];
}

export interface ProjectForViewDialog {
  id: string;
  gpNumber: string;
  projectName: string;
  department: string;
  totalSanctionedAmount: number;
  totalReleasedAmount: number;
  amountBookedByPI: number;
  actualExpenditure: number;
  availableBalance: number;
  heads: HeadBreakdown[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  project: ProjectForViewDialog | null;
  loading?: boolean;
}

// ── Formatter ─────────────────────────────────────────────────────────────────
const fmtINR = (n: number) =>
  "₹" + parseFloat(String(n || 0)).toLocaleString("en-IN");

const fmtDate = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—;

// ─────────────────────────────────────────────────────────────────────────────
export const ProjectViewDialog = ({ open, onClose, project, loading }: Props) => {
  if (!open) return null;

  const released  = project?.totalReleasedAmount ?? 0;
  const booked    = project?.amountBookedByPI    ?? 0;
  const actual    = project?.actualExpenditure   ?? 0;
  // Remaining = Released − Booked + (Booked − Actual)
  const remaining = Math.max(0, released - booked + Math.max(0, booked - actual));

  // Only heads that have at least one fully approved request
  const headsWithBookings = (project?.heads ?? []).filter(
    (h) => h.requests && h.requests.length > 0
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-0">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-gray-200 bg-white sticky top-0 z-10">
          {loading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          ) : (
            <>
              <p className="text-[11px] font-mono font-bold text-gray-400">
                {project?.gpNumber}
              </p>
              <DialogTitle className="text-base font-bold text-gray-900 leading-snug">
                {project?.projectName}
              </DialogTitle>
              <p className="text-xs text-gray-400 mt-0.5">{project?.department}</p>
            </>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
          </div>
        ) : !project ? (
          <div className="py-12 text-center text-gray-400 text-sm">No data available.</div>
        ) : (
          <div className="px-6 py-5 space-y-5 bg-gray-50">

            {/* ── Project summary strip ─────────────────────────────── */}
            <div className="grid grid-cols-3 divide-x divide-gray-200 border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
              <div className="px-5 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">
                  Total Released
                </p>
                <p className="text-base font-bold text-gray-800 font-mono">
                  {fmtINR(released)}
                </p>
              </div>
              <div className="px-5 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">
                  Total Booked
                </p>
                <p className="text-base font-bold text-gray-800 font-mono">
                  {fmtINR(booked)}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">Approved requests only</p>
              </div>
              <div className="px-5 py-3 bg-blue-50">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">
                  Remaining Balance
                </p>
                <p className="text-base font-bold text-blue-700 font-mono">
                  {fmtINR(remaining)}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Released − Booked + (Booked − Actual)
                </p>
              </div>
            </div>

            {/* ── Head-wise breakdown ───────────────────────────────── */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">
                Head-wise Booking Detail
              </p>

              {headsWithBookings.length === 0 ? (
                <div className="text-center py-10 bg-white border border-gray-200 rounded-lg">
                  <Clock className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 font-medium">
                    No fully approved bookings yet
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Booked amounts appear here once requests complete all approval stages (DA → AR → DR).
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {headsWithBookings.map((head) => {
                    const headUnused    = Math.max(0, head.bookedAmount - (head as any).actualExpenditure || 0);
                    const headRemaining = head.availableBalance ?? Math.max(0, head.releasedAmount - head.bookedAmount);

                    return (
                      <div
                        key={head.headId}
                        className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm"
                      >
                        {/* Head header */}
                        <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-gray-800">{head.headName}</p>
                            {head.headType && (
                              <span className="text-[10px] font-medium text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded uppercase tracking-wide">
                                {head.headType}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-5 text-right">
                            <div>
                              <p className="text-[9px] text-gray-400 uppercase tracking-wide">Released</p>
                              <p className="text-xs font-semibold font-mono text-gray-700">
                                {fmtINR(head.releasedAmount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[9px] text-gray-400 uppercase tracking-wide">Booked</p>
                              <p className="text-xs font-semibold font-mono text-gray-700">
                                {fmtINR(head.bookedAmount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[9px] text-gray-400 uppercase tracking-wide">Remaining</p>
                              <p className="text-xs font-bold font-mono text-blue-700">
                                {fmtINR(headRemaining)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Per-request table — ONLY fully approved requests */}
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/50">
                              {["Request No.", "Purpose", "Invoice No.", "Date", "Amount Booked (₹)"].map((h) => (
                                <th
                                  key={h}
                                  className="text-left text-[9px] font-semibold uppercase tracking-wider text-gray-400 px-4 py-2"
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {head.requests.map((req) => (
                              <tr key={req.requestId} className="hover:bg-gray-50/60 transition-colors">
                                <td className="px-4 py-3 text-xs font-mono font-semibold text-gray-700 whitespace-nowrap">
                                  {req.requestNumber || req.requestId.slice(-6).toUpperCase()}
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-600 max-w-[140px] truncate">
                                  {req.purpose || "—}
                                </td>
                                <td className="px-4 py-3 text-xs font-mono text-gray-500 whitespace-nowrap">
                                  {req.invoiceNumber || "—}
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                                  {fmtDate(req.createdAt)}
                                </td>
                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                  <span className="inline-flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                                    <span className="text-sm font-bold font-mono text-gray-800">
                                      {fmtINR(req.bookedAmount)}
                                    </span>
                                  </span>
                                </td>
                              </tr>
                            ))}

                            {/* Head subtotal if >1 request */}
                            {head.requests.length > 1 && (
                              <tr className="bg-gray-50 border-t-2 border-gray-200">
                                <td
                                  colSpan={4}
                                  className="px-4 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide"
                                >
                                  Subtotal — {head.headName}
                                </td>
                                <td className="px-4 py-2 text-right">
                                  <span className="text-sm font-bold font-mono text-gray-800">
                                    {fmtINR(
                                      head.requests.reduce((s, r) => s + r.bookedAmount, 0)
                                    )}
                                  </span>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Grand total footer ────────────────────────────────── */}
            {headsWithBookings.length > 1 && (
              <div className="bg-white border border-gray-200 rounded-lg px-5 py-3 flex items-center justify-between shadow-sm">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Grand Total — All Heads
                </p>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-[9px] text-gray-400 uppercase tracking-wide">Total Booked</p>
                    <p className="text-sm font-bold font-mono text-gray-900">{fmtINR(booked)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-gray-400 uppercase tracking-wide">Remaining Balance</p>
                    <p className="text-sm font-bold font-mono text-blue-700">{fmtINR(remaining)}</p>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};