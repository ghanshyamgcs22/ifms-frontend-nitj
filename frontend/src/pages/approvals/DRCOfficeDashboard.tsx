// pages/approvals/DRCOfficeDashboard.tsx
// DRC Office â€” receives >â‚¹25k requests forwarded by DR
// ACTIONS: Forward to DRC (R&C) only â€” no reject, no query

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
import { Search, Clock, Loader2, Lock, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface BudgetRequest {
  id: string; gpNumber: string; projectTitle: string; piName: string; department: string;
  purpose: string; description: string; amount: number; projectType: string;
  invoiceNumber: string; status: string; currentStage: string; createdAt: string;
  daRemarks?: string; arRemarks?: string; drRemarks?: string; drcOfficeRemarks?: string;
  approvalHistory?: any[];
}

const formatDate = (d: string) =>
  !d ? "â€”" : new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const formatAmount = (n: number) => `â‚¹${(n / 100000).toFixed(2)}L`;

const DRCOfficeDashboard = () => {
  const [pendingRequests,   setPendingRequests]   = useState<BudgetRequest[]>([]);
  const [completedRequests, setCompletedRequests] = useState<BudgetRequest[]>([]);
  const [loading,           setLoading]           = useState(true);
  const [selectedRequest,   setSelectedRequest]   = useState<BudgetRequest | null>(null);
  const [dialogOpen,        setDialogOpen]        = useState(false);
  const [remarks,           setRemarks]           = useState("");
  const [actionLoading,     setActionLoading]     = useState(false);
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

  const canAct = (r: BudgetRequest) =>
    r.currentStage === "drc_office" && r.status === "dr_approved";

  const handleForward = async () => {
    if (!selectedRequest) return;
    try {
      setActionLoading(true);
      const body = { requestId: selectedRequest.id, remarks, actionBy: "DRC Office" };
      const res  = await fetch(`${import.meta.env.VITE_API_URL}/drc-office-forward.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success("Forwarded to DRC (R&C).");
      setDialogOpen(false); setSelectedRequest(null); setRemarks("");
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

  const openRequest = (r: BudgetRequest) => {
    setSelectedRequest(r); setRemarks(""); setDialogOpen(true);
  };

  const forwarded = completedRequests.filter(r => r.status === "drc_office_forwarded");

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-slate-50 to-gray-50">
        <div className="space-y-6 p-6">

          <div className="bg-white/70 backdrop-blur-lg border border-cyan-200/60 rounded-xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">DRC Office Dashboard</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Handles requests <strong className="text-cyan-600">&gt; â‚¹25,000</strong> forwarded by DR &nbsp;
                <span className="text-slate-400 font-mono text-[11px]">
                  DA â†’ AR â†’ DR â†’ <strong className="text-cyan-600">DRC Office</strong> â†’ DRC (R&C) â†’ DRC â†’ Director
                </span>
              </p>
            </div>
            <Button onClick={fetchRequests} variant="outline" size="sm">Refresh</Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Pending Action",         value: pendingRequests.length, color: "text-cyan-600",    icon: <Clock      className="h-4 w-4 text-cyan-500"   />, sub: "DR-approved, awaiting DRC Office" },
              { label: "Forwarded to DRC (R&C)", value: forwarded.length,       color: "text-emerald-600", icon: <ArrowRight className="h-4 w-4 text-emerald-500"/>, sub: "Sent for R&C review" },
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
                  <CardDescription className="mt-0.5">Only <strong>DR-approved</strong> requests above â‚¹25,000 appear here.</CardDescription>
                </div>
                <div className="relative flex-shrink-0">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <Input placeholder="Search GP No., PI, purposeâ€¦" value={reqSearch}
                    onChange={e => setReqSearch(e.target.value)} className="pl-8 h-8 w-56 text-xs border-slate-200" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-cyan-400 mr-2" />
                  <p className="text-slate-500 text-sm">Loadingâ€¦</p>
                </div>
              ) : (
                <Tabs defaultValue="pending">
                  <div className="px-4 pt-3">
                    <TabsList className="bg-cyan-50">
                      <TabsTrigger value="pending">Pending ({pendingRequests.length})</TabsTrigger>
                      <TabsTrigger value="forwarded">Forwarded ({forwarded.length})</TabsTrigger>
                    </TabsList>
                  </div>
                  <TabsContent value="pending" className="px-4 pb-4 mt-3">
                    {filterReqs(pendingRequests).length === 0
                      ? <EmptyState icon={<Clock className="h-10 w-10" />} message={reqSearch ? "No matching requests." : "No requests pending at DRC Office"} />
                      : <PendingTable requests={filterReqs(pendingRequests)} canAct={canAct} onView={openRequest} />}
                  </TabsContent>
                  <TabsContent value="forwarded" className="px-4 pb-4 mt-3">
                    {filterReqs(forwarded).length === 0
                      ? <EmptyState icon={<ArrowRight className="h-10 w-10" />} message="No forwarded requests yet" />
                      : <HistoryTable requests={filterReqs(forwarded)} onView={openRequest} />}
                  </TabsContent>
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
              {selectedRequest && canAct(selectedRequest) ? "Forward to DRC (R&C)" : "Request Details"}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && canAct(selectedRequest)
                ? "This request will be sent to DRC (R&C) for further evaluation."
                : "View-only mode"}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4 p-4 bg-cyan-50 rounded-xl border border-cyan-200">
                {[
                  ["GP Number", selectedRequest.gpNumber], ["PI Name", selectedRequest.piName],
                  ["Department", selectedRequest.department], ["Amount", formatAmount(selectedRequest.amount)],
                  ["Project Type", selectedRequest.projectType], ["Invoice No.", selectedRequest.invoiceNumber || "â€”"],
                ].map(([label, val]) => (
                  <div key={label}>
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="text-sm font-medium text-slate-800">{val}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                {selectedRequest.daRemarks && <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg"><p className="text-xs text-blue-600 font-medium mb-1">DA Remarks:</p><p className="text-sm text-slate-700">{selectedRequest.daRemarks}</p></div>}
                {selectedRequest.arRemarks && <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg"><p className="text-xs text-indigo-600 font-medium mb-1">AR Remarks:</p><p className="text-sm text-slate-700">{selectedRequest.arRemarks}</p></div>}
                {selectedRequest.drRemarks && <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg"><p className="text-xs text-purple-600 font-medium mb-1">DR Remarks:</p><p className="text-sm text-slate-700">{selectedRequest.drRemarks}</p></div>}
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

              {canAct(selectedRequest) && (
                <div className="space-y-1.5">
                  <Label className="text-sm">Remarks (Optional)</Label>
                  <Textarea
                    placeholder="Forwarding notes (optional)â€¦"
                    value={remarks} onChange={e => setRemarks(e.target.value)} rows={3} className="border-cyan-200 focus:border-cyan-400"
                  />
                </div>
              )}
              {!canAct(selectedRequest) && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
                  <Lock className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-800">Currently at <strong>{selectedRequest.currentStage.toUpperCase()}</strong> stage. View only.</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={actionLoading}>Cancel</Button>
            {selectedRequest && canAct(selectedRequest) && (
              <Button onClick={handleForward} disabled={actionLoading} className="bg-cyan-600 hover:bg-cyan-700">
                {actionLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Forwardingâ€¦</> : "Forward to DRC (R&C) âž¡"}
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
  requests: BudgetRequest[]; canAct: (r: BudgetRequest) => boolean;
  onView: (r: BudgetRequest) => void;
}) => (
  <div className="overflow-x-auto rounded-lg border border-slate-200">
    <Table>
      <TableHeader>
        <TableRow className="bg-slate-50">
          {["Date", "GP Number", "PI Name", "Purpose", "Amount", "DR Remarks", "Action"].map(h => (
            <TableHead key={h} className="text-[11px] font-semibold text-slate-600 py-2.5 px-3">{h}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map(r => (
          <TableRow key={r.id} className={`border-b border-slate-100 hover:bg-slate-50/50 ${canAct(r) ? "bg-cyan-50/40" : ""}`}>
            <TableCell className="text-xs px-3 text-slate-500">{formatDate(r.createdAt)}</TableCell>
            <TableCell className="text-xs font-semibold px-3">{r.gpNumber}</TableCell>
            <TableCell className="text-xs px-3">{r.piName}</TableCell>
            <TableCell className="text-xs px-3 max-w-[120px] truncate">{r.purpose}</TableCell>
            <TableCell className="text-xs px-3 font-medium text-cyan-700">{formatAmount(r.amount)}</TableCell>
            <TableCell className="text-xs px-3 text-slate-500 max-w-[100px] truncate italic">{r.drRemarks || "â€”"}</TableCell>
            <TableCell className="px-3">
              {canAct(r) ? (
                <Button size="sm" className="h-7 text-xs px-2 bg-cyan-600 hover:bg-cyan-700" onClick={() => onView(r)}>
                  Forward to DRC (R&C)
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="h-7 text-xs px-3" onClick={() => onView(r)}>View</Button>
              )}
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
              <Badge className="bg-cyan-100 text-cyan-800 text-xs">Forwarded to DRC (R&C)</Badge>
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

export default DRCOfficeDashboard;
