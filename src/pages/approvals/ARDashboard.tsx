// pages/approvals/ARDashboard.tsx
// AR = Accounts Representative — SECOND stage in the approval chain
// CHANGED: "approve/approved" → "recommend/recommended" throughout

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
  Clock, CheckCircle, FileText, History, Loader2, Lock, ChevronRight,
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
  approvalHistory?: any[];
}

const formatDate = (d: string) =>
  !d ? "—" : new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const formatAmount = (n: number) => `₹${(n / 100000).toFixed(2)}L`;

const ARDashboard = () => {
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
      const r1 = await fetch("http://localhost:8000/api/get-requests-by-stage.php?stage=ar&type=pending");
      const d1 = await r1.json();
      setMyTurnRequests(d1.data || []);

      const r2 = await fetch("http://localhost:8000/api/get-requests-by-stage.php?stage=all&type=completed");
      const d2 = await r2.json();
      setCompletedRequests(d2.data || []);
    } catch { toast.error("Failed to load requests"); }
    finally   { setLoading(false); }
  };

  const canRecommend = (r: BudgetRequest) =>
    r.currentStage === "ar" && r.status === "da_approved";

  // CHANGED: handleApprove → handleRecommend
  const handleRecommend = async () => {
    if (!selectedRequest || !canRecommend(selectedRequest)) return;
    try {
      setActionLoading(true);
      const res = await fetch("http://localhost:8000/api/ar-approve.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: selectedRequest.id, remarks, approvedBy: "AR Officer" }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success("Request recommended ✅ Forwarded to DR");
      setDialogOpen(false); setSelectedRequest(null); setRemarks("");
      await fetchRequests();
    } catch (e: any) { toast.error(e.message || "Failed to recommend"); }
    finally  { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!selectedRequest || !canRecommend(selectedRequest)) return;
    if (!remarks.trim()) { toast.error("Please enter remarks for rejection"); return; }
    try {
      setActionLoading(true);
      const res = await fetch("http://localhost:8000/api/reject-request.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: selectedRequest.id, stage: "ar", remarks, rejectedBy: "AR Officer" }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.error("Request rejected");
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

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-slate-50 to-gray-50">
        <div className="space-y-6 p-6">

          {/* Header */}
          <div className="bg-white/70 backdrop-blur-lg border border-indigo-200/60 rounded-xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">AR Dashboard</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Accounts Representative · Second stage &nbsp;
                <span className="text-slate-400 font-mono">DA → <strong className="text-indigo-600">AR</strong> → DR</span>
              </p>
            </div>
            <Button onClick={fetchRequests} variant="outline" size="sm">Refresh</Button>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                // CHANGED: "Your Turn" → "At AR"
                label: "At AR",
                value: myTurnRequests.length,
                color: "text-indigo-600",
                icon: <Clock className="h-4 w-4 text-indigo-500" />,
                // CHANGED: sub label
                sub: "DA-processed, awaiting AR recommendation",
              },
              {
                // CHANGED: "Approved" → "Recommended"
                label: "Recommended",
                value: completedRequests.filter(r => r.status === "approved").length,
                color: "text-emerald-600",
                icon: <CheckCircle className="h-4 w-4 text-emerald-500" />,
                sub: "Fully recommended & forwarded",
              },
              {
                label: "Rejected",
                value: completedRequests.filter(r => r.status === "rejected").length,
                color: "text-rose-600",
                icon: <ChevronRight className="h-4 w-4 text-rose-500" />,
                sub: "Rejected at any stage",
              },
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
                  <CardDescription className="mt-0.5">Only <strong>DA-processed</strong> requests can be recommended here.</CardDescription>
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
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-400 mr-2" />
                  <p className="text-slate-500 text-sm">Loading…</p>
                </div>
              ) : (
                <Tabs defaultValue="myturn">
                  <div className="px-4 pt-3">
                    <TabsList className="bg-indigo-50">
                      {/* CHANGED: "My Turn" → "At AR" */}
                      <TabsTrigger value="myturn">At AR ({myTurnRequests.length})</TabsTrigger>
                      {/* CHANGED: "History" → "Processed" */}
                      <TabsTrigger value="history">Processed ({completedRequests.length})</TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="myturn" className="px-4 pb-4 mt-3">
                    {filterReqs(myTurnRequests).length === 0 ? (
                      <EmptyState icon={<Clock className="h-10 w-10" />} message={reqSearch ? "No matching requests." : "No requests pending AR recommendation"} />
                    ) : (
                      <RequestsTable requests={filterReqs(myTurnRequests)} canRecommend={canRecommend} onView={openRequest} stageColor="indigo" />
                    )}
                  </TabsContent>

                  <TabsContent value="history" className="px-4 pb-4 mt-3">
                    {filterReqs(completedRequests).length === 0 ? (
                      <EmptyState icon={<History className="h-10 w-10" />} message={reqSearch ? "No matching requests." : "No processed requests yet"} />
                    ) : (
                      <HistoryTable requests={filterReqs(completedRequests)} onView={openRequest} />
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
            {/* CHANGED: dialog title */}
            <DialogTitle>
              {selectedRequest && canRecommend(selectedRequest) ? "Review & Recommend (AR Stage)" : "Request Details"}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && canRecommend(selectedRequest)
                // CHANGED: description
                ? "✅ This request was processed by DA — you may recommend or reject it"
                : "ℹ️ View only"}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4 p-4 bg-indigo-50 rounded-xl border border-indigo-200">
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

              {selectedRequest.daRemarks && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-600 font-medium mb-1">DA Remarks:</p>
                  <p className="text-sm text-slate-700">{selectedRequest.daRemarks}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-slate-500 mb-1">Purpose</p>
                <p className="text-sm">{selectedRequest.purpose}</p>
              </div>

              <ApprovalTimeline
                approvalHistory={selectedRequest.approvalHistory}
                currentStage={selectedRequest.currentStage}
                status={selectedRequest.status}
              />

              {canRecommend(selectedRequest) && (
                <div className="space-y-1.5">
                  {/* CHANGED: label */}
                  <Label className="text-sm">Your Remarks (Optional — visible to DR)</Label>
                  <Textarea
                    placeholder="Enter comments for DR to see…"
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    rows={3}
                    className="border-indigo-200 focus:border-indigo-400"
                  />
                </div>
              )}

              {!canRecommend(selectedRequest) &&
                selectedRequest.status !== "approved" &&
                selectedRequest.status !== "rejected" && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
                  <Lock className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                  {/* CHANGED: message */}
                  <p className="text-sm text-amber-800">
                    Currently at <strong>{selectedRequest.currentStage.toUpperCase()}</strong> stage. AR can only recommend DA-processed requests.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {selectedRequest && canRecommend(selectedRequest) ? (
              <>
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={actionLoading}>Cancel</Button>
                <Button variant="destructive" onClick={handleReject} disabled={actionLoading}>
                  {actionLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Rejecting…</> : "Reject"}
                </Button>
                {/* CHANGED: button label */}
                <Button onClick={handleRecommend} disabled={actionLoading}
                  className="bg-indigo-700 hover:bg-indigo-800">
                  {actionLoading
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Recommending…</>
                    : "Recommend & Forward to DR ➡"}
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

// CHANGED: prop canApprove → canRecommend, button label updated
const RequestsTable = ({ requests, canRecommend, onView, stageColor }: {
  requests: BudgetRequest[];
  canRecommend: (r: BudgetRequest) => boolean;
  onView: (r: BudgetRequest) => void;
  stageColor: string;
}) => (
  <div className="overflow-x-auto rounded-lg border border-slate-200">
    <Table>
      <TableHeader>
        <TableRow className="bg-slate-50">
          {["Date", "GP Number", "PI Name", "Purpose", "Amount", "DA Remarks", ""].map(h => (
            <TableHead key={h} className="text-[11px] font-semibold text-slate-600 py-2.5 px-3">{h}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map(r => (
          <TableRow key={r.id} className={`border-b border-slate-100 hover:bg-slate-50/50 ${canRecommend(r) ? "bg-indigo-50/40" : ""}`}>
            <TableCell className="text-xs px-3 text-slate-500">{formatDate(r.createdAt)}</TableCell>
            <TableCell className="text-xs font-semibold px-3">{r.gpNumber}</TableCell>
            <TableCell className="text-xs px-3">{r.piName}</TableCell>
            <TableCell className="text-xs px-3 max-w-[140px] truncate">{r.purpose}</TableCell>
            <TableCell className="text-xs px-3 font-medium">{formatAmount(r.amount)}</TableCell>
            <TableCell className="text-xs px-3 text-slate-500 max-w-[120px] truncate italic">
              {r.daRemarks || "—"}
            </TableCell>
            <TableCell className="px-3">
              <Button size="sm"
                variant={canRecommend(r) ? "default" : "outline"}
                className={`h-7 text-xs px-3 ${canRecommend(r) ? "bg-indigo-700 hover:bg-indigo-800" : ""}`}
                onClick={() => onView(r)}>
                {/* CHANGED: button label */}
                {canRecommend(r) ? "Review & Recommend" : "View"}
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
              {r.status === "approved"
                // CHANGED: badge labels
                ? <Badge className="bg-emerald-100 text-emerald-800 text-xs">✅ Recommended</Badge>
                : <Badge variant="destructive" className="text-xs">❌ Rejected</Badge>}
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

export default ARDashboard;