// pages/approvals/DRCOfficeDashboard.tsx
// ✅ Full MEITY details via RequestFullDetail — DRC Office is read-only for pts 7 & 8

import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApprovalTimeline } from "@/components/ApprovalTimeline";
import { RequestFullDetail, RequestDetailData } from "@/components/RequestViewDetail";
import { useState, useEffect } from "react";
import { Search, Clock, Loader2, Lock, ArrowRight, CornerUpLeft } from "lucide-react";
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
}

type ActionType = "forward" | "sendback" | null;

const formatDate   = (d: string) => !d ? "--" : new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const formatAmount = (n: number) => `Rs.${(n / 100000).toFixed(2)}L`;
const canAct = (r: BudgetRequest) =>
  r.currentStage === "drc_office" && r.status === "dr_approved";

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

const DRCOfficeDashboard = () => {
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
      const r1 = await fetch(`${import.meta.env.VITE_API_URL}/get-requests-by-stage.php?stage=drc_office&type=pending`);
      const d1 = await r1.json(); setPendingRequests(d1.data || []);
      const r2 = await fetch(`${import.meta.env.VITE_API_URL}/get-requests-by-stage.php?stage=drc_office&type=completed`);
      const d2 = await r2.json(); setCompletedRequests(d2.data || []);
    } catch { toast.error("Failed to load requests"); }
    finally { setLoading(false); }
  };

  const handleAction = async () => {
    if (!selectedRequest || !pendingAction) return;
    if (pendingAction === "sendback" && !remarks.trim()) { toast.error("Please enter remarks for send-back"); return; }
    try {
      setActionLoading(true);
      let endpoint = ""; const body: any = { requestId: selectedRequest.id, remarks, actionBy: "DRC Office" };
      if (pendingAction === "forward") {
        endpoint = `${import.meta.env.VITE_API_URL}/drc-office-forward.php`;
      } else {
        endpoint = `${import.meta.env.VITE_API_URL}/sendback-request.php`;
        body.sendBackTo = "dr"; body.sentBackBy = "DRC Office";
      }
      const res  = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success(pendingAction === "forward" ? "Forwarded to DR (R&C)." : "Request sent back to DR.");
      setDialogOpen(false); setSelectedRequest(null); setRemarks(""); setPendingAction(null);
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

  const forwarded = completedRequests.filter(r => r.status === "drc_office_forwarded");
  const sentBack  = completedRequests.filter(r => r.status === "sent_back_to_dr");

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-slate-50 to-gray-50">
        <div className="space-y-6 p-6">

          <div className="bg-white/70 backdrop-blur-lg border border-cyan-200/60 rounded-xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">DRC Office Dashboard</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Handles requests more than Rs.25,000 forwarded by DR
                <span className="text-slate-400 font-mono text-[11px] ml-1">
                  DA → AR → DR → <strong className="text-cyan-600">DRC Office</strong> → DR (R&C) → DRC → Director
                </span>
              </p>
            </div>
            <Button onClick={fetchRequests} variant="outline" size="sm">Refresh</Button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Pending Action",         value: pendingRequests.length, color: "text-cyan-600",    icon: <Clock        className="h-4 w-4 text-cyan-500"   />, sub: "DR-approved, awaiting DRC Office" },
              { label: "Forwarded to DR (R&C)", value: forwarded.length,       color: "text-emerald-600", icon: <ArrowRight   className="h-4 w-4 text-emerald-500"/>, sub: "Sent for R&C review" },
              { label: "Sent Back to DR",        value: sentBack.length,        color: "text-orange-600",  icon: <CornerUpLeft className="h-4 w-4 text-orange-500" />, sub: "Returned to DR" },
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

          <Card className="border border-slate-200/60 bg-white/70 backdrop-blur-lg shadow-lg">
            <CardHeader className="border-b border-slate-100">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-800">Budget Requests</CardTitle>
                  <CardDescription className="mt-0.5">Only <strong>DR-approved</strong> requests above Rs.25,000 appear here.</CardDescription>
                </div>
                <div className="relative flex-shrink-0">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none"/>
                  <Input placeholder="Search by GP, PI, Purpose, File or Date..." value={reqSearch} onChange={e => setReqSearch(e.target.value)} className="pl-8 h-8 w-64 text-xs border-slate-200"/>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-cyan-400 mr-2"/>
                  <p className="text-slate-500 text-sm">Loading...</p>
                </div>
              ) : (
                <Tabs defaultValue="pending">
                  <div className="px-4 pt-3">
                    <TabsList className="bg-cyan-50">
                      <TabsTrigger value="pending">Pending ({pendingRequests.length})</TabsTrigger>
                      <TabsTrigger value="forwarded">Forwarded ({forwarded.length})</TabsTrigger>
                      <TabsTrigger value="sentback">Sent Back to DR ({sentBack.length})</TabsTrigger>
                    </TabsList>
                  </div>
                  <TabsContent value="pending" className="px-4 pb-4 mt-3">
                    {filterReqs(pendingRequests).length === 0
                      ? <EmptyState icon={<Clock className="h-10 w-10"/>} message={reqSearch ? "No matching requests." : "No requests pending at DRC Office"}/>
                      : <PendingTable requests={filterReqs(pendingRequests)} canAct={canAct} onView={openRequest}/>}
                  </TabsContent>
                  <TabsContent value="forwarded" className="px-4 pb-4 mt-3">
                    {filterReqs(forwarded).length === 0
                      ? <EmptyState icon={<ArrowRight className="h-10 w-10"/>} message="No forwarded requests yet"/>
                      : <HistoryTable requests={filterReqs(forwarded)} onView={r => openRequest(r)}/>}
                  </TabsContent>
                  <TabsContent value="sentback" className="px-4 pb-4 mt-3">
                    {filterReqs(sentBack).length === 0
                      ? <EmptyState icon={<CornerUpLeft className="h-10 w-10"/>} message="No requests sent back to DR yet"/>
                      : <SentBackTable requests={filterReqs(sentBack)} onView={r => openRequest(r)}/>}
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ✅ Dialog — full MEITY details, DRC Office is read-only for pts 7 & 8 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {pendingAction === "forward"  ? "Forward to DR (R&C)"
              : pendingAction === "sendback" ? "Send Back to DR"
              : "Request Details"}
            </DialogTitle>
            <DialogDescription>
              {pendingAction === "forward"  ? "This request will be sent to DR (R&C) for further evaluation."
              : pendingAction === "sendback" ? "Return this request to DR for re-evaluation. Remarks are required."
              : "View-only mode"}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-5">
              {/* ✅ Full MEITY-format details — read-only for DRC Office */}
              <RequestFullDetail
                request={toDetailData(selectedRequest)}
                viewerStage="drc_office"
                onFieldSaved={(updates) => {
                  setSelectedRequest(prev => prev ? { ...prev, ...updates } : prev);
                }}
              />

              <ApprovalTimeline
                approvalHistory={selectedRequest.approvalHistory}
                currentStage={selectedRequest.currentStage}
                status={selectedRequest.status}
                piName={selectedRequest.piName}
                createdAt={selectedRequest.createdAt}
                amount={selectedRequest.amount}
              />

              {!pendingAction && canAct(selectedRequest) && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <p className="text-xs font-semibold text-slate-600">Select an action</p>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" className="h-8 text-xs bg-cyan-600 hover:bg-cyan-700" onClick={() => setPendingAction("forward")}>
                      Forward to DR (R&C)
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs border-orange-400 text-orange-600 hover:bg-orange-50" onClick={() => setPendingAction("sendback")}>
                      <CornerUpLeft className="h-3.5 w-3.5 mr-1"/> Send Back to DR
                    </Button>
                  </div>
                </div>
              )}

              {pendingAction && canAct(selectedRequest) && (
                <div className="space-y-1.5">
                  <Label className="text-sm">{pendingAction === "forward" ? "Remarks (Optional)" : "Remarks (Required)"}</Label>
                  <Textarea
                    placeholder={pendingAction === "forward" ? "Forwarding notes (optional)..." : "Reason for sending back to DR..."}
                    value={remarks} onChange={e => setRemarks(e.target.value)} rows={3} className="border-cyan-200 focus:border-cyan-400"
                  />
                </div>
              )}

              {!canAct(selectedRequest) && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
                  <Lock className="h-5 w-5 text-amber-600 mt-0.5 shrink-0"/>
                  <p className="text-sm text-amber-800">Currently at <strong>{selectedRequest.currentStage.toUpperCase()}</strong> stage. View only.</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setPendingAction(null); }} disabled={actionLoading}>Cancel</Button>
            {selectedRequest && canAct(selectedRequest) && pendingAction && (
              <Button onClick={handleAction} disabled={actionLoading} className={pendingAction === "forward" ? "bg-cyan-600 hover:bg-cyan-700" : "bg-orange-500 hover:bg-orange-600"}>
                {actionLoading
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Processing...</>
                  : pendingAction === "forward" ? "Forward to DR (R&C)" : <><CornerUpLeft className="h-4 w-4 mr-1"/>Send Back to DR</>}
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
    <div className="mb-3 opacity-30">{icon}</div><p className="text-sm">{message}</p>
  </div>
);

const PendingTable = ({ requests, canAct, onView }: {
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
          <tr key={r.id} className={`border-b border-slate-100 hover:bg-slate-50/50 ${canAct(r) ? "bg-cyan-50/40" : ""}`}>
            <td className="text-xs px-3 py-2.5 text-slate-500">{formatDate(r.createdAt)}</td>
            <td className="text-xs font-semibold px-3 py-2.5">{r.gpNumber}</td>
            <td className="text-xs px-3 py-2.5">{r.piName}</td>
            <td className="text-xs px-3 py-2.5 max-w-[120px] truncate">{r.purpose}</td>
            <td className="text-xs px-3 py-2.5 font-medium text-cyan-700">{formatAmount(r.amount)}</td>
            <td className="text-xs px-3 py-2.5 text-slate-600 max-w-[150px] truncate italic" title={r.latestRemark}>
              {r.latestRemark || "--"}
            </td>
            <td className="px-3 py-2.5">
              {canAct(r) ? (
                <div className="flex gap-1.5 flex-wrap items-center">
                  <Button size="sm" className="h-7 text-xs px-2 bg-cyan-600 hover:bg-cyan-700" onClick={() => onView(r, "forward")}>Forward to DR (R&C)</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs px-2 border-orange-400 text-orange-600 hover:bg-orange-50" onClick={() => onView(r, "sendback")}>
                    <CornerUpLeft className="h-3 w-3 mr-1"/> Send Back
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" className="h-7 text-xs px-3" onClick={() => onView(r)}>View</Button>
              )}
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
            <td className="text-xs px-3 py-2.5 text-slate-500">{r.piName}</td>
            <td className="text-xs px-3 py-2.5 text-slate-600 max-w-[150px] truncate italic" title={r.latestRemark}>{r.latestRemark || "--"}</td>
            <td className="px-3 py-2.5"><Badge className="bg-cyan-100 text-cyan-800 text-xs">Forwarded to DR (R&C)</Badge></td>
            <td className="px-3 py-2.5"><Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onView(r)}>View</Button></td>
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
            <td className="text-xs px-3 py-2.5 text-slate-600 max-w-[150px] truncate italic" title={r.latestRemark}>{r.latestRemark || "--"}</td>
            <td className="px-3 py-2.5"><Badge className="bg-orange-100 text-orange-800 text-xs">Sent Back to DR</Badge></td>
            <td className="px-3 py-2.5"><Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onView(r)}>View</Button></td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default DRCOfficeDashboard;