// pages/approvals/DADashboard.tsx
// ✅ Now shows FULL project details via RequestFullDetail (MEITY format) in dialogs

import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { RequestFullDetail, RequestDetailData } from "@/components/RequestViewDetail";
import { useState, useEffect } from "react";
import {
  Clock, FileText, History, Loader2, Lock, ClipboardCheck, Search,
  PenLine, X as XIcon, CheckCircle2, CornerUpLeft,
} from "lucide-react";
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
}


interface Project {
  id: string;
  gpNumber: string;
  projectName: string;
  piName: string;
  piEmail: string;
  department: string;
  projectStartDate: string;
  projectEndDate: string;
  totalSanctionedAmount: number;
  totalReleasedAmount: number;
  amountBookedByPI: number;
  actualExpenditure: number;
  bankDetails?: string;
  status: string;
}

const API = import.meta.env.VITE_API_URL;
const fmtINR  = (n: number) => parseFloat(String(n || 0)).toLocaleString("en-IN");
const fmtDate = (d: string) => d
  ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
  : "—";

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
  totalSanctionedAmount: r.totalSanctionedAmount,
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

const StageBadge = ({ r }: { r: BudgetRequest }) => {
  if (r.status === "sent_back_to_da")
    return <Badge className="bg-orange-50 text-orange-700 border border-orange-200 text-xs font-medium flex items-center gap-1"><CornerUpLeft className="h-3 w-3" />Returned by AR</Badge>;
  if (r.currentStage === "da" && r.status === "pending")
    return <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium">At DA</Badge>;
  if (r.currentStage === "ar")
    return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs">At AR</Badge>;
  if (r.currentStage === "dr")
    return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">At DR</Badge>;
  if (r.status === "approved")
    return <Badge className="bg-slate-100 text-slate-700 border border-slate-300 text-xs font-medium">Processed</Badge>;
  return <Badge variant="secondary" className="text-xs">{r.status}</Badge>;
};

const DADashboard = () => {
  const [activeWidget, setActiveWidget] = useState<"approve" | "expenditure">("approve");

  const [allRequests,   setAllRequests]   = useState<BudgetRequest[]>([]);
  const [loadingReq,    setLoadingReq]    = useState(true);
  const [selectedReq,   setSelectedReq]   = useState<BudgetRequest | null>(null);
  const [dialogOpen,    setDialogOpen]    = useState(false);
  const [remarks,       setRemarks]       = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [projects,        setProjects]        = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  const [searchTerm,  setSearchTerm]  = useState("");
  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [expInput,    setExpInput]    = useState("");
  const [savingExp,   setSavingExp]   = useState(false);
  const [reqSearch,   setReqSearch]   = useState("");

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
        r.invoiceNumber?.toLowerCase().includes(q) ||
        r.headName?.toLowerCase().includes(q);

      const dateStr = r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toLowerCase() : "";
      return matchText || dateStr.includes(q);
    });
  };

  const myTurnRequests    = allRequests.filter(r =>
    r.currentStage === "da" && (r.status === "pending" || r.status === "sent_back_to_da")
  );
  const forwardedRequests = allRequests.filter(r => r.currentStage === "ar" || r.currentStage === "dr");
  const completedRequests = allRequests.filter(r => r.status === "approved");
  const approvedRequests  = allRequests.filter(r => r.status === "approved");

  const filteredApprovedRequests = approvedRequests.filter(r =>
    !searchTerm ||
    r.gpNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.piName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.headName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.purpose?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = () => Promise.all([fetchRequests(), fetchProjects()]);

  const fetchRequests = async () => {
    try {
      setLoadingReq(true);
      const r = await fetch(`${API}/get-budget-requests.php?type=all`);
      const d = await r.json();
      setAllRequests(d.data || []);
    } catch { toast.error("Failed to load requests"); }
    finally { setLoadingReq(false); }
  };

  const fetchProjects = async () => {
    try {
      setLoadingProjects(true);
      const r = await fetch(`${API}/projects.php`);
      const d = await r.json();
      if (d.success) setProjects(d.data || []);
    } catch { toast.error("Failed to load projects"); }
    finally { setLoadingProjects(false); }
  };

  const canProcess = (r: BudgetRequest) =>
    r.currentStage === "da" && (r.status === "pending" || r.status === "sent_back_to_da");

  const handleProcess = async () => {
    if (!selectedReq) return;
    try {
      setActionLoading(true);
      const r = await fetch(`${API}/da-approve.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: selectedReq.id, remarks, approvedBy: "DA Officer" }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.message);
      toast.success("Request processed and forwarded to AR");
      setDialogOpen(false); setSelectedReq(null); setRemarks(""); fetchAll();
    } catch (e: any) { toast.error("Failed: " + e.message); }
    finally { setActionLoading(false); }
  };

  const handleConfirm = async (req: BudgetRequest, valueOverride?: string) => {
    const value = valueOverride ?? expInput;
    if (value === "" && !req.actualExpenditure) return;
    const amount = value !== "" ? parseFloat(value) : req.actualExpenditure!;
    try {
      setSavingExp(true);
      const r = await fetch(`${API}/update-actual-expenditure.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: req.id, projectId: req.projectId, actualExpenditure: amount }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.message);
      toast.success("Entry confirmed and locked");
      setEditingId(null); setExpInput(""); fetchAll();
    } catch (e: any) { toast.error("Failed: " + e.message); }
    finally { setSavingExp(false); }
  };

  const handleUnlockForEdit = (req: BudgetRequest) => {
    setEditingId(req.id);
    setExpInput(String(req.actualExpenditure || ""));
  };

  const processCount     = myTurnRequests.length;
  const expenditureCount = approvedRequests.length;

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
        <div className="space-y-6 p-6">

          <div className="bg-white/60 backdrop-blur-lg border border-slate-200/60 rounded-xl p-6 shadow-sm">
            <h1 className="text-2xl font-semibold text-slate-900">DA Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">
              Dealing Assistant · Process booking requests and record actual expenditure after full processing
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { key: "approve", title: "Process Requests", sub: `${processCount} request${processCount !== 1 ? "s" : ""} awaiting processing`, count: processCount, icon: <ClipboardCheck className="h-6 w-6" />, dark: false },
              { key: "expenditure", title: "Actual Expenditure", sub: `${expenditureCount} processed request${expenditureCount !== 1 ? "s" : ""} ready for expenditure entry`, count: expenditureCount, icon: <PenLine className="h-6 w-6" />, dark: true },
            ].map(w => (
              <button key={w.key} onClick={() => setActiveWidget(w.key as any)}
                className={`relative text-left p-6 rounded-xl border-2 transition-all shadow-sm hover:shadow-md ${
                  activeWidget === w.key
                    ? w.dark ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-800 text-slate-900"
                    : "bg-white/60 border-slate-200 text-slate-600 hover:border-slate-400"
                }`}>
                {w.count > 0 && (
                  <span className={`absolute top-3 right-3 text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center ${
                    activeWidget === w.key ? "bg-white text-slate-900" : "bg-red-500 text-white"
                  }`}>{w.count}</span>
                )}
                <div className={`mb-3 ${activeWidget === w.key && w.dark ? "text-white" : "text-slate-600"}`}>{w.icon}</div>
                <p className="text-sm font-semibold">{w.title}</p>
                <p className={`text-xs mt-0.5 ${activeWidget === w.key && w.dark ? "text-slate-300" : "text-slate-500"}`}>{w.sub}</p>
              </button>
            ))}
          </div>

          {activeWidget === "approve" && (
            <Card className="border border-slate-200/60 bg-white/70 backdrop-blur-lg shadow-lg">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-slate-600" /> Budget Booking Requests — Processing Queue
                  </CardTitle>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      <Input
                        placeholder="Search by GP, PI, Purpose, Head or Date..."
                        value={reqSearch}
                        onChange={e => setReqSearch(e.target.value)}
                        className="pl-8 h-8 w-64 text-xs border-slate-200"
                      />
                    </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs defaultValue="myturn">
                  <div className="px-4 pt-3">
                    <TabsList className="bg-slate-100/80">
                      <TabsTrigger value="myturn" className="text-xs">
                        At DA {processCount > 0 && <span className="ml-1.5 bg-blue-600 text-white text-[10px] rounded-full px-1.5 py-0.5">{processCount}</span>}
                      </TabsTrigger>
                      <TabsTrigger value="forwarded" className="text-xs">Forwarded ({forwardedRequests.length})</TabsTrigger>
                      <TabsTrigger value="history" className="text-xs">Processed ({completedRequests.length})</TabsTrigger>
                    </TabsList>
                  </div>
                  <TabsContent value="myturn" className="mt-0 pt-3">
                    {loadingReq ? <Spinner /> : filterReqs(myTurnRequests).length === 0
                      ? <EmptyState icon={<Clock className="h-10 w-10" />} message={reqSearch ? "No matching requests." : "No requests pending at DA stage"} />
                      : <ReqTable requests={filterReqs(myTurnRequests)} canProcess={canProcess} onView={r => { setSelectedReq(r); setDialogOpen(true); }} />}
                  </TabsContent>
                  <TabsContent value="forwarded" className="mt-0 pt-3">
                    {loadingReq ? <Spinner /> : filterReqs(forwardedRequests).length === 0
                      ? <EmptyState icon={<FileText className="h-10 w-10" />} message={reqSearch ? "No matching requests." : "No requests currently forwarded to AR or DR"} />
                      : <ReqTable requests={filterReqs(forwardedRequests)} canProcess={() => false} onView={r => { setSelectedReq(r); setDialogOpen(true); }} />}
                  </TabsContent>
                  <TabsContent value="history" className="mt-0 pt-3">
                    {loadingReq ? <Spinner /> : filterReqs(completedRequests).length === 0
                      ? <EmptyState icon={<History className="h-10 w-10" />} message={reqSearch ? "No matching requests." : "No processed requests yet"} />
                      : <ReqTable requests={filterReqs(completedRequests)} canProcess={() => false} onView={r => { setSelectedReq(r); setDialogOpen(true); }} />}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {activeWidget === "expenditure" && (
            <Card className="border border-slate-200/60 bg-white/70 backdrop-blur-lg shadow-lg overflow-hidden">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <PenLine className="h-5 w-5 text-slate-600" /> Actual Expenditure Entry
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      One row per <strong>processed booking request</strong> (DA → AR → DR all processed).
                      Enter the verified expenditure amount, then <strong>Confirm</strong> to lock. Use the <strong>Edit</strong> button to revise.
                    </CardDescription>
                  </div>
                  <div className="relative flex-shrink-0">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input placeholder="Search…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 h-8 w-48 text-xs border-slate-200" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loadingReq || loadingProjects ? <Spinner /> : filteredApprovedRequests.length === 0 ? (
                  <EmptyState icon={<FileText className="h-10 w-10" />} message={approvedRequests.length === 0 ? "No fully processed requests yet." : "No requests match your search."} />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 border-b border-slate-200">
                          {["S.No", "Request No.", "GP Number", "Head", "Purpose", "Invoice No.", "PI Name", "Booked Amount (₹)", "Actual Expenditure (₹)", "Action", "Status"].map(h => (
                            <TableHead key={h} className="text-[10px] font-semibold text-slate-600 py-2.5 px-3 whitespace-nowrap">{h}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredApprovedRequests.map((req, i) => {
                          const booked    = parseFloat(String(req.amount || 0));
                          const actual    = parseFloat(String(req.actualExpenditure || 0));
                          const isEditing = editingId === req.id;
                          const isConfirmed = actual > 0 && !isEditing;
                          const isDone      = actual > 0;

                          return (
                            <TableRow key={req.id} className={`border-b border-slate-100 hover:bg-slate-50/50 ${isConfirmed ? "bg-emerald-50/30" : isDone ? "bg-blue-50/20" : ""}`}>
                              <TableCell className="text-xs px-3 text-slate-500">{i + 1}</TableCell>
                              <TableCell className="text-xs px-3 font-mono font-semibold text-slate-700">{(req as any).requestNumber || req.id.slice(-6)}</TableCell>
                              <TableCell className="text-xs font-semibold px-3">{req.gpNumber}</TableCell>
                              <TableCell className="text-xs px-3 max-w-[110px]">
                                <div className="truncate" title={req.headName}>{req.headName || "—"}</div>
                                {req.headType && <div className="text-[10px] text-slate-400">{req.headType}</div>}
                              </TableCell>
                              <TableCell className="text-xs px-3 max-w-[140px]"><span className="line-clamp-2" title={req.purpose}>{req.purpose || "—"}</span></TableCell>
                              <TableCell className="text-xs px-3 font-mono">{req.invoiceNumber || "—"}</TableCell>
                              <TableCell className="text-xs px-3">{req.piName}</TableCell>
                              <TableCell className="text-xs px-3 text-right font-semibold text-blue-700">₹{fmtINR(booked)}</TableCell>
                              <TableCell className="px-3">
                                {isEditing ? (
                                  <div className="flex items-center gap-1">
                                    <Input type="number" value={expInput} onChange={e => setExpInput(e.target.value)} placeholder={`Max ₹${fmtINR(booked)}`} className="h-7 w-32 text-xs border-purple-400" autoFocus max={booked} min={0} onKeyDown={e => e.key === "Escape" && (setEditingId(null), setExpInput(""))} />
                                    <Button size="sm" variant="ghost" className="h-7 px-2 text-slate-400 hover:text-slate-700" onClick={() => { setEditingId(null); setExpInput(""); }}><XIcon className="h-3 w-3" /></Button>
                                  </div>
                                ) : isConfirmed ? (
                                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 text-xs font-semibold"><Lock className="h-3 w-3" />₹{fmtINR(actual)}</div>
                                ) : isDone ? (
                                  <button onClick={() => { setEditingId(req.id); setExpInput(String(actual)); }} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-100 text-purple-800 text-xs font-semibold hover:bg-purple-200 transition-colors"><PenLine className="h-3 w-3" />₹{fmtINR(actual)}</button>
                                ) : (
                                  <button onClick={() => { setEditingId(req.id); setExpInput(""); }} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-100 text-amber-700 text-xs font-medium hover:bg-amber-200 border border-dashed border-amber-300"><PenLine className="h-3 w-3" />Click to enter</button>
                                )}
                              </TableCell>
                              <TableCell className="px-3 whitespace-nowrap">
                                {isConfirmed ? (
                                  <button onClick={() => handleUnlockForEdit(req)} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200 border border-slate-300 transition-colors"><PenLine className="h-3 w-3" /> Edit</button>
                                ) : isEditing ? (
                                  <button onClick={() => handleConfirm(req, expInput)} disabled={savingExp || expInput === ""} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm">
                                    {savingExp ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />} Confirm
                                  </button>
                                ) : isDone ? (
                                  <button onClick={() => handleConfirm(req)} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-sm"><CheckCircle2 className="h-3 w-3" /> Confirm</button>
                                ) : (
                                  <span className="text-[10px] text-slate-400">—</span>
                                )}
                              </TableCell>
                              <TableCell className="px-3">
                                {isConfirmed ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-700 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-full"><CheckCircle2 className="h-3 w-3" /> Confirmed</span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Pending Entry</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {filteredApprovedRequests.length > 0 && (
                  <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      Showing <span className="font-semibold">{filteredApprovedRequests.length}</span> processed requests &nbsp;·&nbsp;
                      <span className="text-slate-700 font-semibold">{filteredApprovedRequests.filter(r => (r.actualExpenditure ?? 0) > 0).length} confirmed</span> &nbsp;·&nbsp;
                      <span className="text-slate-500 font-semibold">{filteredApprovedRequests.filter(r => !(r.actualExpenditure ?? 0)).length} pending entry</span>
                    </p>
                    <p className="text-xs text-slate-400">Total actual entered: ₹{fmtINR(filteredApprovedRequests.reduce((s, r) => s + parseFloat(String(r.actualExpenditure || 0)), 0))}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ✅ Review Dialog — full MEITY details */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedReq && canProcess(selectedReq) ? "Review & Process Request" : "Request Details"}</DialogTitle>
            <DialogDescription>
              {selectedReq && canProcess(selectedReq)
                ? selectedReq.status === "sent_back_to_da"
                  ? "This request was returned by AR — review AR's remarks and re-process"
                  : "At DA stage — you may process this request"
                : "View only — request is not at DA stage"}
            </DialogDescription>
          </DialogHeader>

          {selectedReq && (
            <div className="space-y-5">
              {/* Returned banner */}
              {selectedReq.status === "sent_back_to_da" && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl flex gap-3">
                  <CornerUpLeft className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-orange-900">Returned by AR for Re-processing</p>
                    {selectedReq.arRemarks && (
                      <p className="text-xs text-orange-700 mt-1">AR remarks: <span className="italic">{selectedReq.arRemarks}</span></p>
                    )}
                  </div>
                </div>
              )}

              {/* ✅ Full MEITY-format details — DA is read-only for points 7 & 8 */}
              <RequestFullDetail
                request={toDetailData(selectedReq)}
                viewerStage="da"
                onFieldSaved={(updates) => {
                  setSelectedReq(prev => prev ? { ...prev, ...updates } : prev);
                }}
              />

              {canProcess(selectedReq) && (
                <div className="space-y-1.5">
                  <Label className="text-sm">Remarks (optional — visible to AR & DR)</Label>
                  <Textarea placeholder="Comments for next authority…" value={remarks} onChange={e => setRemarks(e.target.value)} rows={3} />
                </div>
              )}

              {!canProcess(selectedReq) && selectedReq.status !== "approved" && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
                  <Lock className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900">Request Not at DA Stage</p>
                    <p className="text-xs text-amber-700 mt-0.5">Currently pending at <strong>{selectedReq.currentStage?.toUpperCase()}</strong> stage. No action required from DA at this time.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {selectedReq && canProcess(selectedReq) ? (
              <>
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={actionLoading}>Cancel</Button>
                <Button onClick={handleProcess} disabled={actionLoading} className="bg-slate-800 hover:bg-slate-900">
                  {actionLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing…</> : "Process & Forward to AR ➡"}
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
  <div className="flex flex-col items-center justify-center py-14 px-6 text-center text-slate-400">
    <div className="mb-3 opacity-30">{icon}</div>
    <p className="text-sm max-w-md">{message}</p>
  </div>
);

const Spinner = () => (
  <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
);

const ReqTable = ({ requests, canProcess, onView }: {
  requests: BudgetRequest[];
  canProcess: (r: BudgetRequest) => boolean;
  onView: (r: BudgetRequest) => void;
}) => (
  <div className="overflow-x-auto mx-4 mb-4 rounded-lg border border-slate-200">
    <Table>
      <TableHeader>
        <TableRow className="bg-slate-50">
          {["Date", "GP Number", "PI Name", "Head", "Purpose", "Amount (₹)", "Latest Remark", "Stage", ""].map(h => (
            <TableHead key={h} className="text-[10px] font-semibold text-slate-600 py-2.5 px-3 whitespace-nowrap">{h}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map(r => (
          <TableRow key={r.id} className={`border-b border-slate-100 hover:bg-slate-50/50 ${r.status === "sent_back_to_da" ? "bg-orange-50/40" : canProcess(r) ? "bg-blue-50/30" : ""}`}>
            <TableCell className="text-xs px-3 text-slate-500 whitespace-nowrap">{new Date(r.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</TableCell>
            <TableCell className="text-xs font-semibold px-3">{r.gpNumber}</TableCell>
            <TableCell className="text-xs px-3">{r.piName}</TableCell>
            <TableCell className="text-xs px-3 max-w-[100px] truncate">{r.headName || "—"}</TableCell>
            <TableCell className="text-xs px-3 max-w-[130px] truncate">{r.purpose}</TableCell>
            <TableCell className="text-xs px-3 font-semibold text-right">{parseFloat(String(r.amount || 0)).toLocaleString("en-IN")}</TableCell>
            <TableCell className="text-xs px-3 max-w-[150px] truncate italic text-slate-500" title={r.latestRemark}>{r.latestRemark || "—"}</TableCell>
            <TableCell className="px-3"><StageBadge r={r} /></TableCell>
            <TableCell className="px-3">
              <Button size="sm" variant={canProcess(r) ? "default" : "outline"} className={`h-7 text-xs px-3 ${r.status === "sent_back_to_da" ? "bg-orange-600 hover:bg-orange-700 text-white" : canProcess(r) ? "bg-slate-800 hover:bg-slate-900" : ""}`} onClick={() => onView(r)}>
                {r.status === "sent_back_to_da" ? "Re-process" : canProcess(r) ? "Review & Process" : "View"}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

export default DADashboard;