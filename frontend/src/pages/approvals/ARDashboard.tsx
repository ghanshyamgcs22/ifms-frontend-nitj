// pages/approvals/ARDashboard.tsx
// AR = Accounts Representative -- SECOND stage in the approval chain
// Handles both fresh DA-approved requests AND requests sent back from DR
// ✅ Now shows FULL project details via RequestFullDetail (MEITY format)

import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequestFullDetail, RequestDetailData } from "@/components/RequestViewDetail";
import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import {
  Clock, CheckCircle, History, Loader2, Lock, CornerUpLeft,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

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


type ActionType = "recommend" | "sendback" | null;

const formatDate = (d: string) =>
  !d ? "--" : new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const formatAmount = (n: number) => `₹${(n / 100000).toFixed(2)}L`;

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
const ARDashboard = () => {
  const [myTurnRequests,    setMyTurnRequests]    = useState<BudgetRequest[]>([]);
  const [completedRequests, setCompletedRequests] = useState<BudgetRequest[]>([]);
  const [sentBackRequests,  setSentBackRequests]  = useState<BudgetRequest[]>([]);
  const [loading,           setLoading]           = useState(true);

  const [selectedRequest, setSelectedRequest] = useState<BudgetRequest | null>(null);
  const [dialogOpen,      setDialogOpen]      = useState(false);
  const [remarks,         setRemarks]         = useState("");
  const [actionLoading,   setActionLoading]   = useState(false);
  const [pendingAction,   setPendingAction]   = useState<ActionType>(null);

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const r1 = await fetch(`${import.meta.env.VITE_API_URL}/get-requests-by-stage.php?stage=ar&type=pending`);
      const d1 = await r1.json();
      setMyTurnRequests(d1.data || []);

      const r2 = await fetch(`${import.meta.env.VITE_API_URL}/get-requests-by-stage.php?stage=all&type=completed`);
      const d2 = await r2.json();
      setCompletedRequests(d2.data || []);

      const r3 = await fetch(`${import.meta.env.VITE_API_URL}/get-requests-by-stage.php?stage=ar&type=sentback`);
      const d3 = await r3.json();
      setSentBackRequests(d3.data || []);
    } catch { toast.error("Failed to load requests"); }
    finally   { setLoading(false); }
  };

  const canAct = (r: BudgetRequest) =>
    r.currentStage === "ar" && (r.status === "da_approved" || r.status === "sent_back_to_ar");

  const handleAction = async () => {
    if (!selectedRequest || !pendingAction) return;
    if (pendingAction === "sendback" && !remarks.trim()) {
      toast.error("Please enter remarks for send-back"); return;
    }
    try {
      setActionLoading(true);

      if (pendingAction === "recommend") {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/ar-approve.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId: selectedRequest.id, remarks, approvedBy: "AR Officer" }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        toast.success("Request recommended. Forwarded to DR.");
      } else {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/sendback-request.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId: selectedRequest.id, remarks, sendBackTo: "da", sentBackBy: "AR Officer" }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        toast.success("Request sent back to DA.");
      }

      setDialogOpen(false); setSelectedRequest(null); setRemarks(""); setPendingAction(null);
      await fetchRequests();
    } catch (e: any) { toast.error(e.message || "Action failed"); }
    finally  { setActionLoading(false); }
  };

  const [reqSearch, setReqSearch] = useState("");

  const filterReqs = (list: BudgetRequest[]) => {
    const q = reqSearch.trim().toLowerCase();
    if (!q) return list;
    
    return list.filter(r => {
      const matchText = 
        r.gpNumber?.toLowerCase().includes(q) ||
        r.piName?.toLowerCase().includes(q) ||
        r.purpose?.toLowerCase().includes(q) ||
        r.department?.toLowerCase().includes(q) ||
        r.fileNumber?.toLowerCase().includes(q) ||
        r.invoiceNumber?.toLowerCase().includes(q);

      const dateStr = r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toLowerCase() : "";
      const matchDate = dateStr.includes(q);

      return matchText || matchDate;
    });
  };

  const openRequest = (r: BudgetRequest, action?: ActionType) => {
    setSelectedRequest(r); setRemarks(""); setPendingAction(action || null); setDialogOpen(true);
  };

  const completedApproved = completedRequests.filter(r => r.status === "approved");
  const freshRequests    = myTurnRequests.filter(r => r.status === "da_approved");
  const returnedRequests = myTurnRequests.filter(r => r.status === "sent_back_to_ar");

  const dialogTitle = () => {
    if (pendingAction === "recommend") return "Review & Recommend (AR Stage)";
    if (pendingAction === "sendback")  return "Send Back to DA";
    return "Request Details";
  };
  const dialogDesc = () => {
    if (pendingAction === "recommend") {
      return selectedRequest?.status === "sent_back_to_ar"
        ? "This request was returned by DR — review DR's remarks and re-recommend."
        : "This request was processed by DA -- you may recommend it.";
    }
    if (pendingAction === "sendback")  return "Return this request to DA for re-evaluation. Remarks are required.";
    return "View only";
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-slate-50 to-gray-50">
        <div className="space-y-6 p-6">

          {/* Header */}
          <div className="bg-white/70 backdrop-blur-lg border border-indigo-200/60 rounded-xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">AR Dashboard</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Accounts Representative - Second stage
                <span className="text-slate-400 font-mono ml-1">DA -&gt; <strong className="text-indigo-600">AR</strong> -&gt; DR</span>
              </p>
            </div>
            <Button onClick={fetchRequests} variant="outline" size="sm">Refresh</Button>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Fresh at AR", value: freshRequests.length, color: "text-indigo-600", icon: <Clock className="h-4 w-4 text-indigo-500" />, sub: "DA-processed, awaiting AR" },
              { label: "Returned by DR", value: returnedRequests.length, color: "text-orange-600", icon: <CornerUpLeft className="h-4 w-4 text-orange-500" />, sub: "DR sent back to AR for re-recommendation" },
              { label: "Recommended", value: completedApproved.length, color: "text-emerald-600", icon: <CheckCircle className="h-4 w-4 text-emerald-500" />, sub: "Fully recommended and forwarded" },
              { label: "Sent Back to DA", value: sentBackRequests.length, color: "text-slate-600", icon: <CornerUpLeft className="h-4 w-4 text-slate-500" />, sub: "AR returned to DA" },
            ].map(c => (
              <Card key={c.label} className="border border-slate-200/60 bg-white/70 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-slate-600">{c.label}</CardTitle>
                  {c.icon}
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
                  <p className="text-xs text-slate-400 mt-0.5">{c.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Requests table */}
          <Card className="border border-slate-200/60 bg-white/70 backdrop-blur-lg shadow-lg">
            <CardHeader className="border-b border-slate-100">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-800">Budget Requests</CardTitle>
                  <CardDescription className="mt-0.5">
                    <strong>DA-processed</strong> and <strong>DR-returned</strong> requests can be recommended here.
                  </CardDescription>
                </div>
                <div className="relative flex-shrink-0">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <Input
                    placeholder="Search by GP, PI, Date, Purpose..."
                    value={reqSearch}
                    onChange={e => setReqSearch(e.target.value)}
                    className="pl-8 h-8 w-60 text-xs border-slate-200"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-400 mr-2" />
                  <p className="text-slate-500 text-sm">Loading...</p>
                </div>
              ) : (
                <Tabs defaultValue="myturn">
                  <div className="px-4 pt-3">
                    <TabsList className="bg-indigo-50">
                      <TabsTrigger value="myturn">
                        At AR ({myTurnRequests.length})
                        {returnedRequests.length > 0 && (
                          <span className="ml-1.5 bg-orange-500 text-white text-[10px] rounded-full px-1.5 py-0.5">{returnedRequests.length} returned</span>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="history">Processed ({completedApproved.length})</TabsTrigger>
                      <TabsTrigger value="sentback">Sent Back to DA ({sentBackRequests.length})</TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="myturn" className="px-4 pb-4 mt-3">
                    {filterReqs(myTurnRequests).length === 0 ? (
                      <EmptyState icon={<Clock className="h-10 w-10" />} message={reqSearch ? "No matching requests." : "No requests pending AR recommendation"} />
                    ) : (
                      <RequestsTable requests={filterReqs(myTurnRequests)} canAct={canAct} onView={openRequest} />
                    )}
                  </TabsContent>

                  <TabsContent value="history" className="px-4 pb-4 mt-3">
                    {filterReqs(completedApproved).length === 0 ? (
                      <EmptyState icon={<History className="h-10 w-10" />} message={reqSearch ? "No matching requests." : "No processed requests yet"} />
                    ) : (
                      <HistoryTable requests={filterReqs(completedApproved)} onView={r => openRequest(r)} />
                    )}
                  </TabsContent>

                  <TabsContent value="sentback" className="px-4 pb-4 mt-3">
                    {filterReqs(sentBackRequests).length === 0 ? (
                      <EmptyState icon={<CornerUpLeft className="h-10 w-10" />} message="No requests sent back to DA yet" />
                    ) : (
                      <SentBackTable requests={filterReqs(sentBackRequests)} onView={r => openRequest(r)} />
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog — now full width with complete details */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogTitle()}</DialogTitle>
            <DialogDescription>{dialogDesc()}</DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-5">
              {/* Returned banner */}
              {selectedRequest.status === "sent_back_to_ar" && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl flex gap-3">
                  <CornerUpLeft className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-orange-900">Returned by DR for Re-recommendation</p>
                    {selectedRequest.drRemarks && (
                      <p className="text-xs text-orange-700 mt-1">DR remarks: <span className="italic">{selectedRequest.drRemarks}</span></p>
                    )}
                  </div>
                </div>
              )}

              {/* ✅ FULL MEITY-format details — Point 7 editable by AR */}
              <RequestFullDetail
                request={toDetailData(selectedRequest)}
                viewerStage="ar"
                onFieldSaved={(updates) => {
                  setSelectedRequest(prev => prev ? { ...prev, ...updates } : prev);
                }}
              />

             
              {/* Inline action picker */}
              {!pendingAction && canAct(selectedRequest) && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <p className="text-xs font-semibold text-slate-600">Select an action</p>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" className="h-8 text-xs bg-indigo-700 hover:bg-indigo-800" onClick={() => setPendingAction("recommend")}>
                      Recommend &amp; Forward to DR
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs border-orange-400 text-orange-600 hover:bg-orange-50" onClick={() => setPendingAction("sendback")}>
                      <CornerUpLeft className="h-3.5 w-3.5 mr-1" /> Send Back to DA
                    </Button>
                  </div>
                </div>
              )}

              {pendingAction && canAct(selectedRequest) && (
                <div className="space-y-1.5">
                  <Label className="text-sm">
                    {pendingAction === "recommend" ? "Remarks (Optional — visible to DR)" : "Remarks (Required)"}
                  </Label>
                  <Textarea
                    placeholder={pendingAction === "recommend" ? "Enter comments for DR to see..." : "Reason for sending back to DA..."}
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    rows={3}
                    className="border-indigo-200 focus:border-indigo-400"
                  />
                </div>
              )}

              {!canAct(selectedRequest) && selectedRequest.status !== "approved" && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
                  <Lock className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-800">
                    Currently at <strong>{selectedRequest.currentStage.toUpperCase()}</strong> stage. View only.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setPendingAction(null); }} disabled={actionLoading}>Cancel</Button>
            {selectedRequest && canAct(selectedRequest) && pendingAction && (
              <Button
                onClick={handleAction}
                disabled={actionLoading}
                className={pendingAction === "recommend" ? "bg-indigo-700 hover:bg-indigo-800" : "bg-orange-500 hover:bg-orange-600"}
              >
                {actionLoading
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
                  : pendingAction === "recommend" ? "Recommend & Forward to DR" : "Send Back to DA"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

const EmptyState = ({ icon, message }: { icon: React.ReactNode; message: string }) => (
  <div className="flex flex-col items-center justify-center py-14 text-slate-400">
    <div className="mb-3 opacity-30">{icon}</div>
    <p className="text-sm">{message}</p>
  </div>
);

const RequestsTable = ({ requests, canAct, onView }: {
  requests: BudgetRequest[];
  canAct: (r: BudgetRequest) => boolean;
  onView: (r: BudgetRequest, action?: ActionType) => void;
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
            r.status === "sent_back_to_ar" ? "bg-orange-50/40" : canAct(r) ? "bg-indigo-50/40" : ""
          }`}>
            <td className="text-xs px-3 py-2.5 text-slate-500">{formatDate(r.createdAt)}</td>
            <td className="text-xs font-semibold px-3 py-2.5">
              {r.gpNumber}
              {r.status === "sent_back_to_ar" && (
                <div className="mt-0.5">
                  <Badge className="bg-orange-100 text-orange-700 text-[10px] flex items-center gap-1 w-fit">
                    <CornerUpLeft className="h-2.5 w-2.5" />Returned by DR
                  </Badge>
                </div>
              )}
            </td>
            <td className="text-xs px-3 py-2.5">{r.piName}</td>
            <td className="text-xs px-3 py-2.5 max-w-[140px] truncate">{r.purpose}</td>
            <td className="text-xs px-3 py-2.5 font-medium">{formatAmount(r.amount)}</td>
            <td className="text-xs px-3 py-2.5 text-slate-600 max-w-[180px] truncate italic" title={r.latestRemark}>
              {r.latestRemark || "--"}
            </td>
            <td className="px-3 py-2.5">
              <div className="flex gap-1.5 flex-wrap items-center">
                <Button
                  size="sm"
                  className={`h-7 text-xs px-2.5 ${r.status === "sent_back_to_ar" ? "bg-orange-600 hover:bg-orange-700" : "bg-indigo-700 hover:bg-indigo-800"}`}
                  onClick={() => onView(r, "recommend")}
                >
                  {r.status === "sent_back_to_ar" ? "Re-recommend" : "Recommend"}
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs px-2.5 border-orange-400 text-orange-600 hover:bg-orange-50" onClick={() => onView(r, "sendback")}>
                  <CornerUpLeft className="h-3 w-3 mr-1" /> Send Back
                </Button>
              </div>
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
            <td className="text-xs px-3 py-2.5 text-slate-600 max-w-[150px] truncate italic">
              {r.arRemarks || "--"}
            </td>
            <td className="px-3 py-2.5">
              <Badge className="bg-emerald-100 text-emerald-800 text-xs">Recommended</Badge>
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
          <tr key={r.id} className="border-b border-orange-100 hover:bg-orange-50/40">
            <td className="text-xs px-3 py-2.5 text-slate-500">{formatDate(r.createdAt)}</td>
            <td className="text-xs font-semibold px-3 py-2.5">{r.gpNumber}</td>
            <td className="text-xs px-3 py-2.5">{r.piName}</td>
            <td className="text-xs px-3 py-2.5">{formatAmount(r.amount)}</td>
            <td className="text-xs px-3 py-2.5 text-slate-600 max-w-[150px] truncate italic">
              {r.arRemarks || "--"}
            </td>
            <td className="px-3 py-2.5">
              <Badge className="bg-orange-100 text-orange-800 text-xs">Sent Back to DA</Badge>
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

export default ARDashboard;