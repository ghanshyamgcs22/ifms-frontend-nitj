// pages/approvals/DRDashboard.tsx — WITH VIEW QUOTATION IN REJECTED TAB

import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApprovalTimeline } from "@/components/ApprovalTimeline";
import { useState, useEffect } from "react";
import { Search, Clock, CheckCircle, Loader2, Lock, XCircle, ArrowRight, MessageSquare, Eye, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const DR_THRESHOLD = 25000;
const API = import.meta.env.VITE_API_URL;

interface BudgetRequest {
  id: string; gpNumber: string; projectTitle: string; piName: string; department: string;
  purpose: string; description: string; amount: number; projectType: string;
  invoiceNumber: string; fileNumber?: string; quotationFileName?: string;
  status: string; previousStatus?: string; currentStage: string;
  createdAt: string; daRemarks?: string; arRemarks?: string; drRemarks?: string;
  rejectedBy?: string; rejectedAtStage?: string; rejectedAtStageLabel?: string;
  rejectionRemarks?: string; rejectedAt?: string;
  approvalHistory?: any[]; hasOpenQuery?: boolean;
  latestQuery?: { query: string; raisedByLabel: string; raisedAt: string; resolved: boolean; piResponse?: string };
  piResponse?: string;
}

type ActionType = "approve" | "forward" | "query" | "reject" | null;

const formatDate = (d: string) => !d ? "—" : new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const formatAmount = (n: number) => `₹${(n / 100000).toFixed(2)}L`;
const isHighValue = (r: BudgetRequest) => r.amount > DR_THRESHOLD;
const canAct = (r: BudgetRequest) => r.currentStage === "dr" && r.status === "ar_approved";
const isQueryPending = (r: BudgetRequest) => r.currentStage === "dr" && r.status === "query_raised";

const viewQuotation = (r: BudgetRequest) => {
  window.open(`${API}/download-file.php?requestId=${r.id}&type=quotation`, "_blank");
};

const DRDashboard = () => {
  const [myTurnRequests,    setMyTurnRequests]    = useState<BudgetRequest[]>([]);
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
      const r1 = await fetch(`${API}/get-requests-by-stage.php?stage=dr&type=pending`);
      const d1 = await r1.json(); setMyTurnRequests(d1.data || []);
      const r2 = await fetch(`${API}/get-requests-by-stage.php?stage=dr&type=completed`);
      const d2 = await r2.json(); setCompletedRequests(d2.data || []);
    } catch { toast.error("Failed to load requests"); }
    finally { setLoading(false); }
  };

  const handleAction = async () => {
    if (!selectedRequest || !pendingAction) return;
    if ((pendingAction === "reject" || pendingAction === "query") && !remarks.trim()) { toast.error("Please enter remarks"); return; }
    try {
      setActionLoading(true);
      let endpoint = ""; let body: any = { requestId: selectedRequest.id, remarks };
      if (pendingAction === "approve" || pendingAction === "forward") { endpoint = `${API}/dr-approve.php`; body.approvedBy = "DR"; }
      else if (pendingAction === "query") { endpoint = `${API}/raise-query.php`; body.queryBy = "DR"; body.queryTo = "pi"; }
      else if (pendingAction === "reject") { endpoint = `${API}/reject-request.php`; body.stage = "dr"; body.rejectedBy = "DR"; }
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success({ approve: "Budget request approved by DR.", forward: "Request forwarded to DRC Office.", query: "Query sent to PI.", reject: "Request rejected." }[pendingAction]);
      setDialogOpen(false); setSelectedRequest(null); setRemarks(""); setPendingAction(null);
      await fetchRequests();
    } catch (e: any) { toast.error(e.message || "Action failed"); }
    finally { setActionLoading(false); }
  };

  const filterReqs = (list: BudgetRequest[]) => {
    const q = reqSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(r => r.gpNumber?.toLowerCase().includes(q) || r.piName?.toLowerCase().includes(q) || r.purpose?.toLowerCase().includes(q) || r.department?.toLowerCase().includes(q));
  };

  const openRequest = (r: BudgetRequest, action?: ActionType) => { setSelectedRequest(r); setRemarks(""); setPendingAction(action || null); setDialogOpen(true); };

  const approved         = completedRequests.filter(r => r.status === "approved");
  const forwarded        = completedRequests.filter(r => r.status === "dr_approved");
  const rejected         = completedRequests.filter(r => r.status === "rejected");
  const lowValuePending  = filterReqs(myTurnRequests).filter(r => !isHighValue(r) && !isQueryPending(r));
  const highValuePending = filterReqs(myTurnRequests).filter(r =>  isHighValue(r) && !isQueryPending(r));
  const queryPending     = filterReqs(myTurnRequests).filter(r => isQueryPending(r));

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-slate-50 to-gray-50">
        <div className="space-y-6 p-6">

          <div className="bg-white/70 backdrop-blur-lg border border-purple-200/60 rounded-xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">DR Dashboard</h1>
              <p className="text-sm text-slate-500 mt-0.5">Deputy Registrar &nbsp;<span className="text-slate-400 font-mono">DA → AR → <strong className="text-purple-600">DR</strong></span></p>
            </div>
            <Button onClick={fetchRequests} variant="outline" size="sm">Refresh</Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 flex items-center gap-3"><CheckCircle className="h-5 w-5 text-emerald-600 shrink-0"/><div><p className="text-sm font-semibold text-emerald-800">≤ ₹25,000</p><p className="text-xs text-emerald-600">DR gives final approval</p></div></div>
            <div className="rounded-xl border border-cyan-200 bg-cyan-50/60 p-4 flex items-center gap-3"><ArrowRight className="h-5 w-5 text-cyan-600 shrink-0"/><div><p className="text-sm font-semibold text-cyan-800">&gt; ₹25,000</p><p className="text-xs text-cyan-600">Forwards to DRC Office → DRC (R&C) → DRC → Director</p></div></div>
          </div>

          <div className="grid grid-cols-5 gap-3">
            {[
              { label: "Awaiting DR",             value: lowValuePending.length + highValuePending.length, color: "text-purple-600",  icon: <Clock         className="h-4 w-4 text-purple-500"/>, sub: "AR-recommended" },
              { label: "Query Pending PI",         value: queryPending.length,    color: "text-amber-600",   icon: <MessageSquare className="h-4 w-4 text-amber-500" />, sub: "Awaiting PI response" },
              { label: "Final Approved (≤25k)",   value: approved.length,        color: "text-emerald-600", icon: <CheckCircle   className="h-4 w-4 text-emerald-500"/>, sub: "Closed" },
              { label: "Forwarded to DRC (>25k)", value: forwarded.length,       color: "text-cyan-600",    icon: <ArrowRight    className="h-4 w-4 text-cyan-500"   />, sub: "In DRC chain" },
              { label: "Rejected",                value: rejected.length,        color: "text-rose-600",    icon: <XCircle       className="h-4 w-4 text-rose-500"   />, sub: "Rejected by DR" },
            ].map(c => (
              <Card key={c.label} className="border border-slate-200/60 bg-white/70 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4"><CardTitle className="text-[11px] font-medium text-slate-600 leading-tight">{c.label}</CardTitle>{c.icon}</CardHeader>
                <CardContent className="px-4 pb-4"><div className={`text-2xl font-bold ${c.color}`}>{c.value}</div><p className="text-xs text-slate-400 mt-0.5">{c.sub}</p></CardContent>
              </Card>
            ))}
          </div>

          <Card className="border border-slate-200/60 bg-white/70 backdrop-blur-lg shadow-lg">
            <CardHeader className="border-b border-slate-100">
              <div className="flex items-center justify-between gap-4">
                <div><CardTitle className="text-base font-semibold text-slate-800">Budget Requests</CardTitle><CardDescription className="mt-0.5">AR-approved requests. Low-value: final approve. High-value: forward to DRC chain.</CardDescription></div>
                <div className="relative flex-shrink-0"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none"/><Input placeholder="Search GP No., PI, purpose…" value={reqSearch} onChange={e => setReqSearch(e.target.value)} className="pl-8 h-8 w-56 text-xs border-slate-200"/></div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (<div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-purple-400 mr-2"/><p className="text-slate-500 text-sm">Loading…</p></div>) : (
                <Tabs defaultValue="low">
                  <div className="px-4 pt-3">
                    <TabsList className="bg-purple-50">
                      <TabsTrigger value="low">≤ ₹25k — Approve ({lowValuePending.length})</TabsTrigger>
                      <TabsTrigger value="high">&gt; ₹25k — Forward ({highValuePending.length})</TabsTrigger>
                      <TabsTrigger value="query">Query Pending ({queryPending.length}){queryPending.length > 0 && <span className="ml-1 bg-amber-500 text-white text-[9px] font-bold px-1 py-0.5 rounded">{queryPending.length}</span>}</TabsTrigger>
                      <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
                      <TabsTrigger value="forwarded">Forwarded ({forwarded.length})</TabsTrigger>
                      <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
                    </TabsList>
                  </div>
                  <TabsContent value="low" className="px-4 pb-4 mt-3">{lowValuePending.length === 0 ? <EmptyState icon={<CheckCircle className="h-10 w-10"/>} message="No low-value requests awaiting DR approval"/> : <DRRequestsTable requests={lowValuePending} onView={openRequest} highValue={false}/>}</TabsContent>
                  <TabsContent value="high" className="px-4 pb-4 mt-3">{highValuePending.length === 0 ? <EmptyState icon={<ArrowRight className="h-10 w-10"/>} message="No high-value requests pending"/> : <DRRequestsTable requests={highValuePending} onView={openRequest} highValue={true}/>}</TabsContent>
                  <TabsContent value="query" className="px-4 pb-4 mt-3">{queryPending.length === 0 ? <EmptyState icon={<MessageSquare className="h-10 w-10"/>} message="No requests awaiting PI response"/> : <QueryPendingTable requests={queryPending} onView={r => openRequest(r)}/>}</TabsContent>
                  <TabsContent value="approved" className="px-4 pb-4 mt-3">{filterReqs(approved).length === 0 ? <EmptyState icon={<CheckCircle className="h-10 w-10"/>} message="No approved requests yet"/> : <HistoryTable requests={filterReqs(approved)} onView={r => openRequest(r)} showFile={false}/>}</TabsContent>
                  <TabsContent value="forwarded" className="px-4 pb-4 mt-3">{filterReqs(forwarded).length === 0 ? <EmptyState icon={<ArrowRight className="h-10 w-10"/>} message="No forwarded requests yet"/> : <HistoryTable requests={filterReqs(forwarded)} onView={r => openRequest(r)} showFile={false}/>}</TabsContent>
                  {/* ✅ Rejected tab — showFile=true */}
                  <TabsContent value="rejected" className="px-4 pb-4 mt-3">{filterReqs(rejected).length === 0 ? <EmptyState icon={<XCircle className="h-10 w-10"/>} message="No rejected requests"/> : <RejectedTable requests={filterReqs(rejected)} onView={r => openRequest(r)}/>}</TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {pendingAction === "approve" && "Final Approval (DR — ≤ ₹25k)"}
              {pendingAction === "forward" && "Forward to DRC Office (DR — > ₹25k)"}
              {pendingAction === "query"   && "Raise Query to PI"}
              {pendingAction === "reject"  && "Reject Request"}
              {!pendingAction             && "Request Details"}
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={isHighValue(selectedRequest) ? "bg-cyan-100 text-cyan-800" : "bg-emerald-100 text-emerald-800"}>{isHighValue(selectedRequest) ? "> ₹25k — DRC Chain" : "≤ ₹25k — DR Final Approve"}</Badge>
                {isQueryPending(selectedRequest) && <Badge className="bg-amber-100 text-amber-800"><MessageSquare className="h-3 w-3 mr-1 inline"/>Awaiting PI Response</Badge>}
                {selectedRequest.status === "rejected" && <Badge variant="destructive">Rejected</Badge>}
              </div>

              {/* File number */}
              {selectedRequest.fileNumber && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <FileText className="h-4 w-4 text-slate-500 shrink-0"/>
                  <div className="flex-1"><p className="text-xs text-slate-500">File Number</p><p className="text-sm font-bold font-mono text-slate-800">{selectedRequest.fileNumber}</p></div>
                  <button onClick={() => viewQuotation(selectedRequest)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded transition-colors">
                    <Eye className="h-3.5 w-3.5"/>View Quotation
                  </button>
                </div>
              )}

              {/* Rejection details in dialog */}
              {selectedRequest.status === "rejected" && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-1.5">
                  <p className="text-xs font-bold text-red-700 flex items-center gap-1.5"><XCircle className="h-3.5 w-3.5"/>Rejected by {selectedRequest.rejectedAtStageLabel || selectedRequest.rejectedAtStage || "—"}</p>
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
                  <p className="text-xs font-semibold text-green-700 mb-1 flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5"/>PI's Response</p>
                  <p className="text-sm text-green-800">{selectedRequest.piResponse}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 p-4 bg-purple-50 rounded-xl border border-purple-200">
                {[["GP Number", selectedRequest.gpNumber], ["PI Name", selectedRequest.piName], ["Department", selectedRequest.department], ["Amount", formatAmount(selectedRequest.amount)], ["Project Type", selectedRequest.projectType], ["Invoice No.", selectedRequest.invoiceNumber || "—"]].map(([label, val]) => (
                  <div key={label}><p className="text-xs text-slate-500">{label}</p><p className="text-sm font-medium text-slate-800">{val}</p></div>
                ))}
              </div>
              <div className="space-y-2">
                {selectedRequest.daRemarks && <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg"><p className="text-xs text-blue-600 font-medium mb-1">DA Remarks:</p><p className="text-sm text-slate-700">{selectedRequest.daRemarks}</p></div>}
                {selectedRequest.arRemarks && <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg"><p className="text-xs text-indigo-600 font-medium mb-1">AR Remarks:</p><p className="text-sm text-slate-700">{selectedRequest.arRemarks}</p></div>}
              </div>
              <div><p className="text-xs text-slate-500 mb-1">Purpose</p><p className="text-sm">{selectedRequest.purpose}</p></div>
              <ApprovalTimeline approvalHistory={selectedRequest.approvalHistory} currentStage={selectedRequest.currentStage} status={selectedRequest.status} piName={selectedRequest.piName} createdAt={selectedRequest.createdAt} amount={selectedRequest.amount}/>
              {pendingAction && canAct(selectedRequest) && (
                <div className="space-y-1.5">
                  <Label className="text-sm">{pendingAction === "approve" || pendingAction === "forward" ? "Remarks (Optional)" : "Remarks (Required)"}</Label>
                  <Textarea placeholder={pendingAction === "query" ? "Enter query for PI…" : pendingAction === "reject" ? "Reason for rejection…" : pendingAction === "forward" ? "Forwarding notes…" : "Final remarks…"} value={remarks} onChange={e => setRemarks(e.target.value)} rows={3} className="border-purple-200 focus:border-purple-400"/>
                </div>
              )}
              {isQueryPending(selectedRequest) && <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3"><MessageSquare className="h-5 w-5 text-amber-600 mt-0.5 shrink-0"/><p className="text-sm text-amber-800">This request is on hold. PI must respond before you can take further action.</p></div>}
              {!canAct(selectedRequest) && !isQueryPending(selectedRequest) && selectedRequest.status !== "rejected" && <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3"><Lock className="h-5 w-5 text-amber-600 mt-0.5 shrink-0"/><p className="text-sm text-amber-800">Currently at <strong>{selectedRequest.currentStage.toUpperCase()}</strong> stage. View only.</p></div>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={actionLoading}>Cancel</Button>
            {selectedRequest && canAct(selectedRequest) && pendingAction && (
              <>
                {pendingAction === "reject"  && <Button variant="destructive" onClick={handleAction} disabled={actionLoading}>{actionLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Rejecting…</> : "Confirm Reject"}</Button>}
                {pendingAction === "query"   && <Button onClick={handleAction} disabled={actionLoading} className="bg-amber-500 hover:bg-amber-600">{actionLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Sending…</> : <><MessageSquare className="h-4 w-4 mr-1"/>Send Query to PI</>}</Button>}
                {pendingAction === "forward" && <Button onClick={handleAction} disabled={actionLoading} className="bg-cyan-600 hover:bg-cyan-700">{actionLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Forwarding…</> : "Forward to DRC Office"}</Button>}
                {pendingAction === "approve" && <Button onClick={handleAction} disabled={actionLoading} className="bg-purple-700 hover:bg-purple-800">{actionLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Approving…</> : "Final Approve"}</Button>}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

const EmptyState = ({ icon, message }: { icon: React.ReactNode; message: string }) => (
  <div className="flex flex-col items-center justify-center py-14 text-slate-400"><div className="mb-3 opacity-30">{icon}</div><p className="text-sm">{message}</p></div>
);

const DRRequestsTable = ({ requests, onView, highValue }: { requests: BudgetRequest[]; onView: (r: BudgetRequest, action?: ActionType) => void; highValue: boolean }) => (
  <div className="overflow-x-auto rounded-lg border border-slate-200">
    <Table>
      <TableHeader><TableRow className="bg-slate-50">{["Date","GP Number","PI Name","Purpose","Amount","DA Remarks","AR Remarks","Actions"].map(h => <TableHead key={h} className="text-[11px] font-semibold text-slate-600 py-2.5 px-3">{h}</TableHead>)}</TableRow></TableHeader>
      <TableBody>
        {requests.map(r => (
          <TableRow key={r.id} className={`border-b border-slate-100 hover:bg-slate-50/50 ${highValue ? "bg-cyan-50/40" : "bg-purple-50/40"}`}>
            <TableCell className="text-xs px-3 text-slate-500">{formatDate(r.createdAt)}</TableCell>
            <TableCell className="text-xs font-semibold px-3">{r.gpNumber}</TableCell>
            <TableCell className="text-xs px-3">{r.piName}</TableCell>
            <TableCell className="text-xs px-3 max-w-[120px] truncate">{r.purpose}</TableCell>
            <TableCell className={`text-xs px-3 font-medium ${highValue ? "text-cyan-700" : "text-purple-700"}`}>{formatAmount(r.amount)}</TableCell>
            <TableCell className="text-xs px-3 text-slate-500 max-w-[90px] truncate italic">{r.daRemarks || "—"}</TableCell>
            <TableCell className="text-xs px-3 text-slate-500 max-w-[90px] truncate italic">{r.arRemarks || "—"}</TableCell>
            <TableCell className="px-3">
              <div className="flex gap-1 flex-wrap">
                {highValue ? <Button size="sm" className="h-7 text-xs px-2 bg-cyan-600 hover:bg-cyan-700" onClick={() => onView(r, "forward")}>Forward to DRC</Button> : <Button size="sm" className="h-7 text-xs px-2 bg-purple-700 hover:bg-purple-800" onClick={() => onView(r, "approve")}>Approve</Button>}
                <Button size="sm" variant="outline" className="h-7 text-xs px-2 border-amber-400 text-amber-600 hover:bg-amber-50" onClick={() => onView(r, "query")}>Query</Button>
                <Button size="sm" variant="destructive" className="h-7 text-xs px-2" onClick={() => onView(r, "reject")}>Reject</Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

const QueryPendingTable = ({ requests, onView }: { requests: BudgetRequest[]; onView: (r: BudgetRequest) => void }) => (
  <div className="overflow-x-auto rounded-lg border border-amber-200">
    <Table>
      <TableHeader><TableRow className="bg-amber-50">{["Date","GP Number","PI Name","Amount","Query Sent","Status"].map(h => <TableHead key={h} className="text-[11px] font-semibold text-amber-700 py-2.5 px-3">{h}</TableHead>)}</TableRow></TableHeader>
      <TableBody>
        {requests.map(r => (
          <TableRow key={r.id} className="border-b border-amber-100 hover:bg-amber-50/50 bg-amber-50/30 cursor-pointer" onClick={() => onView(r)}>
            <TableCell className="text-xs px-3 text-slate-500">{formatDate(r.createdAt)}</TableCell>
            <TableCell className="text-xs font-semibold px-3">{r.gpNumber}</TableCell>
            <TableCell className="text-xs px-3">{r.piName}</TableCell>
            <TableCell className="text-xs px-3 font-medium text-amber-700">{formatAmount(r.amount)}</TableCell>
            <TableCell className="text-xs px-3 text-slate-600 max-w-[180px] truncate italic">"{r.latestQuery?.query || "—"}"</TableCell>
            <TableCell className="px-3"><Badge className="bg-amber-100 text-amber-800 text-xs animate-pulse"><MessageSquare className="h-3 w-3 mr-1 inline"/>Awaiting PI Response</Badge></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

const HistoryTable = ({ requests, onView, showFile }: { requests: BudgetRequest[]; onView: (r: BudgetRequest) => void; showFile: boolean }) => (
  <div className="overflow-x-auto rounded-lg border border-slate-200">
    <Table>
      <TableHeader><TableRow className="bg-slate-50">{["Date","GP Number","PI Name","Amount","Status",""].map(h => <TableHead key={h} className="text-xs font-semibold text-slate-600 py-2.5 px-3">{h}</TableHead>)}</TableRow></TableHeader>
      <TableBody>
        {requests.map(r => (
          <TableRow key={r.id} className="border-b border-slate-100 hover:bg-slate-50/50">
            <TableCell className="text-xs px-3 text-slate-500">{formatDate(r.createdAt)}</TableCell>
            <TableCell className="text-xs font-semibold px-3">{r.gpNumber}</TableCell>
            <TableCell className="text-xs px-3">{r.piName}</TableCell>
            <TableCell className="text-xs px-3">{formatAmount(r.amount)}</TableCell>
            <TableCell className="px-3">
              {r.status === "approved" ? <Badge className="bg-emerald-100 text-emerald-800 text-xs">Approved</Badge>
                : r.status === "dr_approved" ? <Badge className="bg-cyan-100 text-cyan-800 text-xs">Forwarded to DRC</Badge>
                : <Badge variant="destructive" className="text-xs">Rejected</Badge>}
            </TableCell>
            <TableCell className="px-3"><Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onView(r)}>View</Button></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

// ✅ Dedicated rejected table with file number + view quotation
const RejectedTable = ({ requests, onView }: { requests: BudgetRequest[]; onView: (r: BudgetRequest) => void }) => (
  <div className="overflow-x-auto rounded-lg border border-red-200">
    <Table>
      <TableHeader>
        <TableRow className="bg-red-50">
          {["Date", "GP / File No.", "PI Name", "Amount", "Rejected By", "Reason", "Quotation", ""].map(h => (
            <TableHead key={h} className="text-[11px] font-semibold text-red-600 py-2.5 px-3">{h}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map(r => (
          <TableRow key={r.id} className="border-b border-red-100 hover:bg-red-50/30 bg-red-50/10">
            <TableCell className="text-xs px-3 text-slate-500 whitespace-nowrap">{formatDate(r.createdAt)}</TableCell>
            <TableCell className="px-3">
              <p className="text-xs font-semibold text-slate-800">{r.gpNumber}</p>
              {r.fileNumber
                ? <p className="text-[11px] font-mono font-bold text-red-600 mt-0.5">{r.fileNumber}</p>
                : <p className="text-[11px] text-gray-400 italic mt-0.5">No file no.</p>}
            </TableCell>
            <TableCell className="text-xs px-3">{r.piName}</TableCell>
            <TableCell className="text-xs px-3 font-semibold text-slate-700">{formatAmount(r.amount)}</TableCell>
            <TableCell className="px-3">
              <p className="text-xs font-semibold text-red-700">{r.rejectedAtStageLabel || r.rejectedAtStage || "DR"}</p>
              {r.rejectedAt && <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(r.rejectedAt)}</p>}
            </TableCell>
            <TableCell className="text-xs px-3 text-slate-600 italic max-w-[150px]">
              <p className="line-clamp-2">{r.rejectionRemarks || r.drRemarks || "—"}</p>
            </TableCell>
            {/* ✅ View quotation file */}
            <TableCell className="px-3">
              <button
                onClick={() => viewQuotation(r)}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded transition-colors whitespace-nowrap"
                title="View submitted quotation PDF"
              >
                <Eye className="h-3.5 w-3.5" /> View File
              </button>
            </TableCell>
            <TableCell className="px-3">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onView(r)}>Details</Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

export default DRDashboard;
