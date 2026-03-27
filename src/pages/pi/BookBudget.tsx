import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import {
  Send, Loader2, AlertCircle, Upload, FileText,
  CheckCircle2, ChevronRight, BookOpen,
  ClipboardList, Paperclip,
} from "lucide-react";
import { toast } from "sonner";

/* ── Font loader ─────────────────────────────────────────────────────── */
const Fonts = () => {
  useEffect(() => {
    const el = document.createElement("link");
    el.rel  = "stylesheet";
    el.href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap";
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);
  return null;
};

/* ── Types ───────────────────────────────────────────────────────────── */
interface Head {
  id: string; headId: string; headName: string; headType: string;
  sanctionedAmount: number; releasedAmount: number;
  bookedAmount: number; availableBalance: number;
}
interface Project {
  id: string; gpNumber: string; projectName: string; modeOfProject: string;
  piName: string; piEmail: string; department: string;
  projectEndDate: string | null;
  totalSanctionedAmount: number; totalReleasedAmount: number;
  amountBookedByPI: number; availableBalance: number; actualExpenditure: number;
  status: string; heads: Head[];
}

const PI_EMAIL = "pi@ifms.edu";
const PI_NAME  = "Dr. John Smith";
const API      = import.meta.env.VITE_API_URL;

const fmtINR = (n: number) =>
  "₹" + parseFloat(String(n || 0)).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

/* ─────────────────────────────────────────────────────────────────────
   BALANCE HELPERS
   
   Rule (matches backend aggregation pipeline):
     available = released - booked
     "booked" = SUM(requestedAmount) WHERE status != 'rejected'
   
   This means:
     • A pending/in-stage request DEDUCTS from available immediately.
     • A rejected request ADDS BACK to available (removed from booked sum).
     • An approved request stays deducted permanently.
   
   The backend already returns live-computed bookedAmount from the
   aggregation in get-pi-projects.php, so we trust it directly.
──────────────────────────────────────────────────────────────────────── */

/** Project available = released − booked (non-rejected requests) */
const projectAvail = (p: Project): number =>
  Math.max(0, p.totalReleasedAmount - p.amountBookedByPI);

/** Head available = released − booked (non-rejected requests under this head) */
const headAvail = (h: Head): number =>
  Math.max(0, h.releasedAmount - h.bookedAmount);

/* ── Balance tile ────────────────────────────────────────────────────── */
const BalTile = ({ label, value, color }: { label: string; value: string; color: "blue" | "amber" | "emerald" }) => {
  const bar = { blue: "bg-blue-500", amber: "bg-amber-500", emerald: "bg-emerald-500" }[color];
  return (
    <div className="flex-1 rounded-xl bg-white border border-slate-200 overflow-hidden">
      <div className={`h-[3px] ${bar}`}/>
      <div className="px-3.5 py-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-[14px] font-bold text-slate-800 mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {value}
        </p>
      </div>
    </div>
  );
};

/* ── Field wrapper ───────────────────────────────────────────────────── */
const Field = ({
  label, required, hint, tag, children,
}: {
  label: string; required?: boolean; hint?: string;
  tag?: React.ReactNode; children: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <div className="flex items-center gap-2 flex-wrap">
      <label className="text-[13px] font-semibold text-slate-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {tag}
    </div>
    {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    {children}
  </div>
);

/* ── Read-only row ───────────────────────────────────────────────────── */
const InfoRow = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div>
    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">{label}</p>
    <p
      className="text-[13px] font-semibold text-slate-800 leading-snug"
      style={{ fontFamily: mono ? "'JetBrains Mono', monospace" : "'Plus Jakarta Sans', sans-serif" }}
    >
      {value || "—"}
    </p>
  </div>
);

/* ── Pill tag ────────────────────────────────────────────────────────── */
const Tag = ({ children, teal }: { children: React.ReactNode; teal?: boolean }) => (
  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
    teal
      ? "bg-teal-50 text-teal-700 border-teal-200"
      : "bg-slate-100 text-slate-500 border-slate-200"
  }`}>
    {children}
  </span>
);

/* ── Section card ────────────────────────────────────────────────────── */
const Section = ({
  icon: Icon, letter, title, sub, children,
}: {
  icon: any; letter: string; title: string; sub: string; children: React.ReactNode;
}) => (
  <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
    <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
      <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-white"/>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Part {letter}</p>
        <p className="text-[15px] font-bold text-slate-800" style={{ fontFamily: "'Instrument Serif', serif" }}>
          {title}
        </p>
      </div>
      <p className="text-[11px] text-slate-400 hidden sm:block shrink-0">{sub}</p>
    </div>
    <div className="px-6 py-5 space-y-5">{children}</div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════ */
const BookBudget = () => {
  const navigate   = useNavigate();
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitStage, setSubmitStage] = useState<string>("");
  const [projects,   setProjects]   = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [proj,       setProj]       = useState<Project | null>(null);
  const [head,       setHead]       = useState<Head | null>(null);
  const [fileNumber, setFileNumber] = useState("");
  const [quotation,  setQuotation]  = useState<File | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const [form, setForm] = useState({
    headId: "", totalCost: "", material: "",
    purpose: "", description: "", invoiceNumber: "", mode: "",
  });

  useEffect(() => { fetchProjects(); }, []);

  useEffect(() => {
    const p = projects.find(p => p.id === selectedId) ?? null;
    setProj(p); setHead(null);
    setForm(f => ({ ...f, headId: "", totalCost: "" }));
    if (p) generateFileNumber(p.gpNumber);
  }, [selectedId, projects]);

  useEffect(() => {
    if (!proj || !form.headId) { setHead(null); return; }
    setHead(proj.heads.find(h => h.id === form.headId) ?? null);
  }, [form.headId, proj]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res  = await fetch(`${API}/get-pi-projects.php?piEmail=${PI_EMAIL}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setProjects(data.data || []);
    } catch (e: any) { toast.error("Failed to load projects: " + e.message); }
    finally { setLoading(false); }
  };

  const generateFileNumber = async (gpNumber: string) => {
    try {
      const res  = await fetch(`${API}/get-next-file-num.php?gpNumber=${encodeURIComponent(gpNumber)}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setFileNumber(data.fileNumber);
    } catch (e: any) { toast.error("Failed to generate file number: " + e.message); }
  };

  const set = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { toast.error("Only PDF files allowed"); return; }
    if (file.size > 10 * 1024 * 1024)   { toast.error("File must be less than 10 MB"); return; }
    setQuotation(file);
  };

  // ── Balance computations ──────────────────────────────────────────────
  // These use the live-computed bookedAmount values from the backend.
  // The backend's aggregation pipeline excludes rejected requests from booked,
  // so available automatically rises when a request is rejected.
  const computedProjectAvail = proj ? projectAvail(proj) : 0;
  const computedHeadAvail    = head ? headAvail(head)    : 0;

  // Only show heads that still have available balance (released > booked)
  const availableHeads = proj?.heads.filter(h => headAvail(h) > 0) ?? [];

  const amount = parseFloat(form.totalCost) || 0;
  const amountExceedsHead = head !== null && amount > computedHeadAvail;
  const amountExceedsProj = proj !== null && amount > computedProjectAvail;
  const overLimit         = amountExceedsHead || amountExceedsProj;

  const limitBreachedLabel = (): string => {
    if (amountExceedsHead && amountExceedsProj)
      return `project (${fmtINR(computedProjectAvail)}) and head (${fmtINR(computedHeadAvail)})`;
    if (amountExceedsHead) return `head "${head?.headName}" (${fmtINR(computedHeadAvail)} available)`;
    if (amountExceedsProj) return `project (${fmtINR(computedProjectAvail)} available)`;
    return "";
  };

  /**
   * After a successful submission the backend returns the new booked totals.
   * We patch the in-memory project + head so the UI reflects the deduction
   * immediately without a full page reload.
   *
   * updatedBalances fields (from create-budget-requests.php response):
   *   projectReleased, projectBooked, projectAvailable
   *   headReleased,    headBooked,    headAvailable
   */
  const applyUpdatedBalances = (updated: {
    projectReleased: number; projectBooked: number; projectAvailable: number;
    headReleased: number;    headBooked: number;    headAvailable: number;
  }) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== proj?.id) return p;
      return {
        ...p,
        totalReleasedAmount: updated.projectReleased,
        amountBookedByPI:    updated.projectBooked,      // ← drives projectAvail()
        availableBalance:    updated.projectAvailable,
        heads: p.heads.map(h => {
          if (h.id !== form.headId) return h;
          return {
            ...h,
            releasedAmount:   updated.headReleased,
            bookedAmount:     updated.headBooked,         // ← FIX: was missing, drives headAvail()
            availableBalance: updated.headAvailable,
          };
        }),
      };
    }));
  };

  /* ── SUBMIT ─────────────────────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proj)                         { toast.error("Please select a project"); return; }
    if (!form.headId)                  { toast.error("Please select a project head"); return; }
    if (!form.totalCost || amount <= 0){ toast.error("Please enter the total cost"); return; }
    if (!form.material.trim())         { toast.error("Please enter name of material and qty"); return; }
    if (!form.purpose.trim())          { toast.error("Please enter the purpose"); return; }
    if (!form.description.trim())      { toast.error("Please enter the detailed description"); return; }
    if (!form.invoiceNumber.trim())    { toast.error("Please enter invoice / bill number"); return; }
    if (!form.mode.trim())             { toast.error("Please enter mode of procurement"); return; }
    if (!quotation)                    { toast.error("Quotation PDF is required"); return; }
    if (!head)                         { toast.error("Selected head not found"); return; }
    if (overLimit) {
      toast.error(`Amount exceeds available balance for ${limitBreachedLabel()}`);
      return;
    }

    setSubmitting(true);
    setUploadProgress(0);
    setSubmitStage("Preparing…");

    const fd = new FormData();
    fd.append("projectId",    proj.id);
    fd.append("gpNumber",     proj.gpNumber);
    fd.append("fileNumber",   fileNumber);
    fd.append("projectTitle", proj.projectName);
    fd.append("projectType",  proj.modeOfProject);
    fd.append("piName",       PI_NAME);
    fd.append("piEmail",      PI_EMAIL);
    fd.append("department",   proj.department ?? "");
    fd.append("headId",       form.headId);
    fd.append("headName",     head.headName);
    fd.append("headType",     head.headType);
    fd.append("amount",       String(amount));
    fd.append("purpose",      form.purpose);
    fd.append("description",  form.description);
    fd.append("invoiceNumber",form.invoiceNumber);
    fd.append("material",     form.material);
    fd.append("mode",         form.mode);
    fd.append("projectEndDate", proj.projectEndDate ?? "");
    fd.append("quotation",    quotation, quotation.name);

    setSubmitStage("Uploading…");

    const data = await new Promise<any>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.upload.addEventListener("progress", (ev) => {
        if (ev.lengthComputable) {
          setUploadProgress(Math.round((ev.loaded / ev.total) * 90));
        }
      });

      xhr.addEventListener("load", () => {
        setUploadProgress(95);
        setSubmitStage("Processing…");
        try { resolve(JSON.parse(xhr.responseText)); }
        catch { reject(new Error("Invalid server response")); }
      });

      xhr.addEventListener("error",  () => reject(new Error("Network error")));
      xhr.addEventListener("abort",  () => reject(new Error("Upload cancelled")));

      xhr.open("POST", `${API}/create-budget-requests.php`);
      xhr.send(fd);
    });

    if (!data.success) {
      setSubmitting(false);
      setUploadProgress(0);
      setSubmitStage("");
      toast.error("Submission failed: " + data.message);
      return;
    }

    setUploadProgress(100);
    setSubmitStage("Done!");

    // Patch local state so available balances update instantly in the UI
    if (data.data?.updatedBalances) {
      applyUpdatedBalances(data.data.updatedBalances);
    }

    toast.success(`Budget request submitted! #${data.data.requestNumber}`);
    navigate("/pi");
  };

  const steps = ["You (PI)", "DA", "AR", "DR", "DRC Office", "DR (R&C)", "DRC", "Director"];

  /* ── Loading ─────────────────────────────────────────────────────── */
  if (loading) return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 bg-[#f5f4f0]"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center">
          <BookOpen className="h-5 w-5 text-white animate-pulse"/>
        </div>
        <p className="text-sm font-semibold text-slate-500">Loading your projects…</p>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <Fonts/>
      <div className="min-h-screen bg-[#f5f4f0]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

        {/* ══ Masthead ═════════════════════════════════════════════ */}
        <div className="bg-slate-900">
          <div className="max-w-2xl mx-auto px-5 pt-8 pb-6">
            <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-2">
              Research &amp; Consultancy · Fund Utilisation
            </p>
            <h1 className="text-white text-[28px] font-bold leading-tight"
              style={{ fontFamily: "'Instrument Serif', serif" }}>
              Book Budget Request
            </h1>
            <p className="text-slate-400 text-sm mt-1.5">
              Routed through 7 levels of approval after submission.
            </p>

            {/* Approval chain */}
            <div className="mt-5 flex items-center gap-1 flex-wrap">
              {steps.map((s, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${
                    i === 0 ? "bg-amber-400 text-amber-900" : "bg-white/10 text-slate-300"
                  }`}>{s}</span>
                  {i < steps.length - 1 && <ChevronRight className="h-3 w-3 text-slate-600 shrink-0"/>}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ══ Content ══════════════════════════════════════════════ */}
        <div className="max-w-2xl mx-auto px-5 py-6 space-y-4">

          {/* No projects */}
          {projects.length === 0 && (
            <div className="rounded-2xl bg-white border border-amber-200 py-14 text-center space-y-3">
              <AlertCircle className="h-9 w-9 text-amber-400 mx-auto"/>
              <p className="font-bold text-slate-700 text-base">No projects with released funds</p>
              <p className="text-sm text-slate-400">None of your projects have released funds yet.</p>
              <button onClick={() => navigate("/pi")}
                className="mt-1 px-5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition">
                ← Back to Dashboard
              </button>
            </div>
          )}

          {projects.length > 0 && (
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* ── A: Project Details ─────────────────────────────── */}
              <Section icon={BookOpen} letter="A" title="Project Details" sub="Auto-filled from database">

                <Field label="Select Project" required>
                  <Select value={selectedId} onValueChange={setSelectedId}>
                    <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50 text-sm focus:ring-0 focus:border-slate-400">
                      <SelectValue placeholder="Choose project by GP Number…"/>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id} className="py-2.5">
                          <span className="font-bold text-slate-800" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{p.gpNumber}</span>
                          <span className="text-slate-400 ml-2 text-xs">— {p.projectName}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                {proj && (
                  <>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl bg-slate-50 border border-slate-100 p-4">
                      <InfoRow label="Project Name" value={proj.projectName}/>
                      <InfoRow label="Indentor"     value={`${PI_NAME}, ${proj.department}`}/>
                      <InfoRow label="End Date"     value={fmtDate(proj.projectEndDate)}/>
                      <InfoRow label="File Number"  value={fileNumber} mono/>
                    </div>

                    {/* Project-level balance tiles */}
                    <div className="flex gap-2.5">
                      <BalTile label="Released"  value={fmtINR(proj.totalReleasedAmount)} color="blue"/>
                      <BalTile label="Booked"    value={fmtINR(proj.amountBookedByPI)}    color="amber"/>
                      <BalTile label="Available" value={fmtINR(computedProjectAvail)}     color="emerald"/>
                    </div>

                    <Field label="Budget Head" required hint="Select the head under which this expenditure falls">
                      {availableHeads.length === 0 ? (
                        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                          <AlertCircle className="h-4 w-4 shrink-0"/> No heads with available balance.
                        </div>
                      ) : (
                        <>
                          <Select value={form.headId} onValueChange={v => setForm(f => ({ ...f, headId: v }))}>
                            <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50 text-sm focus:ring-0 focus:border-slate-400">
                              <SelectValue placeholder="Select a budget head…"/>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {availableHeads.map(h => (
                                <SelectItem key={h.id} value={h.id} className="py-2.5">
                                  <span className="font-semibold">{h.headName}</span>
                                  {/* Show live available = released - booked */}
                                  <span className="text-xs text-slate-400 ml-2">({h.headType}) · {fmtINR(headAvail(h))} avail.</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {head && (
                            <div className="flex gap-2.5 mt-3">
                              <BalTile label="Sanctioned" value={fmtINR(head.sanctionedAmount)}  color="blue"/>
                              <BalTile label="Released"   value={fmtINR(head.releasedAmount)}    color="blue"/>
                              {/* Available = released - booked (rejected requests excluded from booked) */}
                              <BalTile label="Available"  value={fmtINR(computedHeadAvail)}      color="emerald"/>
                            </div>
                          )}
                        </>
                      )}
                    </Field>
                  </>
                )}
              </Section>

              {/* ── B: Purchase Details ───────────────────────────── */}
              {proj && form.headId && (
                <Section icon={ClipboardList} letter="B" title="Purchase Details" sub="Filled by Principal Investigator">

                  <Field
                    label="Total Cost for Purchase"
                    required
                    hint={
                      head
                        ? `Max allowed: ${fmtINR(Math.min(computedProjectAvail, computedHeadAvail))} ` +
                          `(project: ${fmtINR(computedProjectAvail)}, head: ${fmtINR(computedHeadAvail)})`
                        : undefined
                    }
                  >
                    <div className={`flex items-center rounded-xl border-2 overflow-hidden transition-colors ${
                      overLimit
                        ? "border-red-400 bg-red-50"
                        : amount > 0
                        ? "border-emerald-400 bg-emerald-50/30"
                        : "border-slate-200 bg-white"
                    }`}>
                      <span className="px-4 text-slate-500 text-sm font-semibold select-none border-r border-slate-200 h-12 flex items-center"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}>₹</span>
                      <input
                        name="totalCost" type="number" step="0.01" min="0"
                        value={form.totalCost} onChange={set}
                        placeholder="0.00"
                        className="flex-1 h-12 bg-transparent border-none outline-none text-lg font-bold text-slate-800 placeholder:text-slate-300 px-4"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        required
                      />
                      <span className="pr-4">
                        {amount > 0 && !overLimit
                          ? <CheckCircle2 className="h-5 w-5 text-emerald-500"/>
                          : overLimit
                          ? <AlertCircle className="h-5 w-5 text-red-400"/>
                          : null}
                      </span>
                    </div>
                    {overLimit && (
                      <p className="text-xs text-red-600 flex items-center gap-1 mt-1.5">
                        <AlertCircle className="h-3 w-3"/>
                        Exceeds available balance for {limitBreachedLabel()}
                      </p>
                    )}
                  </Field>

                  <Field label="Name of Material & Quantity" required tag={<Tag>Locked after submission</Tag>}>
                    <Textarea
                      name="material" value={form.material} onChange={set}
                      placeholder="e.g. Lab chemicals × 5 kg, Glassware set × 10 units"
                      rows={3}
                      className="rounded-xl border-slate-200 bg-slate-50 text-sm focus:border-slate-400 focus:ring-0 resize-none"
                      required
                    />
                  </Field>

                  <Field label="Purpose" required>
                    <Input
                      name="purpose" value={form.purpose} onChange={set}
                      placeholder="Brief purpose of this expenditure"
                      className="h-11 rounded-xl border-slate-200 bg-slate-50 text-sm focus:border-slate-400 focus:ring-0"
                      required
                    />
                  </Field>

                  <Field label="Detailed Description" required>
                    <Textarea
                      name="description" value={form.description} onChange={set}
                      placeholder="Provide a detailed justification for this budget request"
                      rows={4}
                      className="rounded-xl border-slate-200 bg-slate-50 text-sm focus:border-slate-400 focus:ring-0 resize-none"
                      required
                    />
                  </Field>

                  <Field label="Invoice / Bill Number" required>
                    <Input
                      name="invoiceNumber" value={form.invoiceNumber} onChange={set}
                      placeholder="e.g. INV-2025-001"
                      className="h-11 rounded-xl border-slate-200 bg-slate-50 text-sm focus:border-slate-400 focus:ring-0"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      required
                    />
                  </Field>

                  <Field label="Mode of Procurement" required tag={<Tag teal>DR (R&C) / DRC may update</Tag>}>
                    <Textarea
                      name="mode" value={form.mode} onChange={set}
                      placeholder="e.g. Direct purchase / GeM portal / Open tender / Limited tender"
                      rows={2}
                      className="rounded-xl border-slate-200 bg-slate-50 text-sm focus:border-slate-400 focus:ring-0 resize-none"
                      required
                    />
                  </Field>
                </Section>
              )}

              {/* ── C: Supporting Document ────────────────────────── */}
              {proj && form.headId && (
                <Section icon={Paperclip} letter="C" title="Supporting Document" sub="Mandatory PDF upload">
                  <label htmlFor="quotationFile"
                    className={`flex items-center gap-4 w-full cursor-pointer rounded-xl border-2 border-dashed px-5 py-4 transition-all select-none ${
                      quotation
                        ? "border-emerald-400 bg-emerald-50/40"
                        : "border-slate-200 bg-slate-50 hover:border-slate-400 hover:bg-white"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      quotation ? "bg-emerald-100" : "bg-white border border-slate-200"
                    }`}>
                      {quotation
                        ? <FileText className="h-5 w-5 text-emerald-600"/>
                        : <Upload className="h-5 w-5 text-slate-400"/>}
                    </div>
                    <div className="flex-1 min-w-0">
                      {quotation ? (
                        <>
                          <p className="text-sm font-semibold text-emerald-700 truncate">{quotation.name}</p>
                          <p className="text-xs text-emerald-500 mt-0.5">{(quotation.size / 1024).toFixed(1)} KB · PDF</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-slate-700">Upload Quotation PDF</p>
                          <p className="text-xs text-slate-400 mt-0.5">PDF only · max 10 MB</p>
                        </>
                      )}
                    </div>
                    {quotation && (
                      <span className="text-[11px] font-semibold text-emerald-700 border border-emerald-300 bg-white px-3 py-1 rounded-lg shrink-0">
                        Replace
                      </span>
                    )}
                    <input id="quotationFile" type="file" accept=".pdf" onChange={handleFile} className="hidden"/>
                  </label>
                </Section>
              )}

              {/* ── Submit ────────────────────────────────────────── */}
              {proj && form.headId && (
                <div className="flex gap-3 pt-1 pb-8">
                  <button
                    type="submit"
                    disabled={submitting || availableHeads.length === 0 || !!overLimit}
                    className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold flex flex-col items-center justify-center gap-1 transition-colors shadow-md overflow-hidden"
                    style={{ minHeight: "48px" }}
                  >
                    {submitting ? (
                      <div className="w-full px-4 py-2.5">
                        <div className="flex items-center justify-center gap-2 mb-1.5">
                          <Loader2 className="h-4 w-4 animate-spin"/>
                          <span>{submitStage}</span>
                          <span className="text-slate-400 text-xs">{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-white/20 rounded-full h-1 overflow-hidden">
                          <div
                            className="bg-white h-1 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 h-12">
                        <Send className="h-4 w-4"/>
                        Submit for Approval
                      </div>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/pi")}
                    className="h-12 px-6 rounded-xl border-2 border-slate-200 bg-white text-slate-600 hover:border-red-300 hover:text-red-600 text-sm font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}

            </form>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default BookBudget;