// pages/approvals/DRCRCDashboard.tsx â€” Forward only, no reject, no query



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
import { Search, Clock, Loader2, Lock, ArrowRight, ArrowLeftRight, Eye, FileText, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";


const API = import.meta.env.VITE_API_URL || "https://ifms-backend-nitj.onrender.com/api";
interface BudgetRequest {
  id: string; gpNumber: string; projectTitle: string; piName: string; department: string;
  purpose: string; description: string; amount: number; projectType: string;
  invoiceNumber: string; fileNumber?: string; quotationFileName?: string;
  status: string; currentStage: string; createdAt: string;
  daRemarks?: string; arRemarks?: string; drRemarks?: string; drcOfficeRemarks?: string;
  drcRcRemarks?: string; drcRemarks?: string; approvalHistory?: any[];
  rejectedAtStage?: string; rejectedAtStageLabel?: string; rejectionRemarks?: string;
  rejectedBy?: string; rejectedAt?: string;
}

const fmt = (d: string) => !d ? "â€”" : new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const fmtA = (n: number) => `â‚¹${(n / 100000).toFixed(2)}L`;
const canAct = (r: BudgetRequest) => r.currentStage === "drc_rc" && (r.status === "drc_office_forwarded" || r.status === "sent_back_to_drc_rc");
const viewQ = (r: BudgetRequest) => window.open(`${API}/download-file.php?requestId=${r.id}&type=quotation`, "_blank");

const DRCRCDashboard = () => {
  const navigate = useNavigate();
  const [pending, setPending] = useState<BudgetRequest[]>([]);
  const [completed, setCompleted] = useState<BudgetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<BudgetRequest | null>(null);
  const [open, setOpen] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [actLoading, setActLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const r1 = await fetch(`${API}/get-requests-by-stage.php?stage=drc_rc&type=pending`);
      const d1 = await r1.json(); setPending(d1.data || []);
      const r2 = await fetch(`${API}/get-requests-by-stage.php?stage=drc_rc&type=completed`);
      const d2 = await r2.json(); setCompleted(d2.data || []);
    } catch { toast.error("Failed to load"); } finally { setLoading(false); }
  };

  const handleForward = async () => {
    if (!sel) return;
    try {
      setActLoading(true);
      const body = { requestId: sel.id, remarks, actionBy: "DRC R&C" };
      const res = await fetch(`${API}/drc-rc-forward.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.message);
      toast.success("Forwarded to DRC.");
      setOpen(false); setSel(null); setRemarks(""); await load();
    } catch (e: any) { toast.error(e.message); } finally { setActLoading(false); }
  };

  const filter = (list: BudgetRequest[]) => {
    const q = search.trim().toLowerCase();
    return !q ? list : list.filter(r =>
      r.gpNumber?.toLowerCase().includes(q) ||
      r.piName?.toLowerCase().includes(q) ||
      r.purpose?.toLowerCase().includes(q)
    );
  };

  const openReq = (r: BudgetRequest) => { setSel(r); setRemarks(""); setOpen(true); };

  const fromOffice = pending.filter(r => r.status === "drc_office_forwarded");
  const fromDrc = pending.filter(r => r.status === "sent_back_to_drc_rc");
  const forwarded = completed.filter(r => r.status === "drc_rc_forwarded");
  const approved = completed.filter(r => r.status === "approved");

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-slate-50 to-gray-50">
        <div className="space-y-6 p-6">

          <div className="bg-white/70 backdrop-blur-lg border border-teal-200/60 rounded-xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">DR (R&C) Dashboard</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Research & Consultancy &nbsp;
                <span className="text-slate-400 font-mono text-[11px]">
                  DA â†’ AR â†’ DR â†’ DRC Office â†’ <strong className="text-teal-600">DR (R&C)</strong> â†’ DRC â†’ Director
                </span>
              </p>
            </div>
            <Button onClick={load} variant="outline" size="sm">Refresh</Button>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "From DRC Office", value: fromOffice.length, color: "text-teal-600", icon: <Clock className="h-4 w-4 text-teal-500" />, sub: "Freshly forwarded" },
              { label: "Returned by DRC", value: fromDrc.length, color: "text-blue-600", icon: <ArrowLeftRight className="h-4 w-4 text-blue-500" />, sub: "DRC sent back" },
              { label: "Forwarded", value: forwarded.length, color: "text-indigo-600", icon: <ArrowRight className="h-4 w-4 text-indigo-500" />, sub: "Sent for DRC review" },
              { label: "Approved", value: approved.length, color: "text-emerald-600", icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />, sub: "Director approved" },
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
                  <CardDescription className="mt-0.5">Approved requests show official MEITY format certificate.</CardDescription>
                </div>
                <div className="relative flex-shrink-0">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <Input placeholder="Searchâ€¦" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 w-56 text-xs border-slate-200" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-teal-400 mr-2" />
                  <p className="text-slate-500 text-sm">Loadingâ€¦</p>
                </div>
              ) : (
                <Tabs defaultValue="from-office">
                  <div className="px-4 pt-3">
                    <TabsList className="bg-teal-50">
                      <TabsTrigger value="from-office">From DRC Office ({fromOffice.length})</TabsTrigger>
                      <TabsTrigger value="from-drc">Returned by DRC ({fromDrc.length})</TabsTrigger>
                      <TabsTrigger value="forwarded">Forwarded ({forwarded.length})</TabsTrigger>
                      <TabsTrigger value="approved">
                        Approved ({approved.length})
                        {approved.length > 0 && <span className="ml-1 bg-emerald-500 text-white text-[9px] font-bold px-1 py-0.5 rounded">{approved.length}</span>}
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="from-office" className="px-4 pb-4 mt-3">
                    {filter(fromOffice).length === 0
                      ? <ES icon={<Clock className="h-10 w-10" />} msg="No fresh requests from DRC Office" />
                      : <PT requests={filter(fromOffice)} onView={openReq} rl="DRC Office Remarks" rf="drcOfficeRemarks" />}
                  </TabsContent>
                  <TabsContent value="from-drc" className="px-4 pb-4 mt-3">
                    {filter(fromDrc).length === 0
                      ? <ES icon={<ArrowLeftRight className="h-10 w-10" />} msg="No requests returned by DRC yet" />
                      : <PT requests={filter(fromDrc)} onView={openReq} rl="DRC Remarks" rf="drcRemarks" />}
                  </TabsContent>
                  <TabsContent value="forwarded" className="px-4 pb-4 mt-3">
                    {filter(forwarded).length === 0
                      ? <ES icon={<ArrowRight className="h-10 w-10" />} msg="No forwarded requests yet" />
                      : <HT requests={filter(forwarded)} onView={openReq} />}
                  </TabsContent>
                  <TabsContent value="approved" className="px-4 pb-4 mt-3">
                    {filter(approved).length === 0
                      ? <ES icon={<CheckCircle2 className="h-10 w-10" />} msg="No approved requests yet" />
                      : <AT requests={filter(approved)} onView={openReq} onCert={r => navigate(`/approval-certificate/${r.id}`)} />}
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {sel && canAct(sel) ? "Forward to DRC" : "Request Details"}
            </DialogTitle>
            <DialogDescription>
              {sel && canAct(sel) ? "This request goes to DRC for evaluation." : "View-only."}
            </DialogDescription>
          </DialogHeader>

          {sel && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={
                  sel.status === "approved" ? "bg-emerald-100 text-emerald-800"
                    : sel.status === "sent_back_to_drc_rc" ? "bg-blue-100 text-blue-800"
                      : "bg-teal-100 text-teal-800"
                }>
                  {sel.status === "approved"
                    ? "âœ… Approved by Director"
                    : sel.status === "sent_back_to_drc_rc"
                      ? "Returned by DRC"
                      : "Forwarded by DRC Office"}
                </Badge>
                {sel.fileNumber && (
                  <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                    ðŸ“ {sel.fileNumber}
                  </span>
                )}
                {sel.status === "approved" && (
                  <button
                    onClick={() => { setOpen(false); navigate(`/approval-certificate/${sel.id}`); }}
                    className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded"
                  >
                    <FileText className="h-3.5 w-3.5" /> View Approval Certificate
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-teal-50 rounded-xl border border-teal-200">
                {[
                  ["GP Number", sel.gpNumber], ["PI Name", sel.piName],
                  ["Department", sel.department], ["Amount", fmtA(sel.amount)],
                  ["Project Type", sel.projectType], ["Invoice", sel.invoiceNumber || "â€”"],
                ].map(([l, v]) => (
                  <div key={l}><p className="text-xs text-slate-500">{l}</p><p className="text-sm font-medium text-slate-800">{v}</p></div>
                ))}
              </div>

              <div className="space-y-2">
                {sel.daRemarks && <div className="p-3 bg-blue-50   border border-blue-200   rounded-lg"><p className="text-xs text-blue-600   font-medium mb-1">DA:</p>       <p className="text-sm">{sel.daRemarks}</p></div>}
                {sel.arRemarks && <div className="p-3 bg-sky-50    border border-sky-200    rounded-lg"><p className="text-xs text-sky-600    font-medium mb-1">AR:</p>       <p className="text-sm">{sel.arRemarks}</p></div>}
                {sel.drRemarks && <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg"><p className="text-xs text-purple-600 font-medium mb-1">DR:</p>       <p className="text-sm">{sel.drRemarks}</p></div>}
                {sel.drcOfficeRemarks && <div className="p-3 bg-cyan-50   border border-cyan-200   rounded-lg"><p className="text-xs text-cyan-600   font-medium mb-1">DRC Office:</p><p className="text-sm">{sel.drcOfficeRemarks}</p></div>}
                {sel.drcRemarks && <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg"><p className="text-xs text-indigo-600 font-medium mb-1">DRC:</p>      <p className="text-sm">{sel.drcRemarks}</p></div>}
              </div>

              <ApprovalTimeline
                approvalHistory={sel.approvalHistory}
                currentStage={sel.currentStage}
                status={sel.status}
                piName={sel.piName}
                createdAt={sel.createdAt}
                amount={sel.amount}
              />

              {canAct(sel) && (
                <div className="space-y-1.5">
                  <Label className="text-sm">Remarks (Optional)</Label>
                  <Textarea
                    placeholder="Forwarding notesâ€¦"
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    rows={3}
                    className="border-teal-200 focus:border-teal-400"
                  />
                </div>
              )}
              {!canAct(sel) && sel.status !== "approved" && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
                  <Lock className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-800">View only.</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={actLoading}>Cancel</Button>
            {sel && canAct(sel) && (
              <Button onClick={handleForward} disabled={actLoading} className="bg-teal-600 hover:bg-teal-700">
                {actLoading
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Forwardingâ€¦</>
                  : "Forward to DRC âž¡"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

// â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ES = ({ icon, msg }: { icon: React.ReactNode; msg: string }) => (
  <div className="flex flex-col items-center justify-center py-14 text-slate-400">
    <div className="mb-3 opacity-30">{icon}</div><p className="text-sm">{msg}</p>
  </div>
);

const PT = ({ requests, onView, rl, rf }: {
  requests: BudgetRequest[];
  onView: (r: BudgetRequest) => void;
  rl: string;
  rf: keyof BudgetRequest;
}) => (
  <div className="overflow-x-auto rounded-lg border border-slate-200">
    <Table>
      <TableHeader>
        <TableRow className="bg-slate-50">
          {["Date", "GP No.", "PI Name", "Purpose", "Amount", rl, "Action"].map(h => (
            <TableHead key={h} className="text-[11px] font-semibold text-slate-600 py-2.5 px-3">{h}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map(r => (
          <TableRow key={r.id} className={`border-b border-slate-100 hover:bg-slate-50/50 ${canAct(r) ? "bg-teal-50/40" : ""}`}>
            <TableCell className="text-xs px-3 text-slate-500">{new Date(r.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</TableCell>
            <TableCell className="text-xs font-semibold px-3">{r.gpNumber}</TableCell>
            <TableCell className="text-xs px-3">{r.piName}</TableCell>
            <TableCell className="text-xs px-3 max-w-[110px] truncate">{r.purpose}</TableCell>
            <TableCell className="text-xs px-3 font-medium text-teal-700">{fmtA(r.amount)}</TableCell>
            <TableCell className="text-xs px-3 text-slate-500 max-w-[100px] truncate italic">{(r[rf] as string) || "â€”"}</TableCell>
            <TableCell className="px-3">
              <Button size="sm" className="h-7 text-xs px-2 bg-teal-600 hover:bg-teal-700" onClick={() => onView(r)}>
                Forward to DRC
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

const HT = ({ requests, onView }: { requests: BudgetRequest[]; onView: (r: BudgetRequest) => void }) => (
  <div className="overflow-x-auto rounded-lg border border-slate-200">
    <Table>
      <TableHeader>
        <TableRow className="bg-slate-50">
          {["Date", "GP No.", "PI Name", "Amount", "Status", ""].map(h => (
            <TableHead key={h} className="text-xs font-semibold text-slate-600 py-2.5 px-3">{h}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map(r => (
          <TableRow key={r.id} className="border-b border-slate-100 hover:bg-slate-50/50">
            <TableCell className="text-xs px-3 text-slate-500">{new Date(r.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</TableCell>
            <TableCell className="text-xs font-semibold px-3">{r.gpNumber}</TableCell>
            <TableCell className="text-xs px-3">{r.piName}</TableCell>
            <TableCell className="text-xs px-3">{fmtA(r.amount)}</TableCell>
            <TableCell className="px-3"><Badge className="bg-teal-100 text-teal-800 text-xs">Forwarded to DRC</Badge></TableCell>
            <TableCell className="px-3"><Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onView(r)}>View</Button></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

const AT = ({ requests, onView, onCert }: {
  requests: BudgetRequest[];
  onView: (r: BudgetRequest) => void;
  onCert: (r: BudgetRequest) => void;
}) => (
  <div className="overflow-x-auto rounded-lg border border-emerald-200">
    <Table>
      <TableHeader>
        <TableRow className="bg-emerald-50">
          {["Date", "GP / File No.", "PI Name", "Amount", "Status", "Certificate", ""].map(h => (
            <TableHead key={h} className="text-[11px] font-semibold text-emerald-700 py-2.5 px-3">{h}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map(r => (
          <TableRow key={r.id} className="border-b border-emerald-100 hover:bg-emerald-50/40 bg-emerald-50/10">
            <TableCell className="text-xs px-3 text-slate-500 whitespace-nowrap">{new Date(r.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</TableCell>
            <TableCell className="px-3">
              <p className="text-xs font-semibold text-slate-800">{r.gpNumber}</p>
              {r.fileNumber
                ? <p className="text-[11px] font-mono font-bold text-blue-700 mt-0.5">{r.fileNumber}</p>
                : <p className="text-[11px] text-slate-400 italic mt-0.5">No file no.</p>}
            </TableCell>
            <TableCell className="text-xs px-3">{r.piName}</TableCell>
            <TableCell className="text-xs px-3 font-semibold text-emerald-700">{fmtA(r.amount)}</TableCell>
            <TableCell className="px-3"><Badge className="bg-emerald-100 text-emerald-800 text-xs font-semibold">âœ… Approved</Badge></TableCell>
            <TableCell className="px-3">
              <button
                onClick={() => onCert(r)}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-2.5 py-1.5 rounded transition-colors whitespace-nowrap"
                title="View MEITY approval certificate"
              >
                <FileText className="h-3.5 w-3.5" /> View Certificate
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

export default DRCRCDashboard;
