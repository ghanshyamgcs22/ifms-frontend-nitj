import { useState, useEffect } from "react";
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
  const [projects,   setProjects]   = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [proj,       setProj]       = useState<Project | null>(null);
  const [head,       setHead]       = useState<Head | null>(null);
  const [fileNumber, setFileNumber] = useState("");
  const [quotation,  setQuotation]  = useState<File | null>(null);
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
      const res  = await fetch(`${import.meta.env.VITE_API_URL}/api/get-pi-projects.php?piEmail=${PI_EMAIL}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setProjects(data.data || []);
    } catch (e: any) { toast.error("Failed to load projects: " + e.message); }
    finally { setLoading(false); }
  };
  const generateFileNumber = async (gpNumber: string) => {
    try {
      const res  = await fetch(`${import.meta.env.VITE_API_URL}/api/get-next-file-num.php?gpNumber=${encodeURIComponent(gpNumber)}`);
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

  const toBase64 = (file: File): Promise<string> => new Promise((res, rej) => {
    const r = new FileReader(); r.readAsDataURL(file);
    r.onload = () => res(r.result as string); r.onerror = rej;
  });

  const availableHeads    = proj?.heads.filter(h => h.availableBalance > 0) ?? [];
  const amount            = parseFloat(form.totalCost) || 0;
  const amountExceedsHead = head && amount > head.availableBalance;
  const amountExceedsProj = proj  && amount > proj.availableBalance;
  const overLimit         = amountExceedsHead || amountExceedsProj;

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
    if (overLimit)                     { toast.error(`Amount exceeds available balance`); return; }

    try {
      setSubmitting(true);
      let base64File = "";
      try { base64File = await toBase64(quotation); }
      catch { toast.error("File conversion failed"); return; }

      const payload = {
        projectId: proj.id, gpNumber: proj.gpNumber, fileNumber,
        projectTitle: proj.projectName, projectType: proj.modeOfProject,
        piName: PI_NAME, piEmail: PI_EMAIL, department: proj.department ?? "",
        headId: form.headId, headName: head.headName, headType: head.headType,
        amount, purpose: form.purpose, description: form.description,
        invoiceNumber: form.invoiceNumber, material: form.material,
        expenditure: `Funds under "${head.headName}" (${head.headType}) for ${proj.gpNumber}. Available: ${fmtINR(head.availableBalance)}.`,
        mode: form.mode, quotation: base64File, quotationName: quotation.name,
        projectEndDate: proj.projectEndDate,
      };

      const res  = await fetch(`${API}/create-budget-requests.php`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success(`Budget request submitted! #${data.data.requestNumber}`);
      navigate("/pi");
    } catch (e: any) { toast.error("Submission failed: " + e.message); }
    finally { setSubmitting(false); }
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
                    {/* Project info grid */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl bg-slate-50 border border-slate-100 p-4">
                      <InfoRow label="Project Name" value={proj.projectName}/>
                      <InfoRow label="Indentor"     value={`${PI_NAME}, ${proj.department}`}/>
                      <InfoRow label="End Date"     value={fmtDate(proj.projectEndDate)}/>
                      <InfoRow label="File Number"  value={fileNumber} mono/>
                    </div>

                    {/* Balance row */}
                    <div className="flex gap-2.5">
                      <BalTile label="Released"  value={fmtINR(proj.totalReleasedAmount)} color="blue"/>
                      <BalTile label="Booked"    value={fmtINR(proj.amountBookedByPI)}    color="amber"/>
                      <BalTile label="Available" value={fmtINR(proj.availableBalance)}    color="emerald"/>
                    </div>

                    {/* Head selector */}
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
                                  <span className="text-xs text-slate-400 ml-2">({h.headType}) · {fmtINR(h.availableBalance)} avail.</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {head && (
                            <div className="flex gap-2.5 mt-3">
                              <BalTile label="Sanctioned" value={fmtINR(head.sanctionedAmount)} color="blue"/>
                              <BalTile label="Released"   value={fmtINR(head.releasedAmount)}   color="blue"/>
                              <BalTile label="Available"  value={fmtINR(head.availableBalance)} color="emerald"/>
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

                  {/* Total Cost — ONE field, prominent */}
                  <Field
                    label="Total Cost for Purchase"
                    required
                    hint={head ? `Max available under this head: ${fmtINR(head.availableBalance)}` : undefined}
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
                        Exceeds available balance of {fmtINR(head?.availableBalance ?? proj?.availableBalance ?? 0)}
                      </p>
                    )}
                  </Field>

                  {/* Material & Qty */}
                  <Field
                    label="Name of Material & Quantity"
                    required
                    tag={<Tag>Locked after submission</Tag>}
                  >
                    <Textarea
                      name="material" value={form.material} onChange={set}
                      placeholder="e.g. Lab chemicals × 5 kg, Glassware set × 10 units"
                      rows={3}
                      className="rounded-xl border-slate-200 bg-slate-50 text-sm focus:border-slate-400 focus:ring-0 resize-none"
                      required
                    />
                  </Field>

                  {/* Purpose */}
                  <Field label="Purpose" required>
                    <Input
                      name="purpose" value={form.purpose} onChange={set}
                      placeholder="Brief purpose of this expenditure"
                      className="h-11 rounded-xl border-slate-200 bg-slate-50 text-sm focus:border-slate-400 focus:ring-0"
                      required
                    />
                  </Field>

                  {/* Description */}
                  <Field label="Detailed Description" required>
                    <Textarea
                      name="description" value={form.description} onChange={set}
                      placeholder="Provide a detailed justification for this budget request"
                      rows={4}
                      className="rounded-xl border-slate-200 bg-slate-50 text-sm focus:border-slate-400 focus:ring-0 resize-none"
                      required
                    />
                  </Field>

                  {/* Invoice No */}
                  <Field label="Invoice / Bill Number" required>
                    <Input
                      name="invoiceNumber" value={form.invoiceNumber} onChange={set}
                      placeholder="e.g. INV-2025-001"
                      className="h-11 rounded-xl border-slate-200 bg-slate-50 text-sm focus:border-slate-400 focus:ring-0"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      required
                    />
                  </Field>

                  {/* Mode of Procurement */}
                  <Field
                    label="Mode of Procurement"
                    required
                    tag={<Tag teal>DR (R&C) / DRC may update</Tag>}
                  >
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
                    className="flex-1 h-12 rounded-xl bg-slate-900 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-md"
                  >
                    {submitting
                      ? <><Loader2 className="h-4 w-4 animate-spin"/> Submitting…</>
                      : <><Send className="h-4 w-4"/> Submit for Approval</>}
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