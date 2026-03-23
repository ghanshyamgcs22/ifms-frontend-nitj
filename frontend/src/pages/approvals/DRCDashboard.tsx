// pages/approvals/DRCDashboard.tsx
// "Query to PI" and "Send Back to DRC (R&C)" merged into one split-button dropdown

import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApprovalTimeline } from "@/components/ApprovalTimeline";
import { useState, useEffect, useRef } from "react";
import {
  Search, Clock, Loader2, Lock, ArrowRight, RotateCcw,
  ArrowLeftRight, Eye, FileText, ChevronDown, MessageSquare, CornerUpLeft,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const API = import.meta.env.VITE_API_URL || "https://ifms-backend-nitj.onrender.com/api";

interface BudgetRequest {
  id: string; gpNumber: string; projectTitle: string; piName: string; department: string;
  purpose: string; description: string; amount: number; projectType: string;
  invoiceNumber: string; fileNumber?: string; quotationFileName?: string;
  status: string; currentStage: string; createdAt: string;
  daRemarks?: string; arRemarks?: string; drRemarks?: string; drcOfficeRemarks?: string;
  drcRcRemarks?: string; drcRemarks?: string; directorRemarks?: string;
  approvalHistory?: any[];
  rejectedAtStage?: string; rejectedAtStageLabel?: string; rejectionRemarks?: string;
  rejectedBy?: string; rejectedAt?: string;
}

type ActionType = "forward" | "query" | "sendback" | null;

const formatDate = (d: string) =>
  !d ? "—" : new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const formatAmount = (n: number) => `₹${(n / 100000).toFixed(2)}L`;

const canAct = (r: BudgetRequest) =>
  r.currentStage === "drc" &&
  (r.status === "drc_rc_forwarded" || r.status === "sent_back_to_drc");

const viewQuotation = (r: BudgetRequest) => {
  window.open(`${API}/download-file.php?requestId=${r.id}&type=quotation`, "_blank");
};

// ── Reusable split button ─────────────────────────────────────────────────────
// Left half = primary action (Query PI). Right chevron opens dropdown with both.
const QuerySendBackButton = ({
  onQuery,
  onSendBack,
  sendBackLabel = "Send Back to DRC (R&C)",
}: {
  onQuery: () => void;
  onSendBack: () => void;
  sendBackLabel?: string;
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
      {/* Primary half — Query PI */}
      <button
        onClick={() => { setOpen(false); onQuery(); }}
        className="h-7 text-xs px-2.5 rounded-l-md border border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap"
      >
        <MessageSquare className="h-3 w-3" /> Query / Send Back
      </button>
      {/* Chevron half */}
      <button
        onClick={() => setOpen(v => !v)}
        className="h-7 w-6 rounded-r-md border border-l-0 border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 flex items-center justify-center transition-colors"
        aria-label="More options"
      >
        <ChevronDown className="h-3 w-3" />
      </button>

      {/* Dropdown menu */}
      {open && (
        <div className="absolute top-8 left-0 z-50 min-w-[210px] bg-white border border-slate-200 rounded-lg shadow-lg py-1 overflow-hidden">
          <button
            onClick={() => { setOpen(false); onQuery(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left hover:bg-amber-50 transition-colors"
          >
            <MessageSquare className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <div>
              <p className="font-semibold text-slate-800">Query to PI</p>
              <p className="text-slate-400 text-[10px] mt-0.5">Send clarification request to PI</p>
            </div>
          </button>
          <div className="h-px bg-slate-100 mx-2" />
          <button
            onClick={() => { setOpen(false); onSendBack(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left hover:bg-orange-50 transition-colors"
          >
            <CornerUpLeft className="h-3.5 w-3.5 text-orange-600 shrink-0" />
            <div>
              <p className="font-semibold text-slate-800">{sendBackLabel}</p>
              <p className="text-slate-400 text-[10px] mt-0.5">Return for re-evaluation</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

const DRCDashboard = () => {
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
      const r1 = await fetch(`${API}/get-requests-by-stage.php?stage=drc&type=pending`);
      const d1 = await r1.json(); setPendingRequests(d1.data || []);
      const r2 = await fetch(`${API}/get-requests-by-stage.php?stage=drc&type=completed`);
      const d2 = await r2.json(); setCompletedRequests(d2.data || []);
    } catch { toast.error("Failed to load requests"); }
    finally { setLoading(false); }
  };

  const handleAction = async () => {
    if (!selectedRequest || !pendingAction) return;
    if (pendingAction !== "forward" && !remarks.trim()) { toast.error("Please enter remarks"); return; }
    try {
      setActionLoading(true);
      let endpoint = "";
      let body: any = { requestId: selectedRequest.id, remarks, actionBy: "DRC" };
      if (pendingAction === "forward") {
        endpoint = `${API}/drc-forward-director.php`; body.forwardedBy = "DRC";
      } else if (pendingAction === "query") {
        endpoint = `${API}/raise-query.php`; body.queryTo = "pi"; body.queryBy = "drc";
      } else if (pendingAction === "sendback") {
        endpoint = `${API}/sendback-request.php`; body.sendBackTo = "drc_rc"; body.sentBackBy = "DRC";
      }
      const res  = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success({
        forward:  "Forwarded to Director.",
        query:    "Query raised to PI.",
        sendback: "Sent back to DRC (R&C).",
      }[pendingAction]);
      setDialogOpen(false); setSelectedRequest(null); setRemarks(""); setPendingAction(null);
      await fetchRequests();
    } catch (e: any) { toast.error(e.message || "Action failed"); }
    finally { setActionLoading(false); }
  };

  const filterReqs = (list: BudgetRequest[]) => {
    const q = reqSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(r =>
      r.gpNumber?.toLowerCase().includes(q) || r.piName?.toLowerCase().includes(q) ||
      r.purpose?.toLowerCase().includes(q)  || r.department?.toLowerCase().includes(q)
    );
  };

  const openRequest = (r: BudgetRequest, action?: ActionType) => {
    setSelectedRequest(r); setRemarks(""); setPendingAction(action || null); setDialogOpen(true);
  };

  const fromDrcRc       = pendingRequests.filter(r => r.status === "drc_rc_forwarded");
  const returnedFromDir = pendingRequests.filter(r => r.status === "sent_back_to_drc");
  const forwarded       = completedRequests.filter(r => r.status === "drc_forwarded");
  const sentbackToDrcRc = completedRequests.filter(r => r.status === "sent_back_to_drc_rc");

  const dialogTitle = () => {
    if (pendingAction === "forward")  return "Forward to Director";
    if (pendingAction === "query")    return "Query to PI";
    if (pendingAction === "sendback") return "Send Back to DRC (R&C)";
    return "Request Details";
  };
  const dialogDesc = () => {
    if (pendingAction === "forward")  return "Request will go to Director for final approval.";
    if (pendingAction === "query")    return "Raise a query to the PI. Stage will not change until PI responds.";
    if (pendingAction === "sendback") return "Return to DRC (R&C) for re-evaluation. Remarks are required.";
    return "View-only mode.";
  };
  const actionBtnLabel = () => {
    if (pendingAction === "forward")  return "Forward to Director ➡";
    if (pendingAction === "query")    return "Send Query to PI";
    if (pendingAction === "sendback") return "Send Back to DRC (R&C)";
    return "";
  };
  const actionBtnCls = () => {
    if (pendingAction === "forward")  return "bg-indigo-600 hover:bg-indigo-700";
    if (pendingAction === "query")    return "bg-amber-500 hover:bg-amber-600";
    if (pendingAction === "sendback") return "bg-orange-500 hover:bg-orange-600";
    return "";
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-slate-50 to-gray-50">
        <div className="space-y-6 p-6">

          <div className="bg-white/70 backdrop-blur-lg border border-indigo-200/60 rounded-xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">DRC Dashboard</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Penultimate stage before Director &nbsp;
                <span className="text-slate-400 font-mono text-[11px]">
                  DA → AR → DR → DRC Office → DRC (R&C) → <strong className="text-indigo-600">DRC</strong> → Director
                </span>
              </p>
            </div>
            <Button onClick={fetchRequests} variant="outline" size="sm">Refresh</Button>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "From DRC (R&C)",        value: fromDrcRc.length,       color: "text-indigo-600",  icon: <Clock          className="h-4 w-4 text-indigo-500" />, sub: "Freshly forwarded" },
              { label: "Returned by Director",   value: returnedFromDir.length, color: "text-blue-600",    icon: <ArrowLeftRight className="h-4 w-4 text-blue-500"   />, sub: "Director sent back" },
              { label: "Forwarded to Director",  value: forwarded.length,       color: "text-emerald-600", icon: <ArrowRight     className="h-4 w-4 text-emerald-500"/>, sub: "Awaiting final decision" },
              { label: "Sent Back to DRC (R&C)", value: sentbackToDrcRc.length, color: "text-orange-600",  icon: <RotateCcw      className="h-4 w-4 text-orange-500" />, sub: "Returned for re-eval" },
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
                  <CardDescription className="mt-0.5">Receives from <strong>DRC (R&C)</strong> and <strong>Director</strong> (sent-back). Forwards to <strong>Director</strong>.</CardDescription>
                </div>
                <div className="relative flex-shrink-0">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none"/>
                  <Input placeholder="Search GP No., PI, purpose…" value={reqSearch}
                    onChange={e => setReqSearch(e.target.value)} className="pl-8 h-8 w-56 text-xs border-slate-200"/>
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
                      <TabsTrigger value="from-drc-rc">From DRC (R&C) ({fromDrcRc.length})</TabsTrigger>
                      <TabsTrigger value="from-director">Returned by Director ({returnedFromDir.length})</TabsTrigger>
                      <TabsTrigger value="forwarded">Forwarded to Director ({forwarded.length})</TabsTrigger>
                      <TabsTrigger value="sentback">Sent Back to R&C ({sentbackToDrcRc.length})</TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="from-drc-rc" className="px-4 pb-4 mt-3">
                    {filterReqs(fromDrcRc).length === 0
                      ? <EmptyState icon={<Clock className="h-10 w-10"/>} message="No fresh requests from DRC (R&C)"/>
                      : <PendingTable requests={filterReqs(fromDrcRc)} onView={openRequest} sourceLabel="DRC (R&C)" remarksField="drcRcRemarks"/>}
                  </TabsContent>
                  <TabsContent value="from-director" className="px-4 pb-4 mt-3">
                    {filterReqs(returnedFromDir).length === 0
                      ? <EmptyState icon={<ArrowLeftRight className="h-10 w-10"/>} message="No requests returned by Director yet"/>
                      : <PendingTable requests={filterReqs(returnedFromDir)} onView={openRequest} sourceLabel="Director" remarksField="directorRemarks"/>}
                  </TabsContent>
                  <TabsContent value="forwarded" className="px-4 pb-4 mt-3">
                    {filterReqs(forwarded).length === 0
                      ? <EmptyState icon={<ArrowRight className="h-10 w-10"/>} message="No forwarded requests yet"/>
                      : <HistoryTable requests={filterReqs(forwarded)} onView={r => openRequest(r)}/>}
                  </TabsContent>
                  <TabsContent value="sentback" className="px-4 pb-4 mt-3">
                    {filterReqs(sentbackToDrcRc).length === 0
                      ? <EmptyState icon={<RotateCcw className="h-10 w-10"/>} message="No sent-back requests"/>
                      : <HistoryTable requests={filterReqs(sentbackToDrcRc)} onView={r => openRequest(r)}/>}
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogTitle()}</DialogTitle>
            <DialogDescription>{dialogDesc()}</DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-5">
              <Badge className={
                selectedRequest.status === "sent_back_to_drc"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-indigo-100 text-indigo-800"
              }>
                {selectedRequest.status === "sent_back_to_drc" ? "Returned by Director" : "Forwarded by DRC (R&C)"}
              </Badge>

              {/* File number + view quotation */}
              {selectedRequest.fileNumber && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <FileText className="h-4 w-4 text-slate-500 shrink-0"/>
                  <div className="flex-1">
                    <p className="text-xs text-slate-500">File Number</p>
                    <p className="text-sm font-bold font-mono text-slate-800">{selectedRequest.fileNumber}</p>
                  </div>
                  <button onClick={() => viewQuotation(selectedRequest)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded transition-colors">
                    <Eye className="h-3.5 w-3.5"/> View Quotation
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                {[
                  ["GP Number",    selectedRequest.gpNumber],
                  ["PI Name",      selectedRequest.piName],
                  ["Department",   selectedRequest.department],
                  ["Amount",       formatAmount(selectedRequest.amount)],
                  ["Project Type", selectedRequest.projectType],
                  ["Invoice No.",  selectedRequest.invoiceNumber || "—"],
                ].map(([label, val]) => (
                  <div key={label}><p className="text-xs text-slate-500">{label}</p><p className="text-sm font-medium text-slate-800">{val}</p></div>
                ))}
              </div>

              <div className="space-y-2">
                {selectedRequest.daRemarks        && <div className="p-3 bg-blue-50   border border-blue-200   rounded-lg"><p className="text-xs text-blue-600   font-medium mb-1">DA Remarks:</p>         <p className="text-sm text-slate-700">{selectedRequest.daRemarks}</p></div>}
                {selectedRequest.arRemarks        && <div className="p-3 bg-sky-50    border border-sky-200    rounded-lg"><p className="text-xs text-sky-600    font-medium mb-1">AR Remarks:</p>         <p className="text-sm text-slate-700">{selectedRequest.arRemarks}</p></div>}
                {selectedRequest.drRemarks        && <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg"><p className="text-xs text-purple-600 font-medium mb-1">DR Remarks:</p>         <p className="text-sm text-slate-700">{selectedRequest.drRemarks}</p></div>}
                {selectedRequest.drcOfficeRemarks && <div className="p-3 bg-cyan-50   border border-cyan-200   rounded-lg"><p className="text-xs text-cyan-600   font-medium mb-1">DRC Office Remarks:</p> <p className="text-sm text-slate-700">{selectedRequest.drcOfficeRemarks}</p></div>}
                {selectedRequest.drcRcRemarks     && <div className="p-3 bg-teal-50   border border-teal-200   rounded-lg"><p className="text-xs text-teal-600   font-medium mb-1">DRC (R&C) Remarks:</p>  <p className="text-sm text-slate-700">{selectedRequest.drcRcRemarks}</p></div>}
                {selectedRequest.directorRemarks  && <div className="p-3 bg-violet-50 border border-violet-200 rounded-lg"><p className="text-xs text-violet-600 font-medium mb-1">Director Remarks:</p>    <p className="text-sm text-slate-700">{selectedRequest.directorRemarks}</p></div>}
              </div>

              <div><p className="text-xs text-slate-500 mb-1">Purpose</p><p className="text-sm">{selectedRequest.purpose}</p></div>

              <ApprovalTimeline
                approvalHistory={selectedRequest.approvalHistory}
                currentStage={selectedRequest.currentStage}
                status={selectedRequest.status}
                piName={selectedRequest.piName}
                createdAt={selectedRequest.createdAt}
                amount={selectedRequest.amount}
              />

              {pendingAction && canAct(selectedRequest) && (
                <div className="space-y-1.5">
                  <Label className="text-sm">
                    {pendingAction === "forward" ? "Remarks (Optional)" : "Remarks (Required)"}
                  </Label>
                  <Textarea
                    placeholder={
                      pendingAction === "query"    ? "Describe the clarification needed from PI…"
                      : pendingAction === "sendback" ? "Reason for returning to DRC (R&C)…"
                      : "Forwarding notes (optional)…"
                    }
                    value={remarks} onChange={e => setRemarks(e.target.value)}
                    rows={3} className="border-indigo-200 focus:border-indigo-400"
                  />
                </div>
              )}

              {/* Inline action picker when dialog opened without a pre-set action */}
              {!pendingAction && canAct(selectedRequest) && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <p className="text-xs font-semibold text-slate-600">Select an action</p>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700" onClick={() => setPendingAction("forward")}>Forward to Director</Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs border-amber-400 text-amber-600 hover:bg-amber-50" onClick={() => setPendingAction("query")}>Query to PI</Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs border-orange-400 text-orange-600 hover:bg-orange-50" onClick={() => setPendingAction("sendback")}>Send Back to DRC (R&C)</Button>
                  </div>
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
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={actionLoading}>Cancel</Button>
            {selectedRequest && canAct(selectedRequest) && pendingAction && (
              <Button onClick={handleAction} disabled={actionLoading} className={actionBtnCls()}>
                {actionLoading
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Processing…</>
                  : actionBtnLabel()}
              </Button>
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

const PendingTable = ({
  requests, onView, sourceLabel, remarksField,
}: {
  requests: BudgetRequest[];
  onView: (r: BudgetRequest, action?: ActionType) => void;
  sourceLabel: string;
  remarksField: keyof BudgetRequest;
}) => (
  <div className="overflow-x-auto rounded-lg border border-slate-200">
    <Table>
      <TableHeader>
        <TableRow className="bg-slate-50">
          {["Date", "GP Number", "PI Name", "Purpose", "Amount", `${sourceLabel} Remarks`, "Actions"].map(h => (
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
            <TableCell className="text-xs px-3 max-w-[110px] truncate">{r.purpose}</TableCell>
            <TableCell className="text-xs px-3 font-medium text-indigo-700">{formatAmount(r.amount)}</TableCell>
            <TableCell className="text-xs px-3 text-slate-500 max-w-[100px] truncate italic">{(r[remarksField] as string) || "—"}</TableCell>
            <TableCell className="px-3">
              <div className="flex gap-1.5 flex-wrap items-center">
                {/* Forward to Director */}
                <Button size="sm" className="h-7 text-xs px-2.5 bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => onView(r, "forward")}>
                  Forward to Director
                </Button>
                {/* Merged Query / Send Back split button */}
                <QuerySendBackButton
                  onQuery={   () => onView(r, "query")}
                  onSendBack={() => onView(r, "sendback")}
                  sendBackLabel="Send Back to DRC (R&C)"
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
          {["Date", "GP Number", "PI Name", "Amount", "Status", ""].map(h => (
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
            <TableCell className="px-3">
              {r.status === "drc_forwarded"
                ? <Badge className="bg-indigo-100 text-indigo-800 text-xs">Forwarded to Director</Badge>
                : r.status === "sent_back_to_drc_rc"
                ? <Badge className="bg-orange-100 text-orange-800 text-xs">Sent Back to DRC (R&C)</Badge>
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

export default DRCDashboard;
