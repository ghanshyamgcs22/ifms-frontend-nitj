// pages/approvals/DRDashboard.tsx
// DR = Deputy Registrar — THIRD stage
// FINAL APPROVAL: amount <= 25,000 AND headType === 'consumable'
// FORWARD TO DRC:  amount > 25,000  OR  headType !== 'consumable'
// Sendback: DR → sends back to AR

import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequestFullDetail, RequestDetailData } from "@/components/RequestViewDetail";
import { useState, useEffect } from "react";
import {
  Search, Clock, CheckCircle, Loader2, Lock, XCircle, ArrowRight,
  MessageSquare, Eye, FileText, CornerUpLeft, PackageCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const DR_THRESHOLD = 25000;
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
  piResponse?: string;
}

type ActionType = "approve" | "forward" | "query" | "reject" | "sendback" | null;

const formatDate   = (d: string) => !d ? "--" : new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const formatAmount = (n: number) => `Rs.${(n / 100000).toFixed(2)}L`;

const isDRFinalApprove = (r: BudgetRequest) =>
  r.amount <= DR_THRESHOLD && r.headType?.toLowerCase() === "consumable";
const isDRForward = (r: BudgetRequest) => !isDRFinalApprove(r);

// Request is actionable at DR stage
const canAct = (r: BudgetRequest) =>
  r.currentStage === "dr" && (r.status === "ar_approved" || r.status === "sent_back_to_dr");

const isQueryPending = (r: BudgetRequest) =>
  r.currentStage === "dr" && r.status === "query_raised";

// DR sent this back to AR — status is sent_back_to_ar and it has moved to AR stage
const isSentBackToAR = (r: BudgetRequest) =>
  r.status === "sent_back_to_ar";

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

const DRDashboard = () => {
  const [myTurnRequests,    setMyTurnRequests]    = useState<BudgetRequest[]>([]);
  const [completedRequests, setCompletedRequests] = useState<BudgetRequest[]>([]);
  const [sentBackRequests,  setSentBackRequests]  = useState<BudgetRequest[]>([]); // DR sent back to AR
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

      // 1) Pending at DR — includes requests returned to DR from DRC Office (sent_back_to_dr)
      const r1 = await fetch(`${API}/get-requests-by-stage.php?stage=dr&type=pending`);
      const d1 = await r1.json();
      setMyTurnRequests(d1.data || []);

      // 2) Globally completed (approved / rejected)
      const r2 = await fetch(`${API}/get-requests-by-stage.php?stage=dr&type=completed`);
      const d2 = await r2.json();
      setCompletedRequests(d2.data || []);

      // 3) Requests DR sent back to AR  (status = sent_back_to_ar, now at AR stage)
      //    Uses type=sentback which the backend maps to sent_back_to_ar for stage=dr
      const r3 = await fetch(`${API}/get-requests-by-stage.php?stage=dr&type=sentback`);
      const d3 = await r3.json();
      setSentBackRequests(d3.data || []);

    } catch { toast.error("Failed to load requests"); }
    finally { setLoading(false); }
  };

  const handleAction = async () => {
    if (!selectedRequest || !pendingAction) return;
    if ((pendingAction === "reject" || pendingAction === "query" || pendingAction === "sendback") && !remarks.trim()) {
      toast.error("Please enter remarks"); return;
    }
    try {
      setActionLoading(true);
      let endpoint = "";
      let body: any = { requestId: selectedRequest.id, remarks };

      if (pendingAction === "approve" || pendingAction === "forward") {
        // Both approve and forward go through dr-approve.php
        // The backend decides final-approve vs forward based on amount + headType
        endpoint = `${API}/dr-approve.php`;
        body.approvedBy = "DR";

      } else if (pendingAction === "query") {
        endpoint = `${API}/raise-query.php`;
        body.queryBy    = "DR";
        body.queryTo    = "pi";
        body.stage      = "dr";

      } else if (pendingAction === "reject") {
        endpoint = `${API}/reject-request.php`;
        body.stage      = "dr";
        body.rejectedBy = "DR";

      } else if (pendingAction === "sendback") {
        // DR sends back to AR — backend reads currentStage and routes automatically
        endpoint = `${API}/sendback-request.php`;
        body.sentBackBy = "DR";
        // No sendBackTo needed — backend derives it from currentStage
      }

      const res  = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      toast.success(({
        approve:  "Budget request finally approved by DR.",
        forward:  "Request forwarded to DRC Office.",
        query:    "Query sent to PI.",
        reject:   "Request rejected.",
        sendback: "Request sent back to AR for re-evaluation.",
      } as Record<string, string>)[pendingAction]);

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
      const dateStr = r.createdAt
        ? new Date(r.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toLowerCase()
        : "";
      return (
        r.gpNumber?.toLowerCase().includes(q)    ||
        r.piName?.toLowerCase().includes(q)      ||
        r.purpose?.toLowerCase().includes(q)     ||
        r.department?.toLowerCase().includes(q)  ||
        r.fileNumber?.toLowerCase().includes(q)  ||
        r.headName?.toLowerCase().includes(q)    ||
        r.headType?.toLowerCase().includes(q)    ||
        dateStr.includes(q)
      );
    });
  };

  const openRequest = (r: BudgetRequest, action?: ActionType) => {
    setSelectedRequest(r);
    setRemarks("");
    setPendingAction(action || null);
    setDialogOpen(true);
  };

  // ── Derive buckets ────────────────────────────────────────────────────────
  // Pending that can be acted on (excludes query-pending)
  const activePending = filterReqs(myTurnRequests.filter(r => !isQueryPending(r)));

  // Normal incoming from AR
  const approveQueue    = activePending.filter(r => isDRFinalApprove(r) && r.status === "ar_approved");
  const forwardQueue    = activePending.filter(r => isDRForward(r)      && r.status === "ar_approved");

  // Returned to DR from DRC Office (sent_back_to_dr)
  const approveQueueRet = activePending.filter(r => isDRFinalApprove(r) && r.status === "sent_back_to_dr");
  const forwardQueueRet = activePending.filter(r => isDRForward(r)      && r.status === "sent_back_to_dr");

  const totalApprovePending = approveQueue.length + approveQueueRet.length;
  const totalForwardPending = forwardQueue.length + forwardQueueRet.length;

  const queryPending = filterReqs(myTurnRequests.filter(r => isQueryPending(r)));

  // Completed
  const approved  = filterReqs(completedRequests.filter(r => r.status === "approved"));
  const forwarded = filterReqs(completedRequests.filter(r => r.status === "dr_approved"));
  const rejected  = filterReqs(completedRequests.filter(r => r.status === "rejected"));

  // Sent back by DR to AR — from dedicated fetch
  const sentBack  = filterReqs(sentBackRequests.filter(r => isSentBackToAR(r)));

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-slate-50 to-gray-50">
        <div className="space-y-6 p-6">

          <div className="bg-white/70 backdrop-blur-lg border border-purple-200/60 rounded-xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">DR Dashboard</h1>
              <p className="text-sm text-slate-500 mt-0.5">Deputy Registrar
                <span className="text-slate-400 font-mono ml-1">DA → AR → <strong className="text-purple-600">DR</strong> → DRC Office → DR (R&C) → DRC → Director</span>
              </p>
            </div>
            <Button onClick={fetchRequests} variant="outline" size="sm">Refresh</Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 flex items-center gap-3">
              <PackageCheck className="h-5 w-5 text-emerald-600 shrink-0"/>
              <div>
                <p className="text-sm font-semibold text-emerald-800">≤ Rs.25,000 <span className="font-bold">&amp;</span> Consumable</p>
                <p className="text-xs text-emerald-600">DR gives final approval — stops here</p>
              </div>
            </div>
            <div className="rounded-xl border border-cyan-200 bg-cyan-50/60 p-4 flex items-center gap-3">
              <ArrowRight className="h-5 w-5 text-cyan-600 shrink-0"/>
              <div>
                <p className="text-sm font-semibold text-cyan-800">&gt; Rs.25,000 <span className="font-bold">OR</span> Non-Consumable</p>
                <p className="text-xs text-cyan-600">Forwards to DRC Office → DR (R&C) → DRC → Director</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-6 gap-3">
            {[
              { label: "Approve Queue",      value: totalApprovePending,              color: "text-purple-600",  icon: <CheckCircle   className="h-4 w-4 text-purple-500"/>,  sub: "Consumable ≤25k" },
              { label: "Forward Queue",      value: totalForwardPending,              color: "text-cyan-600",    icon: <ArrowRight    className="h-4 w-4 text-cyan-500"/>,    sub: ">25k or Non-consumable" },
              { label: "Returned by DRC",    value: approveQueueRet.length + forwardQueueRet.length, color: "text-orange-600", icon: <CornerUpLeft className="h-4 w-4 text-orange-500"/>, sub: "DRC Office sent back to DR" },
              { label: "Query Pending PI",   value: queryPending.length,              color: "text-amber-600",   icon: <MessageSquare className="h-4 w-4 text-amber-500"/>,   sub: "Awaiting PI response" },
              { label: "Final Approved",     value: approved.length,                  color: "text-emerald-600", icon: <CheckCircle   className="h-4 w-4 text-emerald-500"/>, sub: "Closed by DR" },
              { label: "Sent Back / Done",   value: sentBack.length + forwarded.length + rejected.length, color: "text-rose-600", icon: <XCircle className="h-4 w-4 text-rose-500"/>, sub: "Sent to AR / Forwarded / Rejected" },
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

          <Card className="border border-slate-200/60 bg-white/70 backdrop-blur-lg shadow-lg">
            <CardHeader className="border-b border-slate-100">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-800">Budget Requests</CardTitle>
                  <CardDescription className="mt-0.5">
                    Consumable ≤ Rs.25k → DR final approve. Non-consumable or &gt; Rs.25k → forward to DRC chain.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none"/>
                    <Input
                      placeholder="Search GP, PI, purpose, head, date…"
                      value={reqSearch}
                      onChange={e => setReqSearch(e.target.value)}
                      className="pl-8 h-8 w-64 text-xs border-slate-200"
                    />
                  </div>
                  {reqSearch && (
                    <Button variant="ghost" size="sm" onClick={() => setReqSearch("")} className="h-8 text-[11px] text-slate-500 hover:text-red-500 px-2">
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-purple-400 mr-2"/>
                  <p className="text-slate-500 text-sm">Loading...</p>
                </div>
              ) : (
                <Tabs defaultValue="approve">
                  <div className="px-4 pt-3">
                    <TabsList className="bg-purple-50">
                      <TabsTrigger value="approve">
                        Consumable ≤25k ({totalApprovePending})
                        {approveQueueRet.length > 0 && <span className="ml-1 bg-orange-500 text-white text-[9px] font-bold px-1 py-0.5 rounded">{approveQueueRet.length}</span>}
                      </TabsTrigger>
                      <TabsTrigger value="forward">
                        Forward to DRC ({totalForwardPending})
                        {forwardQueueRet.length > 0 && <span className="ml-1 bg-orange-500 text-white text-[9px] font-bold px-1 py-0.5 rounded">{forwardQueueRet.length}</span>}
                      </TabsTrigger>
                      <TabsTrigger value="query">
                        Query Pending ({queryPending.length})
                        {queryPending.length > 0 && <span className="ml-1 bg-amber-500 text-white text-[9px] font-bold px-1 py-0.5 rounded">{queryPending.length}</span>}
                      </TabsTrigger>
                      <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
                      <TabsTrigger value="forwarded">Forwarded ({forwarded.length})</TabsTrigger>
                      <TabsTrigger value="sentback">
                        Sent Back to AR ({sentBack.length})
                        {sentBack.length > 0 && <span className="ml-1 bg-orange-500 text-white text-[9px] font-bold px-1 py-0.5 rounded">{sentBack.length}</span>}
                      </TabsTrigger>
                      <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="approve" className="px-4 pb-4 mt-3">
                    {totalApprovePending === 0
                      ? <EmptyState icon={<CheckCircle className="h-10 w-10"/>} message="No consumable ≤ Rs.25k requests awaiting DR approval"/>
                      : <DRRequestsTable requests={[...approveQueueRet, ...approveQueue]} onView={openRequest} drFinal={true}/>}
                  </TabsContent>
                  <TabsContent value="forward" className="px-4 pb-4 mt-3">
                    {totalForwardPending === 0
                      ? <EmptyState icon={<ArrowRight className="h-10 w-10"/>} message="No requests to forward to DRC"/>
                      : <DRRequestsTable requests={[...forwardQueueRet, ...forwardQueue]} onView={openRequest} drFinal={false}/>}
                  </TabsContent>
                  <TabsContent value="query" className="px-4 pb-4 mt-3">
                    {queryPending.length === 0
                      ? <EmptyState icon={<MessageSquare className="h-10 w-10"/>} message="No requests awaiting PI response"/>
                      : <QueryPendingTable requests={queryPending} onView={r => openRequest(r)}/>}
                  </TabsContent>
                  <TabsContent value="approved" className="px-4 pb-4 mt-3">
                    {approved.length === 0
                      ? <EmptyState icon={<CheckCircle className="h-10 w-10"/>} message="No approved requests yet"/>
                      : <HistoryTable requests={approved} onView={r => openRequest(r)}/>}
                  </TabsContent>
                  <TabsContent value="forwarded" className="px-4 pb-4 mt-3">
                    {forwarded.length === 0
                      ? <EmptyState icon={<ArrowRight className="h-10 w-10"/>} message="No forwarded requests yet"/>
                      : <HistoryTable requests={forwarded} onView={r => openRequest(r)}/>}
                  </TabsContent>
                  <TabsContent value="sentback" className="px-4 pb-4 mt-3">
                    {sentBack.length === 0
                      ? <EmptyState icon={<CornerUpLeft className="h-10 w-10"/>} message="No requests sent back to AR yet"/>
                      : <SentBackTable requests={sentBack} onView={r => openRequest(r)}/>}
                  </TabsContent>
                  <TabsContent value="rejected" className="px-4 pb-4 mt-3">
                    {rejected.length === 0
                      ? <EmptyState icon={<XCircle className="h-10 w-10"/>} message="No rejected requests"/>
                      : <RejectedTable requests={rejected} onView={r => openRequest(r)}/>}
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Action Dialog ───────────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {pendingAction === "approve"  ? "Final Approval (DR — Consumable ≤ Rs.25k)"
              : pendingAction === "forward"  ? "Forward to DRC Office"
              : pendingAction === "query"    ? "Raise Query to PI"
              : pendingAction === "reject"   ? "Reject Request"
              : pendingAction === "sendback" ? "Send Back to AR"
              : "Request Details"}
            </DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-5">

              {/* Returned to DR from DRC Office */}
              {selectedRequest.status === "sent_back_to_dr" && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl flex gap-3">
                  <CornerUpLeft className="h-5 w-5 text-orange-600 mt-0.5 shrink-0"/>
                  <div>
                    <p className="text-sm font-semibold text-orange-900">Returned by DRC Office for Re-processing</p>
                    {selectedRequest.drcOfficeRemarks && (
                      <p className="text-xs text-orange-700 mt-1">DRC Office remarks: <span className="italic">{selectedRequest.drcOfficeRemarks}</span></p>
                    )}
                  </div>
                </div>
              )}

              {/* DR sent this back to AR (view only) */}
              {isSentBackToAR(selectedRequest) && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl flex gap-3">
                  <CornerUpLeft className="h-5 w-5 text-orange-600 mt-0.5 shrink-0"/>
                  <div>
                    <p className="text-sm font-semibold text-orange-900">You sent this back to AR</p>
                    {selectedRequest.drRemarks && (
                      <p className="text-xs text-orange-700 mt-1">Your remarks: <span className="italic">{selectedRequest.drRemarks}</span></p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                {isDRFinalApprove(selectedRequest)
                  ? <Badge className="bg-emerald-100 text-emerald-800"><PackageCheck className="h-3 w-3 mr-1 inline"/>Consumable ≤ Rs.25k — DR Final Approve</Badge>
                  : <Badge className="bg-cyan-100 text-cyan-800"><ArrowRight className="h-3 w-3 mr-1 inline"/>
                      {selectedRequest.amount > DR_THRESHOLD ? "> Rs.25k" : "Non-Consumable"} — Forward to DRC Chain
                    </Badge>
                }
                {selectedRequest.headType && (
                  <Badge variant="outline" className="text-xs capitalize">{selectedRequest.headType}</Badge>
                )}
                {isQueryPending(selectedRequest) && (
                  <Badge className="bg-amber-100 text-amber-800"><MessageSquare className="h-3 w-3 mr-1 inline"/>Awaiting PI Response</Badge>
                )}
                {isSentBackToAR(selectedRequest) && (
                  <Badge className="bg-orange-100 text-orange-800"><CornerUpLeft className="h-3 w-3 mr-1 inline"/>Sent Back to AR</Badge>
                )}
              </div>

              {selectedRequest.status === "rejected" && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-1.5">
                  <p className="text-xs font-bold text-red-700 flex items-center gap-1.5"><XCircle className="h-3.5 w-3.5"/>Rejected by {selectedRequest.rejectedAtStageLabel || selectedRequest.rejectedAtStage || "--"}</p>
                  {selectedRequest.rejectedAt && <p className="text-xs text-red-500">Date: {formatDate(selectedRequest.rejectedAt)}</p>}
                  {selectedRequest.rejectionRemarks && <p className="text-xs text-red-800 italic mt-1">"{selectedRequest.rejectionRemarks}"</p>}
                </div>
              )}

              {isQueryPending(selectedRequest) && selectedRequest.latestQuery && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-2">
                  <p className="text-xs font-semibold text-amber-800 flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5"/>Query sent to PI — awaiting response</p>
                  <p className="text-sm text-amber-700 italic">"{selectedRequest.latestQuery.query}"</p>
                  <p className="text-xs text-amber-600">Raised on {formatDate(selectedRequest.latestQuery.raisedAt)}</p>
                </div>
              )}

              {selectedRequest.piResponse && (
                <div className="p-3 bg-green-50 border border-green-300 rounded-lg">
                  <p className="text-xs font-semibold text-green-700 mb-1 flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5"/>PI Response</p>
                  <p className="text-sm text-green-800">{selectedRequest.piResponse}</p>
                </div>
              )}

              <RequestFullDetail
                request={toDetailData(selectedRequest)}
                viewerStage="dr"
                onFieldSaved={(updates) => {
                  setSelectedRequest(prev => prev ? { ...prev, ...updates } : prev);
                }}
              />

              {/* Action picker — only shown if no action selected yet and request is actionable */}
              {!pendingAction && canAct(selectedRequest) && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <p className="text-xs font-semibold text-slate-600">Select an action</p>
                  <div className="flex gap-2 flex-wrap">
                    {isDRFinalApprove(selectedRequest)
                      ? <Button size="sm" className="h-8 text-xs bg-purple-700 hover:bg-purple-800" onClick={() => setPendingAction("approve")}>
                          <PackageCheck className="h-3.5 w-3.5 mr-1"/>Final Approve
                        </Button>
                      : <Button size="sm" className="h-8 text-xs bg-cyan-600 hover:bg-cyan-700" onClick={() => setPendingAction("forward")}>
                          <ArrowRight className="h-3.5 w-3.5 mr-1"/>Forward to DRC Office
                        </Button>
                    }
                    <Button size="sm" variant="outline" className="h-8 text-xs border-amber-400 text-amber-600 hover:bg-amber-50" onClick={() => setPendingAction("query")}>
                      Query to PI
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs border-orange-400 text-orange-600 hover:bg-orange-50" onClick={() => setPendingAction("sendback")}>
                      <CornerUpLeft className="h-3.5 w-3.5 mr-1"/>Send Back to AR
                    </Button>
                    <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => setPendingAction("reject")}>Reject</Button>
                  </div>
                </div>
              )}

              {/* Remarks textarea — shown when an action is selected */}
              {pendingAction && canAct(selectedRequest) && (
                <div className="space-y-1.5">
                  <Label className="text-sm">
                    {pendingAction === "approve" || pendingAction === "forward" ? "Remarks (Optional)" : "Remarks (Required)"}
                  </Label>
                  <Textarea
                    placeholder={
                      pendingAction === "query"     ? "Enter query for PI..."
                      : pendingAction === "reject"  ? "Reason for rejection..."
                      : pendingAction === "sendback"? "Reason for sending back to AR..."
                      : pendingAction === "forward" ? "Forwarding notes..."
                      : "Final approval remarks..."
                    }
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    rows={3}
                    className="border-purple-200 focus:border-purple-400"
                  />
                  {/* Back button to unselect action */}
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-400 hover:text-slate-600 px-0" onClick={() => setPendingAction(null)}>
                    ← Change action
                  </Button>
                </div>
              )}

              {/* Locked state messages */}
              {isQueryPending(selectedRequest) && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
                  <MessageSquare className="h-5 w-5 text-amber-600 mt-0.5 shrink-0"/>
                  <p className="text-sm text-amber-800">This request is on hold. PI must respond before you can take further action.</p>
                </div>
              )}
              {!canAct(selectedRequest) && !isQueryPending(selectedRequest) && !isSentBackToAR(selectedRequest) && selectedRequest.status !== "rejected" && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
                  <Lock className="h-5 w-5 text-amber-600 mt-0.5 shrink-0"/>
                  <p className="text-sm text-amber-800">Currently at <strong>{selectedRequest.currentStage.toUpperCase()}</strong> stage. View only.</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setPendingAction(null); }} disabled={actionLoading}>
              Cancel
            </Button>
            {selectedRequest && canAct(selectedRequest) && pendingAction && (
              <>
                {pendingAction === "reject"   && (
                  <Button variant="destructive" onClick={handleAction} disabled={actionLoading}>
                    {actionLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Rejecting...</> : "Confirm Reject"}
                  </Button>
                )}
                {pendingAction === "query"    && (
                  <Button onClick={handleAction} disabled={actionLoading} className="bg-amber-500 hover:bg-amber-600">
                    {actionLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Sending...</> : <><MessageSquare className="h-4 w-4 mr-1"/>Send Query to PI</>}
                  </Button>
                )}
                {pendingAction === "forward"  && (
                  <Button onClick={handleAction} disabled={actionLoading} className="bg-cyan-600 hover:bg-cyan-700">
                    {actionLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Forwarding...</> : "Forward to DRC Office"}
                  </Button>
                )}
                {pendingAction === "approve"  && (
                  <Button onClick={handleAction} disabled={actionLoading} className="bg-purple-700 hover:bg-purple-800">
                    {actionLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Approving...</> : <><PackageCheck className="h-4 w-4 mr-1"/>Final Approve</>}
                  </Button>
                )}
                {pendingAction === "sendback" && (
                  <Button onClick={handleAction} disabled={actionLoading} className="bg-orange-500 hover:bg-orange-600">
                    {actionLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Sending Back...</> : <><CornerUpLeft className="h-4 w-4 mr-1"/>Send Back to AR</>}
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
    <div className="mb-3 opacity-30">{icon}</div>
    <p className="text-sm">{message}</p>
  </div>
);

const DRRequestsTable = ({ requests, onView, drFinal }: {
  requests: BudgetRequest[];
  onView: (r: BudgetRequest, action?: ActionType) => void;
  drFinal: boolean;
}) => (
  <div className="overflow-x-auto rounded-lg border border-slate-200">
    <table className="w-full text-left">
      <thead>
        <tr className="bg-slate-50">
          {["Date", "GP Number", "PI Name", "Purpose", "Amount", "Latest Remark", "Actions"].map(h => (
            <th key={h} className="text-[11px] font-semibold text-slate-600 py-2.5 px-3">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {requests.map(r => (
          <tr key={r.id} className={`border-b border-slate-100 hover:bg-slate-50/50 ${
            r.status === "sent_back_to_dr" ? "bg-orange-50/40" : drFinal ? "bg-purple-50/40" : "bg-cyan-50/40"
          }`}>
            <td className="text-xs px-3 py-2.5 text-slate-500">{formatDate(r.createdAt)}</td>
            <td className="text-xs font-semibold px-3 py-2.5">
              {r.gpNumber}
              {r.status === "sent_back_to_dr" && (
                <div className="mt-0.5">
                  <Badge className="bg-orange-100 text-orange-700 text-[10px] flex items-center gap-1 w-fit">
                    <CornerUpLeft className="h-2.5 w-2.5"/>Returned by DRC Office
                  </Badge>
                </div>
              )}
            </td>
            <td className="text-xs px-3 py-2.5">{r.piName}</td>
            <td className="text-xs px-3 py-2.5 max-w-[120px] truncate">{r.purpose}</td>
            <td className={`text-xs px-3 py-2.5 font-medium ${drFinal ? "text-purple-700" : "text-cyan-700"}`}>
              {formatAmount(r.amount)}
            </td>
            <td className="text-xs px-3 py-2.5 text-slate-600 max-w-[150px] truncate italic" title={r.latestRemark}>
              {r.latestRemark || "--"}
            </td>
            <td className="px-3 py-2.5">
              <div className="flex gap-1 flex-wrap">
                {drFinal
                  ? <Button size="sm" className={`h-7 text-xs px-2 ${r.status === "sent_back_to_dr" ? "bg-orange-600 hover:bg-orange-700" : "bg-purple-700 hover:bg-purple-800"}`}
                      onClick={() => onView(r, "approve")}>
                      {r.status === "sent_back_to_dr" ? "Re-approve" : "Approve"}
                    </Button>
                  : <Button size="sm" className={`h-7 text-xs px-2 ${r.status === "sent_back_to_dr" ? "bg-orange-600 hover:bg-orange-700" : "bg-cyan-600 hover:bg-cyan-700"}`}
                      onClick={() => onView(r, "forward")}>
                      {r.status === "sent_back_to_dr" ? "Re-forward" : "Forward"}
                    </Button>
                }
                <Button size="sm" variant="outline" className="h-7 text-xs px-2 border-amber-400 text-amber-600 hover:bg-amber-50"
                  onClick={() => onView(r, "query")}>Query</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs px-2 border-orange-400 text-orange-600 hover:bg-orange-50"
                  onClick={() => onView(r, "sendback")}>
                  <CornerUpLeft className="h-3 w-3 mr-1"/>Back to AR
                </Button>
                <Button size="sm" variant="destructive" className="h-7 text-xs px-2"
                  onClick={() => onView(r, "reject")}>Reject</Button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const QueryPendingTable = ({ requests, onView }: { requests: BudgetRequest[]; onView: (r: BudgetRequest) => void }) => (
  <div className="overflow-x-auto rounded-lg border border-amber-200">
    <table className="w-full text-left">
      <thead>
        <tr className="bg-amber-50">
          {["Date", "GP Number", "PI Name", "Amount", "Query Sent", "Status"].map(h => (
            <th key={h} className="text-[11px] font-semibold text-amber-700 py-2.5 px-3">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {requests.map(r => (
          <tr key={r.id} className="border-b border-amber-100 hover:bg-amber-50/50 bg-amber-50/30 cursor-pointer" onClick={() => onView(r)}>
            <td className="text-xs px-3 py-2.5 text-slate-500">{formatDate(r.createdAt)}</td>
            <td className="text-xs font-semibold px-3 py-2.5">{r.gpNumber}</td>
            <td className="text-xs px-3 py-2.5">{r.piName}</td>
            <td className="text-xs px-3 py-2.5 font-medium text-amber-700">{formatAmount(r.amount)}</td>
            <td className="text-xs px-3 py-2.5 text-slate-600 max-w-[180px] truncate italic">"{r.latestQuery?.query || "--"}"</td>
            <td className="px-3 py-2.5">
              <Badge className="bg-amber-100 text-amber-800 text-xs animate-pulse">
                <MessageSquare className="h-3 w-3 mr-1 inline"/>Awaiting PI Response
              </Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const HistoryTable = ({ requests, onView }: { requests: BudgetRequest[]; onView: (r: BudgetRequest) => void }) => (
  <div className="overflow-x-auto rounded-lg border border-slate-200">
    <table className="w-full text-left">
      <thead>
        <tr className="bg-slate-50">
          {["Date", "GP Number", "PI Name", "Amount", "Latest Remark", "Status", ""].map(h => (
            <th key={h} className="text-xs font-semibold text-slate-600 py-2.5 px-3">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {requests.map(r => (
          <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/50">
            <td className="text-xs px-3 py-2.5 text-slate-500">{formatDate(r.createdAt)}</td>
            <td className="text-xs font-semibold px-3 py-2.5">{r.gpNumber}</td>
            <td className="text-xs px-3 py-2.5">{r.piName}</td>
            <td className="text-xs px-3 py-2.5">{formatAmount(r.amount)}</td>
            <td className="text-xs px-3 py-2.5 text-slate-600 max-w-[180px] truncate italic" title={r.latestRemark}>
              {r.latestRemark || "--"}
            </td>
            <td className="px-3 py-2.5">
              {r.status === "approved"
                ? <Badge className="bg-emerald-100 text-emerald-800 text-xs">Final Approved</Badge>
                : <Badge className="bg-cyan-100 text-cyan-800 text-xs">Forwarded to DRC</Badge>}
            </td>
            <td className="px-3 py-2.5">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onView(r)}>View</Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const SentBackTable = ({ requests, onView }: { requests: BudgetRequest[]; onView: (r: BudgetRequest) => void }) => (
  <div className="overflow-x-auto rounded-lg border border-orange-200">
    <table className="w-full text-left">
      <thead>
        <tr className="bg-orange-50">
          {["Date", "GP Number", "PI Name", "Amount", "Latest Remark", "Status", ""].map(h => (
            <th key={h} className="text-xs font-semibold text-orange-700 py-2.5 px-3">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {requests.map(r => (
          <tr key={r.id} className="border-b border-orange-100 hover:bg-orange-50/40 bg-orange-50/10">
            <td className="text-xs px-3 py-2.5 text-slate-500 whitespace-nowrap">{formatDate(r.createdAt)}</td>
            <td className="text-xs font-semibold px-3 py-2.5">{r.gpNumber}</td>
            <td className="text-xs px-3 py-2.5">{r.piName}</td>
            <td className="text-xs px-3 py-2.5">{formatAmount(r.amount)}</td>
            <td className="text-xs px-3 py-2.5 text-slate-600 italic max-w-[180px] truncate" title={r.latestRemark}>
              {r.latestRemark || "--"}
            </td>
            <td className="px-3 py-2.5">
              <Badge className="bg-orange-100 text-orange-800 text-xs flex items-center gap-1 w-fit">
                <CornerUpLeft className="h-3 w-3"/>Sent Back to AR
              </Badge>
            </td>
            <td className="px-3 py-2.5">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onView(r)}>View</Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const RejectedTable = ({ requests, onView }: { requests: BudgetRequest[]; onView: (r: BudgetRequest) => void }) => (
  <div className="overflow-x-auto rounded-lg border border-red-200">
    <table className="w-full text-left">
      <thead>
        <tr className="bg-red-50">
          {["Date", "GP / File No.", "PI Name", "Amount", "Rejected By", "Reason", ""].map(h => (
            <th key={h} className="text-[11px] font-semibold text-red-600 py-2.5 px-3">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {requests.map(r => (
          <tr key={r.id} className="border-b border-red-100 hover:bg-red-50/30 bg-red-50/10">
            <td className="text-xs px-3 py-2.5 text-slate-500 whitespace-nowrap">{formatDate(r.createdAt)}</td>
            <td className="px-3 py-2.5">
              <p className="text-xs font-semibold text-slate-800">{r.gpNumber}</p>
              {r.fileNumber
                ? <p className="text-[11px] font-mono font-bold text-red-600 mt-0.5">{r.fileNumber}</p>
                : <p className="text-[11px] text-gray-400 italic mt-0.5">No file no.</p>}
            </td>
            <td className="text-xs px-3 py-2.5">{r.piName}</td>
            <td className="text-xs px-3 py-2.5 font-semibold text-slate-700">{formatAmount(r.amount)}</td>
            <td className="px-3 py-2.5">
              <p className="text-xs font-semibold text-red-700">{r.rejectedAtStageLabel || r.rejectedAtStage || "DR"}</p>
              {r.rejectedAt && <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(r.rejectedAt)}</p>}
            </td>
            <td className="text-xs px-3 py-2.5 text-slate-600 italic max-w-[150px]">
              <p className="line-clamp-2">{r.rejectionRemarks || r.drRemarks || "--"}</p>
            </td>
            <td className="px-3 py-2.5">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onView(r)}>Details</Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default DRDashboard;