import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import {
  Loader2, PlusCircle, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Clock, BookOpen, Wallet,
  AlertCircle, Search,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface BudgetRequest {
  id: string;
  requestNumber?: string;
  gpNumber: string;
  purpose: string;
  amount: number;
  actualExpenditure: number;
  status: string;
  currentStage: string;
  createdAt: string;
  headName?: string;
  invoiceNumber?: string;
}

interface Project {
  id: string;
  gpNumber: string;
  projectName: string;
  department: string;
  projectStartDate: string;
  projectEndDate: string;
  totalSanctionedAmount: number;
  totalReleasedAmount: number;
  amountBookedByPI: number;
  actualExpenditure: number;
  expenditureComplete: boolean;
  approvedRequestCount: number;
  filledExpenditureCount: number;
  availableBalance: number;
  status: string;
}

const API      = "https://ifms-backend-nitj.onrender.com/api";
const PI_EMAIL = "pi@ifms.edu";

const fmtINR = (n: number) =>
  "₹" + parseFloat(String(n || 0)).toLocaleString("en-IN");
const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const StatusLabel = ({ status, stage }: { status: string; stage: string }) => {
  if (status === "approved")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 border border-green-300 bg-green-50 px-2 py-0.5 rounded">
        <CheckCircle2 className="h-3 w-3" /> Approved
      </span>
    );
  if (status === "rejected")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 border border-red-300 bg-red-50 px-2 py-0.5 rounded">
        <XCircle className="h-3 w-3" /> Rejected
      </span>
    );
  const map: Record<string, string> = { da: "Pending at DA", ar: "Pending at AR", dr: "Pending at DR" };
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 border border-blue-300 bg-blue-50 px-2 py-0.5 rounded">
      <Clock className="h-3 w-3" /> {map[stage] ?? stage.toUpperCase()}
    </span>
  );
};

const Stat = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="px-8 py-5 border-r border-gray-200 last:border-r-0">
    <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-1">{label}</p>
    <p className="text-2xl font-bold text-gray-900 font-mono">{value}</p>
    {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
  </div>
);

const PIDashboard = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [requests, setRequests] = useState<BudgetRequest[]>([]);
  const [loadingP, setLoadingP] = useState(true);
  const [loadingR, setLoadingR] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // ── Search state ─────────────────────────────────────────────────────────
  const [projectSearch, setProjectSearch] = useState("");

  useEffect(() => { fetchProjects(); fetchRequests(); }, []);

  const fetchProjects = async () => {
    try {
      setLoadingP(true);
      const r = await fetch(`${API}/get-pi-projects.php?piEmail=${encodeURIComponent(PI_EMAIL)}`);
      const d = await r.json();
      if (d.success) {
        setProjects(d.data || []);
        setExpanded(new Set((d.data || []).map((p: Project) => p.id)));
      } else toast.error(d.message);
    } catch { toast.error("Failed to load projects"); }
    finally { setLoadingP(false); }
  };

  const fetchRequests = async () => {
    try {
      setLoadingR(true);
      const r = await fetch(`${API}/get-pi-budget-requests.php?piEmail=${encodeURIComponent(PI_EMAIL)}`);
      const d = await r.json();
      if (d.success) setRequests(d.data || []);
      else toast.error(d.message);
    } catch { toast.error("Failed to load requests"); }
    finally { setLoadingR(false); }
  };

  const toggle = (id: string) =>
    setExpanded(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // ── Filter projects by search ─────────────────────────────────────────────
  const filteredProjects = projects.filter(p => {
    const q = projectSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      p.gpNumber?.toLowerCase().includes(q) ||
      p.projectName?.toLowerCase().includes(q) ||
      p.department?.toLowerCase().includes(q)
    );
  });

  const totalReleased  = projects.reduce((s, p) => s + (p.totalReleasedAmount || 0), 0);
  const totalBooked    = projects.reduce((s, p) => s + (p.amountBookedByPI    || 0), 0);
  const totalAvailable = projects.reduce((s, p) => s + (p.availableBalance    || 0), 0);

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">PI Dashboard</h1>
              <p className="text-sm text-gray-500 mt-0.5">Principal Investigator · Research Fund Management</p>
            </div>
            <Button
              onClick={() => navigate("/pi/book-budget")}
              className="bg-blue-700 hover:bg-blue-800 text-white h-9 px-5 text-sm font-semibold rounded"
            >
              <PlusCircle className="h-4 w-4 mr-2" />Book Budget
            </Button>
          </div>

          {/* Summary bar */}
          <div className="bg-white border border-gray-200 rounded-lg flex divide-x divide-gray-200 shadow-sm">
            <Stat label="Total Released" value={fmtINR(totalReleased)}
              sub={`Across ${projects.length} project${projects.length !== 1 ? "s" : ""}`} />
            <Stat label="Booked by You" value={fmtINR(totalBooked)}
              sub={totalReleased > 0 ? `${((totalBooked / totalReleased) * 100).toFixed(0)}% of released` : undefined} />
            <Stat label="Available Balance" value={fmtINR(totalAvailable)} sub="Ready to book" />
          </div>

          {/* Projects header + search */}
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold text-gray-700 shrink-0">
              My Projects
              <span className="ml-2 font-normal text-gray-400">
                ({filteredProjects.length}{projectSearch && filteredProjects.length !== projects.length ? ` of ${projects.length}` : ""})
              </span>
            </h2>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <Input
                placeholder="Search by project name or GP No…"
                value={projectSearch}
                onChange={e => setProjectSearch(e.target.value)}
                className="pl-8 h-8 text-xs border-gray-200 bg-white"
              />
            </div>
          </div>

          {/* Projects list */}
          {loadingP ? (
            <div className="flex justify-center py-16 bg-white rounded-lg border border-gray-200">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center py-14 bg-white rounded-lg border border-gray-200 text-gray-400">
              <BookOpen className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">
                {projectSearch ? `No projects matching "${projectSearch}".` : "No projects with released funds yet."}
              </p>
              {projectSearch && (
                <button onClick={() => setProjectSearch("")} className="mt-1 text-xs text-blue-700 hover:underline">
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProjects.map(p => {
                const sanctioned = p.totalSanctionedAmount || 0;
                const released   = p.totalReleasedAmount   || 0;
                const booked     = p.amountBookedByPI      || 0;
                const actual     = p.actualExpenditure     || 0;
                const available  = p.availableBalance      || 0;
                const isOpen     = expanded.has(p.id);
                const projReqs   = requests.filter(r => r.gpNumber === p.gpNumber);
                const relPct     = sanctioned > 0 ? Math.min((released / sanctioned) * 100, 100) : 0;
                const bokPct     = released   > 0 ? Math.min((booked   / released)   * 100, 100) : 0;

                const approved  = p.approvedRequestCount   || 0;
                const filled    = p.filledExpenditureCount || 0;
                const expDone   = p.expenditureComplete;

                return (
                  <div key={p.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">

                    {/* Project info */}
                    <div className="px-6 py-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono font-bold text-gray-500">{p.gpNumber}</span>
                            <span className="text-[10px] font-semibold border px-2 py-0.5 rounded text-gray-500 border-gray-300">
                              {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                            </span>
                          </div>
                          <p className="text-base font-bold text-gray-900">{p.projectName}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {p.department} &nbsp;·&nbsp; {fmtDate(p.projectStartDate)} – {fmtDate(p.projectEndDate)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[11px] text-gray-400 font-medium">Available Balance</p>
                          <p className="text-2xl font-bold text-blue-700 font-mono">{fmtINR(available)}</p>
                        </div>
                      </div>

                      {/* Progress bars */}
                      <div className="mt-5 space-y-2">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Released &nbsp;<span className="font-semibold text-gray-700">{fmtINR(released)}</span> of {fmtINR(sanctioned)}</span>
                          <span>{relPct.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full" style={{ width: `${relPct}%` }} />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Booked &nbsp;<span className="font-semibold text-gray-700">{fmtINR(booked)}</span> of released</span>
                          <span>{bokPct.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gray-500 rounded-full" style={{ width: `${bokPct}%` }} />
                        </div>
                      </div>

                      {/* Four figures */}
                      <div className="mt-5 grid grid-cols-4 divide-x divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
                        {[
                          { label: "Sanctioned",  value: sanctioned },
                          { label: "Released",    value: released   },
                          { label: "Booked",      value: booked     },
                          { label: "Actual Exp.", value: actual     },
                        ].map((c, i) => (
                          <div key={c.label} className="px-4 py-3 bg-gray-50">
                            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-0.5">{c.label}</p>
                            <p className="text-sm font-bold text-gray-800 font-mono">{fmtINR(c.value)}</p>
                            {i === 3 && approved > 0 && (
                              <p className={`text-[10px] mt-0.5 font-medium ${expDone ? "text-green-600" : "text-amber-600"}`}>
                                {expDone ? "All filled" : `${filled}/${approved} filled`}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

                      {approved > 0 && !expDone && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          DA has not yet entered actual expenditure for all approved requests
                          ({filled}/{approved} filled).
                        </div>
                      )}
                    </div>

                    {/* Toggle */}
                    <button
                      onClick={() => toggle(p.id)}
                      className="w-full flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-600 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Wallet className="h-3.5 w-3.5 text-gray-400" />
                        Budget Requests
                        {projReqs.length > 0 && (
                          <span className="bg-blue-700 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                            {projReqs.length}
                          </span>
                        )}
                      </span>
                      {isOpen
                        ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" />
                        : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
                    </button>

                    {/* Requests table */}
                    {isOpen && (
                      <div className="border-t border-gray-100">
                        {loadingR ? (
                          <div className="flex justify-center py-6">
                            <Loader2 className="h-4 w-4 animate-spin text-gray-300" />
                          </div>
                        ) : projReqs.length === 0 ? (
                          <div className="text-center py-6">
                            <p className="text-xs text-gray-400">No requests for this project yet.</p>
                            <button onClick={() => navigate("/pi/book-budget")}
                              className="mt-1 text-xs text-blue-700 hover:underline font-medium">
                              + Book budget
                            </button>
                          </div>
                        ) : (
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-100">
                                {[
                                  "Head", "Purpose", "Invoice No.", "Date",
                                  "Booked (₹)", "Actual Exp. (₹)", "Status",
                                ].map(h => (
                                  <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400 px-5 py-2.5">
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {projReqs.map(req => {
                                const amount    = parseFloat(String(req.amount || 0));
                                const reqActual = parseFloat(String(req.actualExpenditure || 0));
                                const isApproved = req.status === "approved";
                                return (
                                  <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-5 py-3 font-semibold text-gray-800 text-xs whitespace-nowrap">
                                      {req.headName || "—"}
                                    </td>
                                    <td className="px-5 py-3 text-gray-500 text-xs max-w-[130px] truncate">
                                      {req.purpose || "—"}
                                    </td>
                                    <td className="px-5 py-3 text-gray-500 text-xs font-mono whitespace-nowrap">
                                      {req.invoiceNumber || "—"}
                                    </td>
                                    <td className="px-5 py-3 text-gray-400 text-xs whitespace-nowrap">
                                      {fmtDate(req.createdAt)}
                                    </td>
                                    <td className="px-5 py-3 font-bold text-gray-900 text-sm font-mono text-right whitespace-nowrap">
                                      {fmtINR(amount)}
                                    </td>
                                    <td className="px-5 py-3 text-right whitespace-nowrap">
                                      {!isApproved ? (
                                        <span className="text-xs text-gray-300 italic">—</span>
                                      ) : reqActual > 0 ? (
                                        <span className="text-sm font-bold text-gray-800 font-mono">{fmtINR(reqActual)}</span>
                                      ) : (
                                        <span className="text-xs text-amber-600 font-medium italic">Pending DA entry</span>
                                      )}
                                    </td>
                                    <td className="px-5 py-3 whitespace-nowrap">
                                      <StatusLabel status={req.status} stage={req.currentStage} />
                                    </td>
                                  </tr>
                                );
                              })}

                              {projReqs.length > 1 && (
                                <tr className="bg-gray-50 border-t-2 border-gray-200">
                                  <td colSpan={4} className="px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                    Totals
                                  </td>
                                  <td className="px-5 py-2.5 text-right font-bold text-gray-900 font-mono text-sm">
                                    {fmtINR(projReqs.reduce((s, r) => s + parseFloat(String(r.amount || 0)), 0))}
                                  </td>
                                  <td className="px-5 py-2.5 text-right font-bold text-gray-900 font-mono text-sm">
                                    {actual > 0 ? fmtINR(actual) : <span className="text-gray-300">—</span>}
                                  </td>
                                  <td />
                                </tr>
                              )}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default PIDashboard;
