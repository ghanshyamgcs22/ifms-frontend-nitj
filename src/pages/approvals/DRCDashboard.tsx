// pages/approvals/DRCDashboard.tsx

import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequestFullDetail, RequestDetailData } from "@/components/RequestViewDetail";
import { useState, useEffect, useRef } from "react";
import {
  Search, Clock, Loader2, Lock, ArrowRight, RotateCcw,
  ArrowLeftRight, ChevronDown, MessageSquare,
  CornerUpLeft, BadgeCheck, AlertCircle, XCircle, CheckCircle, Star,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const API = import.meta.env.VITE_API_URL;

interface BudgetRequest {
  id: string;
  requestNumber?: string;
  gpNumber: string;
  fileNumber?: string;
  projectTitle: string;
  piName: string;
  department: string;
  purpose: string;
  description: string;
  material?: string;
  expenditure?: string;
  mode?: string;
  amount: number;
  totalSanctionedAmount?: number;
  headSanctionedAmount?: number;
  headBookedAmount?: number;
  projectType: string;
  invoiceNumber: string;
  headName?: string;
  headType?: string;
  status: string;
  currentStage: string;
  createdAt: string;
  projectEndDate?: string;
  daRemarks?: string;
  arRemarks?: string;
  drRemarks?: string;
  drcOfficeRemarks?: string;
  drcRcRemarks?: string;
  drcRemarks?: string;
  directorRemarks?: string;
  quotationFile?: string;
  quotationFileName?: string;
  latestQuery?: any;
  approvalHistory?: any[];
  latestRemark?: string;
  approvalType?: "admin" | "admin_cum_financial";
  rejectedBy?: string;
  rejectedAtStage?: string;
  rejectedAtStageLabel?: string;
  rejectionRemarks?: string;
  rejectedAt?: string;
  specialApproval?: boolean;
  projectId?: string;
}

type ActionType = "forward" | "special_approve" | "query" | "sendback" | "reject" | null;

const formatDate   = (d: string) => !d ? "—" : new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const formatAmount = (n: number) => `₹${(n / 100000).toFixed(2)}L`;

const canAct = (r: BudgetRequest) =>
  r.currentStage === "drc" &&
  (r.status === "drc_rc_forwarded" || r.status === "sent_back_to_drc");

const toDetailData = (r: BudgetRequest): RequestDetailData => ({
  id:               r.id,
  requestNumber:    r.requestNumber,
  gpNumber:         r.gpNumber,
  fileNumber:       r.fileNumber,
  projectTitle:     r.projectTitle,
  piName:           r.piName,
  department:       r.department,
  headName:         r.headName,
  headType:         r.headType,
  projectType:      r.projectType,
  amount:           r.amount,
  headSanctionedAmount: r.headSanctionedAmount,
  headBookedAmount:     r.headBookedAmount,
  invoiceNumber:    r.invoiceNumber,
  createdAt:        r.createdAt,
  projectEndDate:   r.projectEndDate,
  purpose:          r.purpose,
  description:      r.description,
  material:         r.material,
  expenditure:      r.expenditure,
  mode:             r.mode,
  quotationFile:    r.quotationFile,
  quotationFileName:r.quotationFileName,
  daRemarks:        r.daRemarks,
  arRemarks:        r.arRemarks,
  drRemarks:        r.drRemarks,
  drcOfficeRemarks: r.drcOfficeRemarks,
  drcRcRemarks:     r.drcRcRemarks,
  drcRemarks:       r.drcRemarks,
  directorRemarks:  r.directorRemarks,
  latestQuery:      r.latestQuery,
  currentStage:     r.currentStage,
  status:           r.status,
  approvalHistory:  r.approvalHistory,
});

// ── Approval Type Read-Only Banner ─────────────────────────────────────────
const ApprovalTypeBanner = ({ type }: { type: "admin" | "admin_cum_financial" | undefined }) => {
  if (!type) return (
    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-300 rounded-lg">
      <AlertCircle className="h-4 w-4 text-red-600 shrink-0"/>
      <p className="text-xs text-red-800">
        <strong>Approval type not set.</strong> DR (R&C) must set this before forwarding.
        Please send this request back to DR (R&C) to resolve.
      </p>
    </div>
  );

  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl border-2 ${
      type === "admin" ? "bg-slate-50 border-slate-300" : "bg-indigo-50 border-indigo-300"
    }`}>
      <BadgeCheck className={`h-5 w-5 shrink-0 ${type === "admin" ? "text-slate-600" : "text-indigo-600"}`}/>
      <div className="flex-1">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Approval Type — set by DR (R&C)
        </p>
        <p className={`text-sm font-bold mt-0.5 ${type === "admin" ? "text-slate-800" : "text-indigo-800"}`}>
          {type === "admin" ? "Admin Approval" : "Admin cum Financial Approval"}
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5 italic">
          This is read-only. Contact DR (R&C) to change.
        </p>
      </div>
      <Badge className={type === "admin"
        ? "bg-slate-200 text-slate-700 text-[10px] self-start"
        : "bg-indigo-100 text-indigo-700 text-[10px] self-start"
      }>
        {type === "admin" ? "Admin" : "Admin cum Financial"}
      </Badge>
    </div>
  );
};

// ── Split button (Query / Send Back / Reject) ───────────────────────────────
const ActionDropdown = ({
  onQuery, onSendBack, onReject,
}: { onQuery: () => void; onSendBack: () => void; onReject: () => void }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        onClick={() => { setOpen(false); onQuery(); }}
        className="h-7 text-xs px-2.5 rounded-l-md border border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap"
      >
        <MessageSquare className="h-3 w-3" /> Query / More
      </button>
      <button
        onClick={() => setOpen(v => !v)}
        className="h-7 w-6 rounded-r-md border border-l-0 border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 flex items-center justify-center transition-colors"
      >
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute top-8 left-0 z-50 min-w-[210px] bg-white border border-slate-200 rounded-lg shadow-lg py-1 overflow-hidden">
          <button onClick={() => { setOpen(false); onQuery(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left hover:bg-amber-50 transition-colors">
            <MessageSquare className="h-3.5 w-3.5 text-amber-600 shrink-0"/>
            <div>
              <p className="font-semibold text-slate-800">Query to PI</p>
              <p className="text-slate-400 text-[10px] mt-0.5">Send clarification request to PI</p>
            </div>
          </button>
          <div className="h-px bg-slate-100 mx-2"/>
          <button onClick={() => { setOpen(false); onSendBack(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left hover:bg-orange-50 transition-colors">
            <CornerUpLeft className="h-3.5 w-3.5 text-orange-600 shrink-0"/>
            <div>
              <p className="font-semibold text-slate-800">Send Back to DR (R&C)</p>
              <p className="text-slate-400 text-[10px] mt-0.5">Return for re-evaluation</p>
            </div>
          </button>
          <div className="h-px bg-slate-100 mx-2"/>
          <button onClick={() => { setOpen(false); onReject(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left hover:bg-red-50 transition-colors">
            <XCircle className="h-3.5 w-3.5 text-red-600 shrink-0"/>
            <div>
              <p className="font-semibold text-red-700">Reject Request</p>
              <p className="text-slate-400 text-[10px] mt-0.5">Permanently reject this request</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
const DRCDashboard = () => {
  const [pendingRequests,   setPendingRequests]   = useState<BudgetRequest[]>([]);
  const [completedRequests, setCompletedRequests] = useState<BudgetRequest[]>([]);
  const [forwardedReqs,     setForwardedReqs]     = useState<BudgetRequest[]>([]);
  const [loading,           setLoading]           = useState(true);
  const [selectedRequest,   setSelectedRequest]   = useState<BudgetRequest | null>(null);
  const [dialogOpen,        setDialogOpen]        = useState(false);
  const [remarks,           setRemarks]           = useState("");
  const [actionLoading,     setActionLoading]     = useState(false);
  const [pendingAction,     setPendingAction]     = useState<ActionType>(null);
  const [search,            setSearch]            = useState("");

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const r1 = await fetch(`${API}/get-requests-by-stage.php?stage=drc&type=pending&summary=1&limit=50`);
      const d1 = await r1.json(); setPendingRequests(d1.data || []);
      const r2 = await fetch(`${API}/get-requests-by-stage.php?stage=drc&type=completed&summary=1&limit=50`);
      const d2 = await r2.json(); setCompletedRequests(d2.data || []);
      const r3 = await fetch(`${API}/get-requests-by-stage.php?stage=drc&type=forwarded&summary=1&limit=50`);
      const d3 = await r3.json(); setForwardedReqs(d3.data || []);
    } catch { toast.error("Failed to load requests"); }
    finally { setLoading(false); }
  };

  const handleAction = async () => {
    if (!selectedRequest || !pendingAction) return;

    if ((pendingAction === "forward" || pendingAction === "special_approve") && !selectedRequest.approvalType) {
      toast.error("Approval type not set by DR (R&C). Send this request back to DR (R&C) first.");
      return;
    }
    if (pendingAction === "special_approve" && !remarks.trim()) {
      toast.error("Remarks are required for Special Approval."); return;
    }
    if (["query", "sendback", "reject"].includes(pendingAction) && !remarks.trim()) {
      toast.error("Please enter remarks"); return;
    }

    try {
      setActionLoading(true);
      let endpoint = "";
      let body: any = { requestId: selectedRequest.id, remarks, actionBy: "DRC" };

      if (pendingAction === "forward") {
        endpoint = `${API}/drc-forward-director.php`;
        body.forwardedBy = "DRC";
      } else if (pendingAction === "special_approve") {
        endpoint = `${API}/drc-special-approve.php`;
        body.approvedBy = "DRC";
      } else if (pendingAction === "query") {
        endpoint = `${API}/raise-query.php`;
        body.queryTo = "pi"; body.queryBy = "drc";
      } else if (pendingAction === "sendback") {
        endpoint = `${API}/sendback-request.php`;
        body.sendBackTo = "drc_rc"; body.sentBackBy = "DRC";
      } else if (pendingAction === "reject") {
        endpoint = `${API}/reject-request.php`;
        body.stage = "drc"; body.rejectedBy = "DRC";
      }

      const res  = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      const approvalLabel = selectedRequest.approvalType === "admin" ? "Admin Approval" : "Admin cum Financial Approval";
      const successMessages: Record<string, string> = {
        forward:        `Forwarded to Director (${approvalLabel}).`,
        special_approve:`Approved by DRC (Special — ${approvalLabel}).`,
        query:          "Query raised to PI.",
        sendback:       "Sent back to DR (R&C).",
        reject:         "Request rejected.",
      };
      toast.success(successMessages[pendingAction]);

      resetDialog();
      await fetchRequests();
    } catch (e: any) { toast.error(e.message || "Action failed"); }
    finally { setActionLoading(false); }
  };

  const resetDialog = () => {
    setDialogOpen(false); setPendingAction(null);
    setRemarks(""); setSelectedRequest(null);
  };

  // Single search: GP number, file number, PI name, purpose, date, approval type
  const filterReqs = (list: BudgetRequest[]) => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(r => {
      const approvalLabel = r.approvalType === "admin"
        ? "admin"
        : r.approvalType === "admin_cum_financial"
        ? "admin cum financial"
        : "";
      return (
        r.gpNumber?.toLowerCase().includes(q) ||
        r.fileNumber?.toLowerCase().includes(q) ||
        r.piName?.toLowerCase().includes(q) ||
        r.purpose?.toLowerCase().includes(q) ||
        formatDate(r.createdAt).toLowerCase().includes(q) ||
        approvalLabel.includes(q)
      );
    });
  };

  const openRequest = async (r: BudgetRequest, action?: ActionType) => {
    setSelectedRequest(r); // Set summarized data immediately
    setRemarks("");
    setPendingAction(action || null);
    setDialogOpen(true);

    // Fetch full details (history, remarks, material, description etc.) which are excluded in summary mode
    try {
      const res = await fetch(`${API}/get-requests-by-stage.php?requestId=${r.id}`);
      const data = await res.json();
      if (data.success && data.data && data.data.length > 0) {
        setSelectedRequest(data.data[0]);
      }
    } catch (e) {
      console.error("Failed to fetch full details:", e);
    }
  };

  const fromDrcRc         = pendingRequests.filter(r => r.status === "drc_rc_forwarded");
  const returnedFromDir   = pendingRequests.filter(r => r.status === "sent_back_to_drc");
  const forwarded         = forwardedReqs;
  const sentbackToDrcRc   = completedRequests.filter(r => r.status === "sent_back_to_drc_rc");
  const approved          = completedRequests.filter(r => r.status === "approved");
  const rejected          = completedRequests.filter(r => r.status === "rejected");
  const speciallyApproved = approved.filter(r => r.specialApproval === true || r.currentStage === "drc");

  const dialogTitle = () => {
    if (pendingAction === "forward")         return "Forward to Director";
    if (pendingAction === "special_approve") return "Special Approval by DRC";
    if (pendingAction === "query")           return "Query to PI";
    if (pendingAction === "sendback")        return "Send Back to DR (R&C)";
    if (pendingAction === "reject")          return "Reject Request";
    return "Request Details";
  };

  const dialogDesc = () => {
    if (pendingAction === "forward")         return "Approval type was set by DR (R&C) and is read-only here. Confirm to forward to Director.";
    if (pendingAction === "special_approve") return "DRC Special Approval — request approved directly at DRC level, NOT forwarded to Director. Remarks are required.";
    if (pendingAction === "query")           return "Raise a query to the PI. Stage will not change until PI responds.";
    if (pendingAction === "sendback")        return "Return to DR (R&C) for re-evaluation. Remarks are required.";
    if (pendingAction === "reject")          return "Permanently reject this request. Remarks are required.";
    return "View-only mode.";
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-slate-50 to-gray-50">
        <div className="space-y-6 p-6">

          {/* Header */}
          <div className="bg-white/70 backdrop-blur-lg border border-indigo-200/60 rounded-xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">DRC Dashboard</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Penultimate stage before Director &nbsp;
                <span className="text-slate-400 font-mono text-[11px]">
                  DA → AR → DR → DRC Office → DR (R&C) → <strong className="text-indigo-600">DRC</strong> → Director
                </span>
              </p>
            </div>
            <Button onClick={fetchRequests} variant="outline" size="sm">Refresh</Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-7 gap-3">
            {[
              { label: "From DR (R&C)",      value: fromDrcRc.length,         color: "text-indigo-600",  icon: <Clock          className="h-4 w-4 text-indigo-500" />, sub: "Freshly forwarded" },
              { label: "Returned by Director", value: returnedFromDir.length,   color: "text-blue-600",    icon: <ArrowLeftRight className="h-4 w-4 text-blue-500"   />, sub: "Director sent back" },
              { label: "Fwd to Director",      value: forwarded.length,         color: "text-emerald-600", icon: <ArrowRight     className="h-4 w-4 text-emerald-500"/>, sub: "Awaiting final decision" },
              { label: "Sent Back to DR (R&C)",   value: sentbackToDrcRc.length,   color: "text-orange-600",  icon: <RotateCcw      className="h-4 w-4 text-orange-500" />, sub: "Returned for re-eval" },
              { label: "Special Approvals",    value: speciallyApproved.length, color: "text-amber-600",   icon: <Star           className="h-4 w-4 text-amber-500"  />, sub: "Approved by DRC directly" },
              { label: "Approved",             value: approved.length,          color: "text-emerald-600", icon: <CheckCircle    className="h-4 w-4 text-emerald-500"/>, sub: "Director approved" },
              { label: "Rejected",             value: rejected.length,          color: "text-red-600",     icon: <XCircle        className="h-4 w-4 text-red-500"    />, sub: "Rejected at DRC" },
            ].map(c => (
              <Card key={c.label} className="border border-slate-200/60 bg-white/70 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
                  <CardTitle className="text-[11px] font-medium text-slate-600 leading-tight">{c.label}</CardTitle>{c.icon}
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
                  <p className="text-xs text-slate-400 mt-0.5">{c.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Main table */}
          <Card className="border border-slate-200/60 bg-white/70 backdrop-blur-lg shadow-lg">
            <CardHeader className="border-b border-slate-100">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-800">Budget Requests</CardTitle>
                  <CardDescription className="mt-0.5">
                    Approval type is set by <strong>DR (R&C)</strong> and is read-only here. DRC can forward to Director or use <strong className="text-amber-600">Special Approval</strong>.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none"/>
                    <Input
                      placeholder="Search GP, file no., PI, purpose, date, approval type…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="pl-8 h-8 w-72 text-xs border-slate-200"
                    />
                  </div>
                  {search && (
                    <Button variant="ghost" size="sm" onClick={() => setSearch("")} className="h-8 text-[11px] text-slate-500 hover:text-red-500 px-2">
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-400 mr-2"/>
                  <p className="text-slate-500 text-sm">Loading…</p>
                </div>
              ) : (
                <Tabs defaultValue="from-drc-rc">
                  <div className="px-4 pt-3">
                    <TabsList className="bg-indigo-50">
                      <TabsTrigger value="from-drc-rc">From DR (R&amp;C) ({filterReqs(fromDrcRc).length})</TabsTrigger>
                      <TabsTrigger value="from-director">Returned by Director ({filterReqs(returnedFromDir).length})</TabsTrigger>
                      <TabsTrigger value="forwarded">Forwarded to Director ({filterReqs(forwarded).length})</TabsTrigger>
                      <TabsTrigger value="sentback">Sent Back to DR (R&amp;C) ({filterReqs(sentbackToDrcRc).length})</TabsTrigger>
                      <TabsTrigger value="approved">
                        Approved ({filterReqs(approved).length})
                        {filterReqs(approved).length > 0 && <span className="ml-1 bg-emerald-500 text-white text-[9px] font-bold px-1 py-0.5 rounded">{filterReqs(approved).length}</span>}
                      </TabsTrigger>
                      <TabsTrigger value="rejected">Rejected ({filterReqs(rejected).length})</TabsTrigger>
                    </TabsList>
                  </div>
                  <TabsContent value="from-drc-rc" className="px-4 pb-4 mt-3">
                    {filterReqs(fromDrcRc).length === 0
                      ? <EmptyState icon={<Clock className="h-10 w-10"/>} message="No matching requests"/>
                      : <PendingTable requests={filterReqs(fromDrcRc)} onView={openRequest} sourceLabel="DR (R&C)" remarksField="drcRcRemarks"/>}
                  </TabsContent>
                  <TabsContent value="from-director" className="px-4 pb-4 mt-3">
                    {filterReqs(returnedFromDir).length === 0
                      ? <EmptyState icon={<ArrowLeftRight className="h-10 w-10"/>} message="No matching requests"/>
                      : <PendingTable requests={filterReqs(returnedFromDir)} onView={openRequest} sourceLabel="Director" remarksField="directorRemarks"/>}
                  </TabsContent>
                  <TabsContent value="forwarded" className="px-4 pb-4 mt-3">
                    {filterReqs(forwarded).length === 0
                      ? <EmptyState icon={<ArrowRight className="h-10 w-10"/>} message="No matching requests"/>
                      : <HistoryTable requests={filterReqs(forwarded)} onView={r => openRequest(r)}/>}
                  </TabsContent>
                  <TabsContent value="sentback" className="px-4 pb-4 mt-3">
                    {filterReqs(sentbackToDrcRc).length === 0
                      ? <EmptyState icon={<RotateCcw className="h-10 w-10"/>} message="No matching requests"/>
                      : <HistoryTable requests={filterReqs(sentbackToDrcRc)} onView={r => openRequest(r)}/>}
                  </TabsContent>
                  <TabsContent value="approved" className="px-4 pb-4 mt-3">
                    {filterReqs(approved).length === 0
                      ? <EmptyState icon={<CheckCircle className="h-10 w-10"/>} message="No matching requests"/>
                      : <HistoryTable requests={filterReqs(approved)} onView={r => openRequest(r)}/>}
                  </TabsContent>
                  <TabsContent value="rejected" className="px-4 pb-4 mt-3">
                    {filterReqs(rejected).length === 0
                      ? <EmptyState icon={<XCircle className="h-10 w-10"/>} message="No matching requests"/>
                      : <RejectedTable requests={filterReqs(rejected)} onView={r => openRequest(r)}/>}
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={resetDialog}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {pendingAction === "special_approve" && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                  <Star className="h-3 w-3"/> Special Approval
                </span>
              )}
              {dialogTitle()}
            </DialogTitle>
            <DialogDescription>{dialogDesc()}</DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={
                  selectedRequest.status === "sent_back_to_drc"
                    ? "bg-blue-100 text-blue-800"
                    : selectedRequest.status === "approved" && selectedRequest.specialApproval
                    ? "bg-amber-100 text-amber-800"
                    : selectedRequest.status === "approved"
                    ? "bg-emerald-100 text-emerald-800"
                    : selectedRequest.status === "rejected"
                    ? "bg-red-100 text-red-800"
                    : "bg-indigo-100 text-indigo-800"
                }>
                  {selectedRequest.status === "sent_back_to_drc"                             ? "Returned by Director"
                  : selectedRequest.status === "approved" && selectedRequest.specialApproval  ? "Approved by DRC (Special)"
                  : selectedRequest.status === "approved"                                     ? "Approved by Director"
                  : selectedRequest.status === "rejected"                                     ? "Rejected"
                  : "Forwarded by DR (R&C)"}
                </Badge>
                {selectedRequest.specialApproval && (
                  <Badge className="bg-amber-100 text-amber-700 border border-amber-300">
                    <Star className="h-3 w-3 mr-1"/>DRC Special Approval
                  </Badge>
                )}
              </div>

              {selectedRequest.status === "rejected" && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-1.5">
                  <p className="text-xs font-bold text-red-700 flex items-center gap-1.5">
                    <XCircle className="h-3.5 w-3.5"/>
                    Rejected by {selectedRequest.rejectedAtStageLabel || selectedRequest.rejectedAtStage || "DRC"}
                  </p>
                  {selectedRequest.rejectedAt && <p className="text-xs text-red-500">Date: {formatDate(selectedRequest.rejectedAt)}</p>}
                  {selectedRequest.rejectionRemarks && <p className="text-xs text-red-800 italic mt-1">"{selectedRequest.rejectionRemarks}"</p>}
                </div>
              )}

              <RequestFullDetail
                request={toDetailData(selectedRequest)}
                viewerStage="drc"
                onFieldSaved={(updates) => {
                  setSelectedRequest(prev => prev ? { ...prev, ...updates } : prev);
                }}
              />

              {canAct(selectedRequest) && (
                <ApprovalTypeBanner type={selectedRequest.approvalType}/>
              )}

              {pendingAction && canAct(selectedRequest) && (
                <div className="space-y-1.5">
                  <Label className="text-sm">
                    {pendingAction === "forward"
                      ? "Remarks (Optional)"
                      : pendingAction === "special_approve"
                      ? "Approval Remarks (Required)"
                      : pendingAction === "reject"
                      ? "Rejection Reason (Required)"
                      : "Remarks (Required)"}
                  </Label>
                  <Textarea
                    placeholder={
                      pendingAction === "special_approve" ? "State the reason / authority for this special approval by DRC…"
                      : pendingAction === "query"    ? "Describe the clarification needed from PI…"
                      : pendingAction === "sendback" ? "Reason for returning to DR (R&C)…"
                      : pendingAction === "reject"   ? "State the reason for rejecting this request…"
                      : "Forwarding notes for Director (optional)…"
                    }
                    value={remarks} onChange={e => setRemarks(e.target.value)}
                    rows={pendingAction === "reject" || pendingAction === "special_approve" ? 4 : 3}
                    className={
                      pendingAction === "reject"            ? "border-red-300 focus:border-red-400"
                      : pendingAction === "special_approve" ? "border-amber-300 focus:border-amber-400"
                      : "border-indigo-200 focus:border-indigo-400"
                    }
                  />
                </div>
              )}

              {!pendingAction && canAct(selectedRequest) && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <p className="text-xs font-semibold text-slate-600">Select an action</p>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40"
                      disabled={!selectedRequest.approvalType}
                      onClick={() => setPendingAction("forward")}
                    >
                      <BadgeCheck className="h-3.5 w-3.5 mr-1"/>Forward to Director
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs border-amber-400 text-amber-600 hover:bg-amber-50" onClick={() => setPendingAction("query")}>
                      Query to PI
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs border-orange-400 text-orange-600 hover:bg-orange-50" onClick={() => setPendingAction("sendback")}>
                      <CornerUpLeft className="h-3.5 w-3.5 mr-1"/>Send Back to DR (R&amp;C)
                    </Button>
                    <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => setPendingAction("reject")}>
                      <XCircle className="h-3.5 w-3.5 mr-1"/>Reject
                    </Button>
                  </div>
                  <div className="pt-2 border-t border-slate-200">
                    <p className="text-[11px] text-slate-400 mb-2 flex items-center gap-1">
                      <Star className="h-3 w-3 text-amber-400"/> Special power — use only when Director approval is not required
                    </p>
                    <Button
                      size="sm"
                      className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-white shadow-sm disabled:opacity-40"
                      disabled={!selectedRequest.approvalType}
                      onClick={() => setPendingAction("special_approve")}
                    >
                      <Star className="h-3.5 w-3.5 mr-1.5"/>Special Approval by DRC
                    </Button>
                    {!selectedRequest.approvalType && (
                      <p className="text-[11px] text-red-500 mt-1.5 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3"/>Disabled — approval type must be set by DR (R&C) first
                      </p>
                    )}
                  </div>
                </div>
              )}

              {!canAct(selectedRequest) && !["approved", "rejected", "sent_back_to_drc_rc"].includes(selectedRequest.status) && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
                  <Lock className="h-5 w-5 text-amber-600 mt-0.5 shrink-0"/>
                  <p className="text-sm text-amber-800">Currently at <strong>{selectedRequest.currentStage.toUpperCase()}</strong> stage. View only.</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={resetDialog} disabled={actionLoading}>Cancel</Button>
            {selectedRequest && canAct(selectedRequest) && pendingAction && (
              <>
                {pendingAction === "reject" ? (
                  <Button onClick={handleAction} disabled={actionLoading || !remarks.trim()} variant="destructive">
                    {actionLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Rejecting…</> : <><XCircle className="h-4 w-4 mr-1"/>Confirm Reject</>}
                  </Button>
                ) : pendingAction === "special_approve" ? (
                  <Button
                    onClick={handleAction}
                    disabled={actionLoading || !remarks.trim() || !selectedRequest.approvalType}
                    className="bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    {actionLoading
                      ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Approving…</>
                      : <><Star className="h-4 w-4 mr-1"/>Approve (Special)</>}
                  </Button>
                ) : pendingAction === "forward" ? (
                  <Button
                    onClick={handleAction}
                    disabled={actionLoading || !selectedRequest.approvalType}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {actionLoading
                      ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Processing…</>
                      : selectedRequest.approvalType
                        ? <>Forward as {selectedRequest.approvalType === "admin" ? "Admin" : "Admin cum Financial"} →</>
                        : "Send Back to R&C First"}
                  </Button>
                ) : (
                  <Button
                    onClick={handleAction}
                    disabled={actionLoading}
                    className={
                      pendingAction === "query"    ? "bg-amber-500 hover:bg-amber-600"
                      : pendingAction === "sendback" ? "bg-orange-500 hover:bg-orange-600"
                      : ""
                    }
                  >
                    {actionLoading
                      ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Processing…</>
                      : pendingAction === "query"    ? <><MessageSquare className="h-4 w-4 mr-1"/>Send Query to PI</>
                      : pendingAction === "sendback" ? <><CornerUpLeft   className="h-4 w-4 mr-1"/>Send Back to DR (R&C)</>
                      : ""}
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────────

const EmptyState = ({ icon, message }: { icon: React.ReactNode; message: string }) => (
  <div className="flex flex-col items-center justify-center py-14 text-slate-400">
    <div className="mb-3 opacity-30">{icon}</div><p className="text-sm">{message}</p>
  </div>
);

const PendingTable = ({ requests, onView, sourceLabel, remarksField }: {
  requests: BudgetRequest[];
  onView: (r: BudgetRequest, action?: ActionType) => void;
  sourceLabel: string;
  remarksField: keyof BudgetRequest;
}) => (
  <div className="overflow-x-auto rounded-lg border border-slate-200">
    <Table>
      <TableHeader>
        <TableRow className="bg-slate-50">
          {["Date", "GP Number", "PI Name", "Purpose", "Amount", "Approval Type", "Latest Remark", "Actions"].map(h => (
            <TableHead key={h} className="text-[11px] font-semibold text-slate-600 py-2.5 px-3">{h}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map(r => (
          <TableRow key={r.id} className={`border-b border-slate-100 hover:bg-slate-50/50 ${canAct(r) ? "bg-indigo-50/40" : ""}`}>
            <TableCell className="text-xs px-3 text-slate-500">{formatDate(r.createdAt)}</TableCell>
            <TableCell className="text-xs font-semibold px-3">{r.gpNumber}</TableCell>
            <TableCell className="text-xs px-3">{r.piName}</TableCell>
            <TableCell className="text-xs px-3 max-w-[90px] truncate">{r.purpose}</TableCell>
            <TableCell className="text-xs px-3 font-medium text-indigo-700">{formatAmount(r.amount)}</TableCell>
            <TableCell className="px-3">
              {r.approvalType
                ? <Badge className={r.approvalType === "admin"
                    ? "bg-slate-100 text-slate-700 text-[10px] whitespace-nowrap"
                    : "bg-indigo-100 text-indigo-700 text-[10px] whitespace-nowrap"}>
                    {r.approvalType === "admin" ? "Admin" : "Admin cum Fin."}
                  </Badge>
                : <span className="inline-flex items-center gap-1 text-[11px] text-red-500 font-medium">
                    <AlertCircle className="h-3 w-3"/>Not set
                  </span>}
            </TableCell>
            <TableCell className="text-xs px-3 text-slate-500 max-w-[120px] truncate italic" title={r.latestRemark}>{r.latestRemark || "—"}</TableCell>
            <TableCell className="px-3">
              <div className="flex gap-1.5 flex-wrap items-center">
                <Button
                  size="sm"
                  className="h-7 text-xs px-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40"
                  disabled={!r.approvalType}
                  onClick={() => onView(r, "forward")}
                >
                  Forward to Director
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs px-2 bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-40"
                  disabled={!r.approvalType}
                  onClick={() => onView(r, "special_approve")}
                >
                  <Star className="h-3 w-3 mr-1"/>Special Approve
                </Button>
                <ActionDropdown
                  onQuery={   () => onView(r, "query")}
                  onSendBack={() => onView(r, "sendback")}
                  onReject={  () => onView(r, "reject")}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

const HistoryTable = ({ requests, onView }: { requests: BudgetRequest[]; onView: (r: BudgetRequest) => void }) => (
  <div className="overflow-x-auto rounded-lg border border-slate-200">
    <Table>
      <TableHeader>
        <TableRow className="bg-slate-50">
          {["Date", "GP Number", "PI Name", "Amount", "Approval Type", "Latest Remark", "Status", ""].map(h => (
            <TableHead key={h} className="text-xs font-semibold text-slate-600 py-2.5 px-3">{h}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map(r => (
          <TableRow key={r.id} className="border-b border-slate-100 hover:bg-slate-50/50">
            <TableCell className="text-xs px-3 text-slate-500">{formatDate(r.createdAt)}</TableCell>
            <TableCell className="text-xs font-semibold px-3">{r.gpNumber}</TableCell>
            <TableCell className="text-xs px-3">{r.piName}</TableCell>
            <TableCell className="text-xs px-3">{formatAmount(r.amount)}</TableCell>
            <TableCell className="text-xs px-3 text-slate-500 max-w-[150px] truncate italic" title={r.latestRemark}>{r.latestRemark || "—"}</TableCell>
            <TableCell className="px-3">
              {r.approvalType
                ? <Badge className={r.approvalType === "admin" ? "bg-slate-100 text-slate-700 text-[10px]" : "bg-indigo-100 text-indigo-700 text-[10px]"}>
                    {r.approvalType === "admin" ? "Admin" : "Admin cum Financial"}
                  </Badge>
                : <span className="text-slate-400 text-xs">—</span>}
            </TableCell>
            <TableCell className="px-3">
              {r.specialApproval
                ? <Badge className="bg-amber-100 text-amber-800 text-xs flex items-center gap-1 w-fit"><Star className="h-3 w-3"/>DRC Special</Badge>
                : r.status === "drc_forwarded"
                ? <Badge className="bg-indigo-100 text-indigo-800 text-xs">Forwarded to Director</Badge>
                : r.status === "sent_back_to_drc_rc"
                ? <Badge className="bg-orange-100 text-orange-800 text-xs">Sent Back to DR (R&C)</Badge>
                : r.status === "approved"
                ? <Badge className="bg-emerald-100 text-emerald-800 text-xs">Approved</Badge>
                : <Badge variant="secondary" className="text-xs">{r.status}</Badge>}
            </TableCell>
            <TableCell className="px-3">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onView(r)}>View</Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

const RejectedTable = ({ requests, onView }: { requests: BudgetRequest[]; onView: (r: BudgetRequest) => void }) => (
  <div className="overflow-x-auto rounded-lg border border-red-200">
    <Table>
      <TableHeader>
        <TableRow className="bg-red-50">
          {["Date", "GP Number", "PI Name", "Amount", "Rejected By", "Reason", ""].map(h => (
            <TableHead key={h} className="text-[11px] font-semibold text-red-600 py-2.5 px-3">{h}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map(r => (
          <TableRow key={r.id} className="border-b border-red-100 hover:bg-red-50/30 bg-red-50/10">
            <TableCell className="text-xs px-3 py-2.5 text-slate-500 whitespace-nowrap">{formatDate(r.createdAt)}</TableCell>
            <TableCell className="px-3 py-2.5">
              <p className="text-xs font-semibold text-slate-800">{r.gpNumber}</p>
              {r.fileNumber && <p className="text-[11px] font-mono font-bold text-red-600 mt-0.5">{r.fileNumber}</p>}
            </TableCell>
            <TableCell className="text-xs px-3 py-2.5">{r.piName}</TableCell>
            <TableCell className="text-xs px-3 py-2.5 font-semibold text-slate-700">{formatAmount(r.amount)}</TableCell>
            <TableCell className="px-3 py-2.5">
              <p className="text-xs font-semibold text-red-700">{r.rejectedAtStageLabel || r.rejectedAtStage || "DRC"}</p>
              {r.rejectedAt && <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(r.rejectedAt)}</p>}
            </TableCell>
            <TableCell className="text-xs px-3 py-2.5 text-slate-600 italic max-w-[160px]">
              <p className="line-clamp-2">{r.rejectionRemarks || r.drcRemarks || "--"}</p>
            </TableCell>
            <TableCell className="px-3 py-2.5">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onView(r)}>Details</Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

export default DRCDashboard;