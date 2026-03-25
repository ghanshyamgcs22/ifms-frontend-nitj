// pages/approvals/DirectorDashboard.tsx
// ✅ Uses RequestFullDetail (header + purchase details + 7b field + quotation + timeline)
// ✅ No ApprovalTimeline component — timeline is built into RequestFullDetail
// ✅ No MEITY collapsible section
// ✅ Reject option with Rejected tab

import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequestFullDetail, RequestDetailData } from "@/components/RequestViewDetail";
import { useState, useEffect, useRef } from "react";
import {
  Search, Clock, CheckCircle, Loader2, Lock, RotateCcw,
  ChevronDown, MessageSquare, CornerUpLeft, XCircle,
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
}

type ActionType = "approve" | "query" | "sendback" | "reject" | null;

const formatDate   = (d: string) => !d ? "—" : new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const formatAmount = (n: number) => `₹${(n / 100000).toFixed(2)}L`;
const canAct = (r: BudgetRequest) => r.currentStage === "director" && r.status === "drc_forwarded";

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
  projectEndDate:   r.projectEndDate,       // ✅ completion date
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
  currentStage:     r.currentStage,         // ✅ required for timeline
  status:           r.status,               // ✅ required for timeline
  approvalHistory:  r.approvalHistory,      // ✅ required for timeline
});

// ── Split button: Query / Send Back / Reject ──────────────────────────────────
const ActionDropdown = ({ onQuery, onSendBack, onReject }: {
  onQuery: () => void;
  onSendBack: () => void;
  onReject: () => void;
}) => {
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
        className="h-7 text-xs px-2.5 rounded-l-md border border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 font-medium transition-colors flex items-center gap-1.5"
      >
        <MessageSquare className="h-3 w-3"/> Query / More
      </button>
      <button
        onClick={() => setOpen(v => !v)}
        className="h-7 w-6 rounded-r-md border border-l-0 border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 flex items-center justify-center transition-colors"
      >
        <ChevronDown className="h-3 w-3"/>
      </button>
      {open && (
        <div className="absolute top-8 left-0 z-50 min-w-[200px] bg-white border border-slate-200 rounded-lg shadow-lg py-1 overflow-hidden">
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
              <p className="font-semibold text-slate-800">Send Back to DRC</p>
              <p className="text-slate-400 text-[10px] mt-0.5">Return to DRC for re-evaluation</p>
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
const DirectorDashboard = () => {
  const [pendingRequests,   setPendingRequests]   = useState<BudgetRequest[]>([]);
  const [completedRequests, setCompletedRequests] = useState<BudgetRequest[]>([]);
  const [loading,           setLoading]           = useState(true);
  const [selectedRequest,   setSelectedRequest]   = useState<BudgetRequest | null>(null);
  const [dialogOpen,        setDialogOpen]        = useState(false);
  const [remarks,           setRemarks]           = useState("");
  const [actionLoading,     setActionLoading]     = useState(false);
  const [pendingAction,     setPendingAction]     = useState<ActionType>(null);
  const [reqSearch,         setReqSearch]         = useState("");

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const r1 = await fetch(`${API}/get-requests-by-stage.php?stage=director&type=pending`);
      const d1 = await r1.json();
      setPendingRequests(d1.data || []);

      const r2 = await fetch(`${API}/get-requests-by-stage.php?stage=director&type=completed`);
      const d2 = await r2.json();
      setCompletedRequests(d2.data || []);
    } catch { toast.error("Failed to load requests"); }
    finally { setLoading(false); }
  };

  const handleAction = async () => {
    if (!selectedRequest || !pendingAction) return;
    if (pendingAction !== "approve" && !remarks.trim()) {
      toast.error("Please enter remarks"); return;
    }
    try {
      setActionLoading(true);
      let endpoint = "";
      let body: any = { requestId: selectedRequest.id, remarks, actionBy: "Director" };

      if (pendingAction === "approve") {
        endpoint = `${API}/director-approve.php`; body.approvedBy = "Director";
      } else if (pendingAction === "query") {
        endpoint = `${API}/raise-query.php`; body.queryTo = "pi"; body.queryBy = "director";
      } else if (pendingAction === "sendback") {
        endpoint = `${API}/sendback-request.php`; body.sendBackTo = "drc"; body.sentBackBy = "Director";
      } else if (pendingAction === "reject") {
        endpoint = `${API}/reject-request.php`; body.stage = "director"; body.rejectedBy = "Director";
      }

      const res  = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      toast.success({
        approve:  "Budget request fully approved.",
        query:    "Query raised to PI.",
        sendback: "Request sent back to DRC for re-evaluation.",
        reject:   "Request rejected.",
      }[pendingAction]);

      setDialogOpen(false);
      setSelectedRequest(null);
      setRemarks("");
      setPendingAction(null);
      await fetchRequests();
    } catch (e: any) { toast.error(e.message || "Action failed"); }
    finally { setActionLoading(false); }
  };

  const filterReqs = (list: BudgetRequest[]) => {
    const q = reqSearch.trim().toLowerCase();
    if (!q) return list;
    
    return list.filter(r => {
      const matchText = 
        r.gpNumber?.toLowerCase().includes(q) ||
        r.piName?.toLowerCase().includes(q) ||
        r.purpose?.toLowerCase().includes(q) ||
        r.department?.toLowerCase().includes(q) ||
        r.fileNumber?.toLowerCase().includes(q);

      const dateStr = r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toLowerCase() : "";
      return matchText || dateStr.includes(q);
    });
  };

  const openRequest = (r: BudgetRequest, action?: ActionType) => {
    setSelectedRequest(r); setRemarks(""); setPendingAction(action || null); setDialogOpen(true);
  };

  const approved      = completedRequests.filter(r => r.status === "approved");
  const sentbackToDrc = completedRequests.filter(r => r.status === "sent_back_to_drc");
  const rejected      = completedRequests.filter(r => r.status === "rejected");

  const dialogTitle = () => {
    if (pendingAction === "approve")  return "Final Approval — Director";
    if (pendingAction === "query")    return "Query to PI";
    if (pendingAction === "sendback") return "Send Back to DRC";
    if (pendingAction === "reject")   return "Reject Request";
    return "Request Details";
  };
  const dialogDesc = () => {
    if (pendingAction === "approve")  return "Once approved, the PI's booking amount is confirmed. This is final.";
    if (pendingAction === "query")    return "Raise a query to the PI. The stage will not change until PI responds.";
    if (pendingAction === "sendback") return "Return to DRC for re-evaluation. Remarks are required.";
    if (pendingAction === "reject")   return "Permanently reject this request. Remarks are required.";
    return "View-only mode.";
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-slate-50 to-gray-50">
        <div className="space-y-6 p-6">

          {/* Page header */}
          <div className="bg-white/70 backdrop-blur-lg border border-violet-200/60 rounded-xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Director Dashboard</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Final approval for requests <strong className="text-violet-600">&gt; ₹25,000</strong>
                &nbsp;<span className="text-slate-400 font-mono text-[11px]">… → DR (R&C) → DRC → <strong className="text-violet-600">Director</strong></span>
              </p>
            </div>
            <Button onClick={fetchRequests} variant="outline" size="sm">Refresh</Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Awaiting Decision", value: pendingRequests.length, color: "text-violet-600",  icon: <Clock       className="h-4 w-4 text-violet-500" />, sub: "Forwarded by DRC" },
              { label: "Approved",          value: approved.length,        color: "text-emerald-600", icon: <CheckCircle className="h-4 w-4 text-emerald-500"/>, sub: "Fully complete" },
              { label: "Sent Back to DRC",  value: sentbackToDrc.length,   color: "text-orange-600",  icon: <RotateCcw   className="h-4 w-4 text-orange-500" />, sub: "Returned for re-eval" },
              { label: "Rejected",          value: rejected.length,        color: "text-red-600",     icon: <XCircle     className="h-4 w-4 text-red-500"    />, sub: "Rejected by Director" },
            ].map(c => (
              <Card key={c.label} className="border border-slate-200/60 bg-white/70 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-slate-600">{c.label}</CardTitle>{c.icon}
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
                  <p className="text-xs text-slate-400 mt-0.5">{c.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Table */}
          <Card className="border border-slate-200/60 bg-white/70 backdrop-blur-lg shadow-lg">
            <CardHeader className="border-b border-slate-100">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-800">Budget Requests</CardTitle>
                  <CardDescription className="mt-0.5">
                    Only <strong>DRC-forwarded</strong> requests appear here. This is the final stage.
                  </CardDescription>
                </div>
                <div className="relative flex-shrink-0">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none"/>
                  <Input
                    placeholder="Search by GP, PI, Purpose, File or Date..."
                    value={reqSearch}
                    onChange={e => setReqSearch(e.target.value)}
                    className="pl-8 h-8 w-64 text-xs border-slate-200 focus-visible:ring-violet-500"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-violet-400 mr-2"/>
                  <p className="text-slate-500 text-sm">Loading…</p>
                </div>
              ) : (
                <Tabs defaultValue="pending">
                  <div className="px-4 pt-3">
                    <TabsList className="bg-violet-50">
                      <TabsTrigger value="pending">Awaiting Decision ({pendingRequests.length})</TabsTrigger>
                      <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
                      <TabsTrigger value="sentback">Sent Back to DRC ({sentbackToDrc.length})</TabsTrigger>
                      <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
                    </TabsList>
                  </div>
                  <TabsContent value="pending" className="px-4 pb-4 mt-3">
                    {filterReqs(pendingRequests).length === 0
                      ? <EmptyState icon={<Clock className="h-10 w-10"/>} message="No requests awaiting Director decision"/>
                      : <PendingTable requests={filterReqs(pendingRequests)} onView={openRequest}/>}
                  </TabsContent>
                  <TabsContent value="approved" className="px-4 pb-4 mt-3">
                    {filterReqs(approved).length === 0
                      ? <EmptyState icon={<CheckCircle className="h-10 w-10"/>} message="No approved requests yet"/>
                      : <HistoryTable requests={filterReqs(approved)} onView={r => openRequest(r)}/>}
                  </TabsContent>
                  <TabsContent value="sentback" className="px-4 pb-4 mt-3">
                    {filterReqs(sentbackToDrc).length === 0
                      ? <EmptyState icon={<RotateCcw className="h-10 w-10"/>} message="No sent-back requests"/>
                      : <HistoryTable requests={filterReqs(sentbackToDrc)} onView={r => openRequest(r)}/>}
                  </TabsContent>
                  <TabsContent value="rejected" className="px-4 pb-4 mt-3">
                    {filterReqs(rejected).length === 0
                      ? <EmptyState icon={<XCircle className="h-10 w-10"/>} message="No rejected requests"/>
                      : <RejectedTable requests={filterReqs(rejected)} onView={r => openRequest(r)}/>}
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogTitle()}</DialogTitle>
            <DialogDescription>{dialogDesc()}</DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-5">

              {/* Status badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={
                  selectedRequest.status === "approved" ? "bg-emerald-100 text-emerald-800"
                  : selectedRequest.status === "rejected" ? "bg-red-100 text-red-800"
                  : "bg-violet-100 text-violet-800"
                }>
                  {selectedRequest.status === "approved" ? "Approved"
                  : selectedRequest.status === "rejected" ? "Rejected"
                  : "Awaiting Director Decision"}
                </Badge>
                {selectedRequest.approvalType && (
                  <Badge variant="outline" className="text-xs">
                    {selectedRequest.approvalType === "admin" ? "Admin Approval" : "Admin cum Financial Approval"}
                  </Badge>
                )}
              </div>

              {/* Rejection info */}
              {selectedRequest.status === "rejected" && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-1.5">
                  <p className="text-xs font-bold text-red-700 flex items-center gap-1.5">
                    <XCircle className="h-3.5 w-3.5"/>
                    Rejected by {selectedRequest.rejectedAtStageLabel || selectedRequest.rejectedAtStage || "Director"}
                  </p>
                  {selectedRequest.rejectedAt && (
                    <p className="text-xs text-red-500">Date: {formatDate(selectedRequest.rejectedAt)}</p>
                  )}
                  {selectedRequest.rejectionRemarks && (
                    <p className="text-xs text-red-800 italic mt-1">"{selectedRequest.rejectionRemarks}"</p>
                  )}
                </div>
              )}

              {/* ✅ Full detail — header + purchase details + 7b + quotation + timeline */}
              <RequestFullDetail
                request={toDetailData(selectedRequest)}
                viewerStage="director"
                onFieldSaved={(updates) => {
                  setSelectedRequest(prev => prev ? { ...prev, ...updates } : prev);
                }}
              />

              {/* Remarks textarea */}
              {pendingAction && canAct(selectedRequest) && (
                <div className="space-y-1.5">
                  <Label className="text-sm">
                    {pendingAction === "approve" ? "Director Remarks (Optional)"
                    : pendingAction === "reject"  ? "Rejection Reason (Required)"
                    : "Remarks (Required)"}
                  </Label>
                  <Textarea
                    placeholder={
                      pendingAction === "query"     ? "Describe the clarification needed from PI…"
                      : pendingAction === "sendback" ? "Reason for returning to DRC…"
                      : pendingAction === "reject"   ? "State the reason for rejecting this request…"
                      : "Final remarks (optional)…"
                    }
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    rows={pendingAction === "reject" ? 4 : 3}
                    className={pendingAction === "reject" ? "border-red-300 focus:border-red-400" : "border-violet-200 focus:border-violet-400"}
                  />
                </div>
              )}

              {/* Action picker */}
              {!pendingAction && canAct(selectedRequest) && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <p className="text-xs font-semibold text-slate-600">Select an action</p>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" className="h-8 text-xs bg-violet-700 hover:bg-violet-800" onClick={() => setPendingAction("approve")}>
                      Final Approve
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs border-amber-400 text-amber-600 hover:bg-amber-50" onClick={() => setPendingAction("query")}>
                      Query to PI
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs border-orange-400 text-orange-600 hover:bg-orange-50" onClick={() => setPendingAction("sendback")}>
                      <CornerUpLeft className="h-3.5 w-3.5 mr-1"/>Send Back to DRC
                    </Button>
                    <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => setPendingAction("reject")}>
                      <XCircle className="h-3.5 w-3.5 mr-1"/>Reject
                    </Button>
                  </div>
                </div>
              )}

              {!canAct(selectedRequest) && !["approved", "rejected", "sent_back_to_drc"].includes(selectedRequest.status) && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
                  <Lock className="h-5 w-5 text-amber-600 mt-0.5 shrink-0"/>
                  <p className="text-sm text-amber-800">
                    Currently at <strong>{selectedRequest.currentStage.toUpperCase()}</strong> stage. View only.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setDialogOpen(false); setPendingAction(null); }}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            {selectedRequest && canAct(selectedRequest) && pendingAction && (
              pendingAction === "reject" ? (
                <Button
                  onClick={handleAction}
                  disabled={actionLoading || !remarks.trim()}
                  variant="destructive"
                >
                  {actionLoading
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Rejecting…</>
                    : <><XCircle className="h-4 w-4 mr-1"/>Confirm Reject</>}
                </Button>
              ) : (
                <Button
                  onClick={handleAction}
                  disabled={actionLoading}
                  className={
                    pendingAction === "approve"  ? "bg-violet-700 hover:bg-violet-800"
                    : pendingAction === "query"    ? "bg-amber-500 hover:bg-amber-600"
                    : pendingAction === "sendback" ? "bg-orange-500 hover:bg-orange-600"
                    : ""
                  }
                >
                  {actionLoading
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Processing…</>
                    : pendingAction === "approve"  ? "Final Approve ✓"
                    : pendingAction === "query"    ? <><MessageSquare className="h-4 w-4 mr-1"/>Send Query to PI</>
                    : pendingAction === "sendback" ? <><CornerUpLeft className="h-4 w-4 mr-1"/>Send Back to DRC</>
                    : ""}
                </Button>
              )
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
    <div className="mb-3 opacity-30">{icon}</div>
    <p className="text-sm">{message}</p>
  </div>
);

const PendingTable = ({ requests, onView }: {
  requests: BudgetRequest[];
  onView: (r: BudgetRequest, action?: ActionType) => void;
}) => (
  <div className="overflow-x-auto rounded-lg border border-slate-200">
    <Table>
      <TableHeader>
        <TableRow className="bg-slate-50">
          {["Date", "GP Number", "PI Name", "Purpose", "Amount", "Latest Remark", "Actions"].map(h => (
            <TableHead key={h} className="text-[11px] font-semibold text-slate-600 py-2.5 px-3 h-9">{h}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map(r => (
          <TableRow key={r.id} className={`border-b border-slate-100 hover:bg-slate-50/50 ${canAct(r) ? "bg-violet-50/40" : ""}`}>
            <TableCell className="text-xs px-3 text-slate-500">{formatDate(r.createdAt)}</TableCell>
            <TableCell className="text-xs font-semibold px-3">{r.gpNumber}</TableCell>
            <TableCell className="text-xs px-3">{r.piName}</TableCell>
            <TableCell className="text-xs px-3 max-w-[110px] truncate">{r.purpose}</TableCell>
            <TableCell className="text-xs px-3 font-medium text-violet-700">{formatAmount(r.amount)}</TableCell>
            <TableCell className="text-xs px-3 text-slate-600 max-w-[150px] truncate italic" title={r.latestRemark}>
              {r.latestRemark || "—"}
            </TableCell>
            <TableCell className="px-3">
              <div className="flex gap-1.5 flex-wrap items-center">
                <Button
                  size="sm"
                  className="h-7 text-xs px-2.5 bg-violet-700 hover:bg-violet-800"
                  onClick={() => onView(r, "approve")}
                >
                  Approve
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

const HistoryTable = ({ requests, onView }: {
  requests: BudgetRequest[];
  onView: (r: BudgetRequest) => void;
}) => (
  <div className="overflow-x-auto rounded-lg border border-slate-200">
    <Table>
      <TableHeader>
        <TableRow className="bg-slate-50">
          {["Date", "GP Number", "PI Name", "Amount", "Latest Remark", "Status", ""].map(h => (
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
              {r.status === "approved"
                ? <Badge className="bg-emerald-100 text-emerald-800 text-xs">Approved</Badge>
                : r.status === "sent_back_to_drc"
                ? <Badge className="bg-orange-100 text-orange-800 text-xs">Sent Back to DRC</Badge>
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

const RejectedTable = ({ requests, onView }: {
  requests: BudgetRequest[];
  onView: (r: BudgetRequest) => void;
}) => (
  <div className="overflow-x-auto rounded-lg border border-red-200">
    <Table>
      <TableHeader>
        <TableRow className="bg-red-50">
          {["Date", "GP Number", "PI Name", "Amount", "Rejection Reason", ""].map(h => (
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
            <TableCell className="text-xs px-3 py-2.5 text-slate-600 italic max-w-[200px]" title={r.latestRemark}>
              <p className="line-clamp-2">{r.latestRemark || "—"}</p>
              {r.rejectedAt && <p className="text-[10px] text-slate-400 mt-0.5 not-italic">{formatDate(r.rejectedAt)}</p>}
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

export default DirectorDashboard;