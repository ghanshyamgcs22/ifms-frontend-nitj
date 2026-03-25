// pages/approvals/DRCRCDashboard.tsx
// ✅ Full MEITY details via RequestFullDetail
// ✅ DR (R&C) can EDIT point 8 (mode of procurement) — point 7 is read-only
// ✅ DR (R&C) must select Approval Type (Admin / Admin cum Financial) before forwarding to DRC

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
import {
  Search, Clock, Loader2, Lock, ArrowRight, ArrowLeftRight,
  FileText, CheckCircle2, CornerUpLeft, BadgeCheck, AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

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
}

type ActionType = "forward" | "sendback" | null;
type ApprovalType = "admin" | "admin_cum_financial";

const fmt  = (d: string) => !d ? "--" : new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const fmtA = (n: number) => `Rs.${(n / 100000).toFixed(2)}L`;
const canAct = (r: BudgetRequest) =>
  r.currentStage === "drc_rc" && (r.status === "drc_office_forwarded" || r.status === "sent_back_to_drc_rc");

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

// ── Approval Type Selector ──────────────────────────────────────────────────
const ApprovalTypeSelector = ({
  value, onChange,
}: { value: ApprovalType | ""; onChange: (v: ApprovalType) => void }) => (
  <div className="space-y-2">
    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
      <BadgeCheck className="h-4 w-4 text-teal-600" />
      Approval Type <span className="text-red-500">*</span>
    </Label>
    <p className="text-xs text-slate-500">
      Select the type of approval to be recommended. This will be carried forward through DRC to the Director.
    </p>
    <div className="grid grid-cols-2 gap-3 mt-1">
      {[
        {
          val: "admin" as ApprovalType,
          title: "Admin Approval",
          desc: "For administrative sanction only — no financial release involved.",
        },
        {
          val: "admin_cum_financial" as ApprovalType,
          title: "Admin cum Financial Approval",
          desc: "Both administrative sanction and financial release — used for most purchase approvals.",
        },
      ].map(opt => (
        <button
          key={opt.val}
          type="button"
          onClick={() => onChange(opt.val)}
          className={`relative rounded-xl border-2 p-4 text-left transition-all duration-150 ${
            value === opt.val
              ? "border-teal-500 bg-teal-50 shadow-sm ring-2 ring-teal-200"
              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          {value === opt.val && (
            <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-teal-500 flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 6l3 3 5-5"/>
              </svg>
            </span>
          )}
          <p className="text-sm font-semibold text-slate-800">{opt.title}</p>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{opt.desc}</p>
        </button>
      ))}
    </div>
    {value && (
      <div className="mt-2 p-3 bg-teal-50 border border-teal-200 rounded-lg">
        <p className="text-xs text-teal-700 font-medium">Recommended approval type:</p>
        <p className="text-xs text-teal-900 italic mt-1">
          "DR (R&C) recommends <strong>{value === "admin" ? "Admin Approval" : "Admin cum Financial Approval"}</strong> for this request."
        </p>
      </div>
    )}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
const DRCRCDashboard = () => {
  const navigate = useNavigate();
  const [pending,      setPending]      = useState<BudgetRequest[]>([]);
  const [completed,    setCompleted]    = useState<BudgetRequest[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [sel,          setSel]          = useState<BudgetRequest | null>(null);
  const [open,         setOpen]         = useState(false);
  const [remarks,      setRemarks]      = useState("");
  const [actLoading,   setActLoading]   = useState(false);
  const [action,       setAction]       = useState<ActionType>(null);
  const [search,       setSearch]       = useState("");
  const [approvalType, setApprovalType] = useState<ApprovalType | "">("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const r1 = await fetch(`${API}/get-requests-by-stage.php?stage=drc_rc&type=pending`);
      const d1 = await r1.json(); setPending(d1.data || []);
      const r2 = await fetch(`${API}/get-requests-by-stage.php?stage=drc_rc&type=completed`);
      const d2 = await r2.json(); setCompleted(d2.data || []);
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  };

  const handleAction = async () => {
    if (!sel || !action) return;

    if (action === "forward" && !approvalType) {
      toast.error("Please select an approval type before forwarding to DRC."); return;
    }
    if (action === "sendback" && !remarks.trim()) {
      toast.error("Please enter remarks for send-back"); return;
    }

    try {
      setActLoading(true);
      let endpoint = "";
      const body: any = { requestId: sel.id, remarks, actionBy: "DR (R&C)" };

      if (action === "forward") {
        endpoint = `${API}/drc-rc-forward.php`;
        body.approvalType = approvalType;
      } else {
        endpoint = `${API}/sendback-request.php`;
        body.sendBackTo = "drc_office"; body.sentBackBy = "DR (R&C)";
      }

      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await res.json();
      if (!d.success) throw new Error(d.message);

      toast.success(
        action === "forward"
          ? `Forwarded to DRC (${approvalType === "admin" ? "Admin Approval" : "Admin cum Financial Approval"}).`
          : "Request sent back to DRC Office."
      );
      resetDialog();
      await load();
    } catch (e: any) { toast.error(e.message); }
    finally { setActLoading(false); }
  };

  const resetDialog = () => {
    setOpen(false); setSel(null); setRemarks(""); setAction(null); setApprovalType("");
  };

  const filter = (list: BudgetRequest[]) => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(r => {
      const approvalLabel = r.approvalType === "admin"
        ? "admin"
        : r.approvalType === "admin_cum_financial"
        ? "admin cum financial"
        : "";
      return (
        r.gpNumber?.toLowerCase().includes(q) ||
        r.piName?.toLowerCase().includes(q) ||
        r.purpose?.toLowerCase().includes(q) ||
        r.department?.toLowerCase().includes(q) ||
        r.fileNumber?.toLowerCase().includes(q) ||
        fmt(r.createdAt).toLowerCase().includes(q) ||
        approvalLabel.includes(q)
      );
    });
  };

  const openReq = (r: BudgetRequest, a?: ActionType) => {
    setSel(r); setRemarks(""); setAction(a || null);
    setApprovalType((r.approvalType as ApprovalType) || "");
    setOpen(true);
  };

  const fromOffice       = pending.filter(r => r.status === "drc_office_forwarded");
  const fromDrc          = pending.filter(r => r.status === "sent_back_to_drc_rc");
  const forwarded        = completed.filter(r => r.status === "drc_rc_forwarded");
  const sentBackToOffice = completed.filter(r => r.status === "sent_back_to_drc_office");
  const approved         = completed.filter(r => r.status === "approved");

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-slate-50 to-gray-50">
        <div className="space-y-6 p-6">

          <div className="bg-white/70 backdrop-blur-lg border border-teal-200/60 rounded-xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">DR (R&amp;C) Dashboard</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Research and Consultancy
                <span className="text-slate-400 font-mono text-[11px] ml-1">
                  DA → AR → DR → DRC Office → <strong className="text-teal-600">DR (R&amp;C)</strong> → DRC → Director
                </span>
              </p>
            </div>
            <Button onClick={load} variant="outline" size="sm">Refresh</Button>
          </div>

          <div className="grid grid-cols-5 gap-3">
            {[
              { label: "From DRC Office",         value: fromOffice.length,       color: "text-teal-600",    icon: <Clock          className="h-4 w-4 text-teal-500"   />, sub: "Freshly forwarded" },
              { label: "Returned by DRC",          value: fromDrc.length,          color: "text-blue-600",    icon: <ArrowLeftRight className="h-4 w-4 text-blue-500"   />, sub: "DRC sent back" },
              { label: "Forwarded to DRC",         value: forwarded.length,        color: "text-indigo-600",  icon: <ArrowRight     className="h-4 w-4 text-indigo-500" />, sub: "Sent for DRC review" },
              { label: "Sent Back to DRC Office",  value: sentBackToOffice.length, color: "text-orange-600",  icon: <CornerUpLeft   className="h-4 w-4 text-orange-500" />, sub: "Returned to DRC Office" },
              { label: "Approved",                 value: approved.length,         color: "text-emerald-600", icon: <CheckCircle2   className="h-4 w-4 text-emerald-500"/>, sub: "Director approved" },
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
                    DR (R&C) can edit <strong>Point 8 — Mode of Procurement</strong> and must select <strong>Approval Type</strong> before forwarding.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none"/>
                    <Input
                      placeholder="Search GP, file no., PI, purpose, date, approval type…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="pl-8 h-8 w-72 text-xs border-slate-200"
                    />
                  </div>
                  {search && (
                    <Button variant="ghost" size="sm" onClick={() => setSearch("")} className="h-8 text-[11px] text-slate-500 hover:text-red-500 px-2">
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-teal-400 mr-2"/>
                  <p className="text-slate-500 text-sm">Loading...</p>
                </div>
              ) : (
                <Tabs defaultValue="from-office">
                  <div className="px-4 pt-3">
                    <TabsList className="bg-teal-50">
                      <TabsTrigger value="from-office">From DRC Office ({filter(fromOffice).length})</TabsTrigger>
                      <TabsTrigger value="from-drc">Returned by DRC ({filter(fromDrc).length})</TabsTrigger>
                      <TabsTrigger value="forwarded">Forwarded ({filter(forwarded).length})</TabsTrigger>
                      <TabsTrigger value="sentback">Sent Back to DRC Office ({filter(sentBackToOffice).length})</TabsTrigger>
                      <TabsTrigger value="approved">
                        Approved ({filter(approved).length})
                        {filter(approved).length > 0 && <span className="ml-1 bg-emerald-500 text-white text-[9px] font-bold px-1 py-0.5 rounded">{filter(approved).length}</span>}
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="from-office" className="px-4 pb-4 mt-3">
                    {filter(fromOffice).length === 0
                      ? <ES icon={<Clock className="h-10 w-10"/>} msg="No matching requests"/>
                      : <PT requests={filter(fromOffice)} onView={openReq} rl="DRC Office Remarks" rf="drcOfficeRemarks"/>}
                  </TabsContent>
                  <TabsContent value="from-drc" className="px-4 pb-4 mt-3">
                    {filter(fromDrc).length === 0
                      ? <ES icon={<ArrowLeftRight className="h-10 w-10"/>} msg="No matching requests"/>
                      : <PT requests={filter(fromDrc)} onView={openReq} rl="DRC Remarks" rf="drcRemarks"/>}
                  </TabsContent>
                  <TabsContent value="forwarded" className="px-4 pb-4 mt-3">
                    {filter(forwarded).length === 0
                      ? <ES icon={<ArrowRight className="h-10 w-10"/>} msg="No matching requests"/>
                      : <HT requests={filter(forwarded)} onView={openReq}/>}
                  </TabsContent>
                  <TabsContent value="sentback" className="px-4 pb-4 mt-3">
                    {filter(sentBackToOffice).length === 0
                      ? <ES icon={<CornerUpLeft className="h-10 w-10"/>} msg="No matching requests"/>
                      : <SentBackTable requests={filter(sentBackToOffice)} onView={openReq}/>}
                  </TabsContent>
                  <TabsContent value="approved" className="px-4 pb-4 mt-3">
                    {filter(approved).length === 0
                      ? <ES icon={<CheckCircle2 className="h-10 w-10"/>} msg="No matching requests"/>
                      : <AT requests={filter(approved)} onView={openReq} onCert={r => navigate(`/approval-certificate/${r.id}`)}/>}
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={resetDialog}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {action === "forward"   ? "Forward to DRC"
              : action === "sendback"  ? "Send Back to DRC Office"
              : sel && canAct(sel)    ? "Review Request"
              : "Request Details"}
            </DialogTitle>
            <DialogDescription>
              {action === "forward"
                ? "Select the Approval Type, then confirm forwarding to DRC. You may edit Point 8 (Mode of Procurement) before forwarding."
                : action === "sendback"
                ? "Return to DRC Office for re-evaluation. Remarks are required."
                : sel && canAct(sel)
                ? "Edit Point 8 if needed, then select an action below."
                : "View-only."}
            </DialogDescription>
          </DialogHeader>

          {sel && (
            <div className="space-y-5">
              {/* Status badge row */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={
                  sel.status === "approved"              ? "bg-emerald-100 text-emerald-800"
                  : sel.status === "sent_back_to_drc_rc" ? "bg-blue-100 text-blue-800"
                  : "bg-teal-100 text-teal-800"
                }>
                  {sel.status === "approved"              ? "Approved by Director"
                  : sel.status === "sent_back_to_drc_rc"  ? "Returned by DRC"
                  : "Forwarded by DRC Office"}
                </Badge>
                {sel.fileNumber && (
                  <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">{sel.fileNumber}</span>
                )}
                {!action && sel.approvalType && (
                  <Badge className="bg-teal-50 text-teal-700 border border-teal-200">
                    <BadgeCheck className="h-3 w-3 mr-1"/>
                    {sel.approvalType === "admin" ? "Admin Approval" : "Admin cum Financial Approval"}
                  </Badge>
                )}
                {sel.status === "approved" && (
                  <button
                    onClick={() => { resetDialog(); navigate(`/approval-certificate/${sel.id}`); }}
                    className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded"
                  >
                    <FileText className="h-3.5 w-3.5"/> View Approval Certificate
                  </button>
                )}
              </div>

              {/* Full MEITY-format details — approvalHistory passed through for internal use */}
              <RequestFullDetail
                request={toDetailData(sel)}
                viewerStage="drc_rc"
                onFieldSaved={(updates) => {
                  setSel(prev => prev ? { ...prev, ...updates } : prev);
                }}
              />

              {/* Approval Type Selector — only when forwarding */}
              {action === "forward" && canAct(sel) && (
                <div className="p-4 bg-white border-2 border-teal-200 rounded-xl">
                  <ApprovalTypeSelector value={approvalType} onChange={setApprovalType}/>
                </div>
              )}

              {/* Warning if approval type not selected when forwarding */}
              {action === "forward" && !approvalType && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-300 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0"/>
                  <p className="text-xs text-amber-800">You must select an approval type before forwarding to DRC.</p>
                </div>
              )}

              {/* Inline action picker */}
              {!action && canAct(sel) && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <p className="text-xs font-semibold text-slate-600">Select an action</p>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" className="h-8 text-xs bg-teal-600 hover:bg-teal-700" onClick={() => setAction("forward")}>
                      <BadgeCheck className="h-3.5 w-3.5 mr-1"/>Forward to DRC
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs border-orange-400 text-orange-600 hover:bg-orange-50" onClick={() => setAction("sendback")}>
                      <CornerUpLeft className="h-3.5 w-3.5 mr-1"/> Send Back to DRC Office
                    </Button>
                  </div>
                </div>
              )}

              {/* Remarks */}
              {action && canAct(sel) && (
                <div className="space-y-1.5">
                  <Label className="text-sm">{action === "forward" ? "Remarks (Optional)" : "Remarks (Required)"}</Label>
                  <Textarea
                    placeholder={action === "forward" ? "Forwarding notes to DRC..." : "Reason for sending back to DRC Office..."}
                    value={remarks} onChange={e => setRemarks(e.target.value)} rows={3}
                    className={action === "forward" ? "border-teal-200 focus:border-teal-400" : "border-orange-200 focus:border-orange-400"}
                  />
                </div>
              )}

              {!canAct(sel) && sel.status !== "approved" && sel.status !== "sent_back_to_drc_office" && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
                  <Lock className="h-5 w-5 text-amber-600 mt-0.5 shrink-0"/>
                  <p className="text-sm text-amber-800">View only.</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={resetDialog} disabled={actLoading}>Cancel</Button>
            {sel && canAct(sel) && action && (
              <Button
                onClick={handleAction}
                disabled={actLoading || (action === "forward" && !approvalType)}
                className={action === "forward" ? "bg-teal-600 hover:bg-teal-700" : "bg-orange-500 hover:bg-orange-600"}
              >
                {actLoading
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Processing...</>
                  : action === "forward"
                    ? approvalType
                      ? <>Forward to DRC ({approvalType === "admin" ? "Admin" : "Admin cum Financial"}) →</>
                      : "Select Approval Type First"
                    : <><CornerUpLeft className="h-4 w-4 mr-1"/>Send Back to DRC Office</>}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────────

const ES = ({ icon, msg }: { icon: React.ReactNode; msg: string }) => (
  <div className="flex flex-col items-center justify-center py-14 text-slate-400">
    <div className="mb-3 opacity-30">{icon}</div><p className="text-sm">{msg}</p>
  </div>
);

const PT = ({ requests, onView, rl, rf }: {
  requests: BudgetRequest[];
  onView: (r: BudgetRequest, a?: ActionType) => void;
  rl: string;
  rf: keyof BudgetRequest;
}) => (
  <div className="overflow-x-auto rounded-lg border border-slate-200">
    <table className="w-full text-left">
      <thead>
        <tr className="bg-slate-50">
          {["Date", "GP No.", "PI Name", "Purpose", "Amount", "Latest Remark", "Actions"].map(h => (
            <th key={h} className="text-[11px] font-semibold text-slate-600 py-2.5 px-3">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {requests.map(r => (
          <tr key={r.id} className={`border-b border-slate-100 hover:bg-slate-50/50 ${canAct(r) ? "bg-teal-50/40" : ""}`}>
            <td className="text-xs px-3 py-2.5 text-slate-500">{fmt(r.createdAt)}</td>
            <td className="text-xs font-semibold px-3 py-2.5">{r.gpNumber}</td>
            <td className="text-xs px-3 py-2.5">{r.piName}</td>
            <td className="text-xs px-3 py-2.5 max-w-[110px] truncate">{r.purpose}</td>
            <td className="text-xs px-3 py-2.5 font-medium text-teal-700">{fmtA(r.amount)}</td>
            <td className="text-xs px-3 py-2.5 text-slate-500 max-w-[120px] truncate italic" title={r.latestRemark}>{r.latestRemark || "--"}</td>
            <td className="px-3 py-2.5">
              <div className="flex gap-1.5 flex-wrap items-center">
                <Button size="sm" className="h-7 text-xs px-2 bg-teal-600 hover:bg-teal-700" onClick={() => onView(r, "forward")}>
                  <BadgeCheck className="h-3 w-3 mr-1"/>Forward to DRC
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs px-2 border-orange-400 text-orange-600 hover:bg-orange-50" onClick={() => onView(r, "sendback")}>
                  <CornerUpLeft className="h-3 w-3 mr-1"/> Send Back
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const HT = ({ requests, onView }: { requests: BudgetRequest[]; onView: (r: BudgetRequest) => void }) => (
  <div className="overflow-x-auto rounded-lg border border-slate-200">
    <table className="w-full text-left">
      <thead>
        <tr className="bg-slate-50">
          {["Date", "GP No.", "PI Name", "Amount", "Latest Remark", "Approval Type", "Status", ""].map(h => (
            <th key={h} className="text-xs font-semibold text-slate-600 py-2.5 px-3">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {requests.map(r => (
          <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/50">
            <td className="text-xs px-3 py-2.5 text-slate-500">{fmt(r.createdAt)}</td>
            <td className="text-xs font-semibold px-3 py-2.5">{r.gpNumber}</td>
            <td className="text-xs px-3 py-2.5">{r.piName}</td>
            <td className="text-xs px-3 py-2.5">{fmtA(r.amount)}</td>
            <td className="text-xs px-3 py-2.5 text-slate-600 max-w-[150px] truncate italic" title={r.latestRemark}>{r.latestRemark || "--"}</td>
            <td className="px-3 py-2.5">
              {r.approvalType
                ? <Badge className={r.approvalType === "admin"
                    ? "bg-slate-100 text-slate-700 text-[10px]"
                    : "bg-teal-100 text-teal-700 text-[10px]"
                  }>
                    {r.approvalType === "admin" ? "Admin" : "Admin cum Financial"}
                  </Badge>
                : <span className="text-slate-400 text-xs italic">Not set</span>}
            </td>
            <td className="px-3 py-2.5">
              <Badge className="bg-teal-100 text-teal-800 text-xs">Forwarded to DRC</Badge>
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
          {["Date", "GP No.", "PI Name", "Amount", "Latest Remark", "Status", ""].map(h => (
            <th key={h} className="text-xs font-semibold text-orange-700 py-2.5 px-3">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {requests.map(r => (
          <tr key={r.id} className="border-b border-orange-100 hover:bg-orange-50/40">
            <td className="text-xs px-3 py-2.5 text-slate-500">{fmt(r.createdAt)}</td>
            <td className="text-xs font-semibold px-3 py-2.5">{r.gpNumber}</td>
            <td className="text-xs px-3 py-2.5">{r.piName}</td>
            <td className="text-xs px-3 py-2.5">{fmtA(r.amount)}</td>
            <td className="text-xs px-3 py-2.5 text-slate-600 max-w-[150px] truncate italic" title={r.latestRemark}>{r.latestRemark || "--"}</td>
            <td className="px-3 py-2.5"><Badge className="bg-orange-100 text-orange-800 text-xs">Sent Back to DRC Office</Badge></td>
            <td className="px-3 py-2.5"><Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onView(r)}>View</Button></td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const AT = ({ requests, onView, onCert }: {
  requests: BudgetRequest[];
  onView: (r: BudgetRequest) => void;
  onCert: (r: BudgetRequest) => void;
}) => (
  <div className="overflow-x-auto rounded-lg border border-emerald-200">
    <table className="w-full text-left">
      <thead>
        <tr className="bg-emerald-50">
          {["Date", "GP / File No.", "PI Name", "Amount", "Approval Type", "Status", "Certificate", ""].map(h => (
            <th key={h} className="text-[11px] font-semibold text-emerald-700 py-2.5 px-3">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {requests.map(r => (
          <tr key={r.id} className="border-b border-emerald-100 hover:bg-emerald-50/40 bg-emerald-50/10">
            <td className="text-xs px-3 py-2.5 text-slate-500 whitespace-nowrap">{fmt(r.createdAt)}</td>
            <td className="px-3 py-2.5">
              <p className="text-xs font-semibold text-slate-800">{r.gpNumber}</p>
              {r.fileNumber ? <p className="text-[11px] font-mono font-bold text-blue-700 mt-0.5">{r.fileNumber}</p> : <p className="text-[11px] text-slate-400 italic mt-0.5">No file no.</p>}
            </td>
            <td className="text-xs px-3 py-2.5">{r.piName}</td>
            <td className="text-xs px-3 py-2.5 font-semibold text-emerald-700">{fmtA(r.amount)}</td>
            <td className="px-3 py-2.5">
              {r.approvalType
                ? <Badge className={r.approvalType === "admin"
                    ? "bg-slate-100 text-slate-700 text-[10px]"
                    : "bg-teal-100 text-teal-700 text-[10px]"
                  }>
                    {r.approvalType === "admin" ? "Admin" : "Admin cum Financial"}
                  </Badge>
                : <span className="text-slate-400 text-xs italic">—</span>}
            </td>
            <td className="px-3 py-2.5"><Badge className="bg-emerald-100 text-emerald-800 text-xs font-semibold">Approved</Badge></td>
            <td className="px-3 py-2.5">
              <button onClick={() => onCert(r)} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-2.5 py-1.5 rounded transition-colors whitespace-nowrap">
                <FileText className="h-3.5 w-3.5"/> View Certificate
              </button>
            </td>
            <td className="px-3 py-2.5"><Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onView(r)}>Details</Button></td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default DRCRCDashboard;