// pages/approvals/DRDashboard.tsx
// DR = Director — FINAL stage in the approval chain
// CHANGED: all emojis removed throughout

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
import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import {
  Clock, CheckCircle, History, Loader2, Lock, XCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface BudgetRequest {
  id: string;
  gpNumber: string;
  projectTitle: string;
  piName: string;
  department: string;
  purpose: string;
  description: string;
  amount: number;
  projectType: string;
  invoiceNumber: string;
  status: string;
  currentStage: string;
  createdAt: string;
  daRemarks?: string;
  arRemarks?: string;
  drRemarks?: string;
  approvalHistory?: any[];
}

const formatDate = (d: string) =>
  !d ? "—" : new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const formatAmount = (n: number) => `₹${(n / 100000).toFixed(2)}L`;

const DRDashboard = () => {
  const [myTurnRequests,    setMyTurnRequests]    = useState<BudgetRequest[]>([]);
  const [completedRequests, setCompletedRequests] = useState<BudgetRequest[]>([]);
  const [loading,           setLoading]           = useState(true);

  const [selectedRequest, setSelectedRequest] = useState<BudgetRequest | null>(null);
  const [dialogOpen,      setDialogOpen]      = useState(false);
  const [remarks,         setRemarks]         = useState("");
  const [actionLoading,   setActionLoading]   = useState(false);

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const r1 = await fetch("http://localhost:8000/api/get-requests-by-stage.php?stage=dr&type=pending");
      const d1 = await r1.json();
      setMyTurnRequests(d1.data || []);

      const r2 = await fetch("http://localhost:8000/api/get-requests-by-stage.php?stage=all&type=completed");
      const d2 = await r2.json();
      setCompletedRequests(d2.data || []);
    } catch { toast.error("Failed to load requests"); }
    finally   { setLoading(false); }
  };

  const canApprove = (r: BudgetRequest) =>
    r.currentStage === "dr" && r.status === "ar_approved";

  const handleApprove = async () => {
    if (!selectedRequest || !canApprove(selectedRequest)) return;
    try {
      setActionLoading(true);
      const res = await fetch("http://localhost:8000/api/dr-approve.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: selectedRequest.id, remarks, approvedBy: "Director" }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      // CHANGED: emoji removed from toast
      toast.success("Budget request fully approved.");
      setDialogOpen(false); setSelectedRequest(null); setRemarks("");
      await fetchRequests();
    } catch (e: any) { toast.error(e.message || "Failed to approve"); }
    finally  { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!selectedRequest || !canApprove(selectedRequest)) return;
    if (!remarks.trim()) { toast.error("Please enter remarks for rejection"); return; }
    try {
      setActionLoading(true);
      const res = await fetch("http://localhost:8000/api/reject-request.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: selectedRequest.id, stage: "dr", remarks, rejectedBy: "Director" }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.error("Request rejected by Director");
      setDialogOpen(false); setSelectedRequest(null); setRemarks("");
      await fetchRequests();
    } catch (e: any) { toast.error(e.message || "Failed to reject"); }
    finally  { setActionLoading(false); }
  };

  const [reqSearch, setReqSearch] = useState("");

  const filterReqs = (list: BudgetRequest[]) => {
    const q = reqSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(r =>
      r.gpNumber?.toLowerCase().includes(q) ||
      r.piName?.toLowerCase().includes(q) ||
      r.purpose?.toLowerCase().includes(q) ||
      r.invoiceNumber?.toLowerCase().includes(q) ||
      r.department?.toLowerCase().includes(q) ||
      (r.createdAt && new Date(r.createdAt).getFullYear().toString().includes(q))
    );
  };

  const openRequest = (r: BudgetRequest) => { setSelectedRequest(r); setRemarks(""); setDialogOpen(true); };

  const approved = completedRequests.filter(r => r.status === "approved");
  const rejected = completedRequests.filter(r => r.status === "rejected");

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-slate-50 to-gray-50">
        <div className="space-y-6 p-6">

          {/* Header */}
          <div className="bg-white/70 backdrop-blur-lg border border-purple-200/60 rounded-xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Director Dashboard</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Final approval authority &nbsp;
                <span className="text-slate-400 font-mono">DA → AR → <strong className="text-purple-600">DR</strong></span>
              </p>
            </div>
            <Button onClick={fetchRequests} variant="outline" size="sm">Refresh</Button>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Awaiting Decision", value: myTurnRequests.length, color: "text-purple-600", icon: <Clock className="h-4 w-4 text-purple-500" />,       sub: "AR-recommended, needs DR action" },
              { label: "Approved by DR",    value: approved.length,       color: "text-emerald-600", icon: <CheckCircle className="h-4 w-4 text-emerald-500" />, sub: "Fully complete" },
              { label: "Rejected",          value: rejected.length,       color: "text-rose-600",    icon: <XCircle className="h-4 w-4 text-rose-500" />,        sub: "At any stage" },
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

          {/* Requests */}
          <Card className="border border-slate-200/60 bg-white/70 backdrop-blur-lg shadow-lg">
            <CardHeader className="border-b border-slate-100">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-800">Budget Requests</CardTitle>
                  <CardDescription className="mt-0.5">Only <strong>AR-recommended</strong> requests are actionable here. This is the final approval stage.</CardDescription>
                </div>
                <div className="relative flex-shrink-0">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <Input
                    placeholder="Search GP No., PI, purpose, year…"
                    value={reqSearch}
                    onChange={e => setReqSearch(e.target.value)}
                    className="pl-8 h-8 w-56 text-xs border-slate-200"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-purple-400 mr-2" />
                  <p className="text-slate-500 text-sm">Loading…</p>
                </div>
              ) : (
                <Tabs defaultValue="myturn">
                  <div className="px-4 pt-3">
                    <TabsList className="bg-purple-50">
                      <TabsTrigger value="myturn">Awaiting Decision ({myTurnRequests.length})</TabsTrigger>
                      <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
                      <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="myturn" className="px-4 pb-4 mt-3">
                    {filterReqs(myTurnRequests).length === 0 ? (
                      <EmptyState icon={<Clock className="h-10 w-10" />} message={reqSearch ? "No matching requests." : "No requests awaiting Director approval"} />
                    ) : (
                      <DRRequestsTable requests={filterReqs(myTurnRequests)} canApprove={canApprove} onView={openRequest} />
                    )}
                  </TabsContent>

                  <TabsContent value="approved" className="px-4 pb-4 mt-3">
                    {filterReqs(approved).length === 0 ? (
                      <EmptyState icon={<CheckCircle className="h-10 w-10" />} message={reqSearch ? "No matching requests." : "No approved requests yet"} />
                    ) : (
                      <HistoryTable requests={filterReqs(approved)} onView={openRequest} />
                    )}
                  </TabsContent>

                  <TabsContent value="rejected" className="px-4 pb-4 mt-3">
                    {filterReqs(rejected).length === 0 ? (
                      <EmptyState icon={<XCircle className="h-10 w-10" />} message={reqSearch ? "No matching requests." : "No rejected requests"} />
                    ) : (
                      <HistoryTable requests={filterReqs(rejected)} onView={openRequest} />
                    )}
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
            <DialogTitle>
              {/* CHANGED: emoji removed */}
              {selectedRequest && canApprove(selectedRequest) ? "Final Review & Approve (Director)" : "Request Details"}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && canApprove(selectedRequest)
                // CHANGED: emoji removed
                ? "This is the final approval stage. Once approved, the PI's booking amount is confirmed."
                : "View only"}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4 p-4 bg-purple-50 rounded-xl border border-purple-200">
                {[
                  ["GP Number",    selectedRequest.gpNumber],
                  ["PI Name",      selectedRequest.piName],
                  ["Department",   selectedRequest.department],
                  ["Amount",       formatAmount(selectedRequest.amount)],
                  ["Project Type", selectedRequest.projectType],
                  ["Invoice No.",  selectedRequest.invoiceNumber || "—"],
                ].map(([label, val]) => (
                  <div key={label}>
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="text-sm font-medium text-slate-800">{val}</p>
                  </div>
                ))}
              </div>

              {(selectedRequest.daRemarks || selectedRequest.arRemarks) && (
                <div className="space-y-2">
                  {selectedRequest.daRemarks && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-600 font-medium mb-1">DA Remarks:</p>
                      <p className="text-sm text-slate-700">{selectedRequest.daRemarks}</p>
                    </div>
                  )}
                  {selectedRequest.arRemarks && (
                    <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                      <p className="text-xs text-indigo-600 font-medium mb-1">AR Remarks:</p>
                      <p className="text-sm text-slate-700">{selectedRequest.arRemarks}</p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <p className="text-xs text-slate-500 mb-1">Purpose</p>
                <p className="text-sm">{selectedRequest.purpose}</p>
              </div>
              {selectedRequest.description && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Description</p>
                  <p className="text-sm">{selectedRequest.description}</p>
                </div>
              )}

              {/* ApprovalTimeline receives no emoji props — strip them inside the component */}
              <ApprovalTimeline
                approvalHistory={selectedRequest.approvalHistory}
                currentStage={selectedRequest.currentStage}
                status={selectedRequest.status}
                showEmojis={false}
              />

              {canApprove(selectedRequest) && (
                <div className="space-y-1.5">
                  <Label className="text-sm">Director Remarks (Optional)</Label>
                  <Textarea
                    placeholder="Enter final remarks…"
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    rows={3}
                    className="border-purple-200 focus:border-purple-400"
                  />
                </div>
              )}

              {!canApprove(selectedRequest) &&
                selectedRequest.status !== "approved" &&
                selectedRequest.status !== "rejected" && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
                  <Lock className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-800">
                    Currently at <strong>{selectedRequest.currentStage.toUpperCase()}</strong> stage.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {selectedRequest && canApprove(selectedRequest) ? (
              <>
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={actionLoading}>Cancel</Button>
                <Button variant="destructive" onClick={handleReject} disabled={actionLoading}>
                  {actionLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Rejecting…</> : "Reject"}
                </Button>
                {/* CHANGED: emoji removed from button */}
                <Button onClick={handleApprove} disabled={actionLoading}
                  className="bg-purple-700 hover:bg-purple-800">
                  {actionLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Approving…</> : "Final Approve"}
                </Button>
              </>
            ) : (
              <Button onClick={() => setDialogOpen(false)}>Close</Button>
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

const DRRequestsTable = ({ requests, canApprove, onView }: {
  requests: BudgetRequest[]; canApprove: (r: BudgetRequest) => boolean; onView: (r: BudgetRequest) => void;
}) => (
  <div className="overflow-x-auto rounded-lg border border-slate-200">
    <Table>
      <TableHeader>
        <TableRow className="bg-slate-50">
          {["Date", "GP Number", "PI Name", "Purpose", "Amount", "DA Remarks", "AR Remarks", ""].map(h => (
            <TableHead key={h} className="text-[11px] font-semibold text-slate-600 py-2.5 px-3">{h}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map(r => (
          <TableRow key={r.id} className={`border-b border-slate-100 hover:bg-slate-50/50 ${canApprove(r) ? "bg-purple-50/40" : ""}`}>
            <TableCell className="text-xs px-3 text-slate-500">{formatDate(r.createdAt)}</TableCell>
            <TableCell className="text-xs font-semibold px-3">{r.gpNumber}</TableCell>
            <TableCell className="text-xs px-3">{r.piName}</TableCell>
            <TableCell className="text-xs px-3 max-w-[120px] truncate">{r.purpose}</TableCell>
            <TableCell className="text-xs px-3 font-medium">{formatAmount(r.amount)}</TableCell>
            <TableCell className="text-xs px-3 text-slate-500 max-w-[100px] truncate italic">{r.daRemarks || "—"}</TableCell>
            <TableCell className="text-xs px-3 text-slate-500 max-w-[100px] truncate italic">{r.arRemarks || "—"}</TableCell>
            <TableCell className="px-3">
              <Button size="sm"
                variant={canApprove(r) ? "default" : "outline"}
                className={`h-7 text-xs px-3 ${canApprove(r) ? "bg-purple-700 hover:bg-purple-800" : ""}`}
                onClick={() => onView(r)}>
                {canApprove(r) ? "Final Review" : "View"}
              </Button>
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
              {/* CHANGED: emoji removed from badges */}
              {r.status === "approved"
                ? <Badge className="bg-emerald-100 text-emerald-800 text-xs">Approved</Badge>
                : <Badge variant="destructive" className="text-xs">Rejected</Badge>}
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

export default DRDashboard;