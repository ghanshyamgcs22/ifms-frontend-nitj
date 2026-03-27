// pages/pi/QueryResponsePage.tsx
// ✅ Redesigned to exactly match BookBudget visual style
// ✅ Part A: Project info (read-only, auto-filled) - same as BookBudget Part A
// ✅ Part B: Purchase details - ALL fields pre-filled & editable by PI
//            material/expenditure/mode show reviewer updates but PI can still edit them
// ✅ Part C: Supporting document - re-upload with same file number retained
// ✅ Part D: Query response - required PI response textarea
// ✅ Approval chain shown in masthead

import { Layout } from "@/components/Layout";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Send, Loader2, AlertCircle, Upload, FileText,
  CheckCircle2, ChevronRight, BookOpen,
  ClipboardList, Paperclip, MessageSquare,
  Eye, ExternalLink, ArrowLeft,
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

const API      = import.meta.env.VITE_API_URL;
const PI_EMAIL = "pi@ifms.edu";

const fmtINR = (n: number) =>
  "₹" + parseFloat(String(n || 0)).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
};

/* ── Types ───────────────────────────────────────────────────────────── */
interface LatestQuery {
  query: string; raisedBy: string; raisedByLabel: string;
  raisedAt: string; resolved: boolean;
}

interface RequestData {
  id: string; requestNumber: string; fileNumber: string; gpNumber: string;
  projectTitle: string; projectType: string; piName: string; department: string;
  headName: string; headType: string; amount: number;
  purpose: string; description: string; material: string;
  expenditure: string; mode: string; invoiceNumber: string;
  status: string; currentStage: string; hasOpenQuery: boolean;
  projectEndDate?: string | null;
  latestQuery: LatestQuery | null;
  quotationFile?: string; quotationFileName?: string;
}

/* ── Balance tile ────────────────────────────────────────────────────── */
const BalTile = ({
  label, value, color,
}: {
  label: string; value: string; color: "blue" | "amber" | "emerald" | "slate";
}) => {
  const bar = {
    blue: "bg-blue-500", amber: "bg-amber-500",
    emerald: "bg-emerald-500", slate: "bg-slate-500",
  }[color];
  return (
    <div className="flex-1 rounded-xl bg-white border border-slate-200 overflow-hidden">
      <div className={`h-[3px] ${bar}`} />
      <div className="px-3.5 py-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-[14px] font-bold text-slate-800 mt-1"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}>
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

/* ── Read-only info row ──────────────────────────────────────────────── */
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
const Tag = ({
  children, color = "slate",
}: {
  children: React.ReactNode;
  color?: "slate" | "teal" | "amber" | "blue";
}) => {
  const cls = {
    slate: "bg-slate-100 text-slate-500 border-slate-200",
    teal:  "bg-teal-50 text-teal-700 border-teal-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    blue:  "bg-blue-50 text-blue-700 border-blue-200",
  }[color];
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cls}`}>
      {children}
    </span>
  );
};

/* ── Section card ────────────────────────────────────────────────────── */
const Section = ({
  icon: Icon, letter, title, sub, children,
}: {
  icon: React.ElementType; letter: string; title: string; sub: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
    <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
      <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Part {letter}</p>
        <p className="text-[15px] font-bold text-slate-800"
          style={{ fontFamily: "'Instrument Serif', serif" }}>
          {title}
        </p>
      </div>
      <p className="text-[11px] text-slate-400 hidden sm:block shrink-0">{sub}</p>
    </div>
    <div className="px-6 py-5 space-y-5">{children}</div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════ */
const QueryResponsePage = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();

  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [request,    setRequest]    = useState<RequestData | null>(null);

  // PDF viewer
  const [showPdf, setShowPdf] = useState(false);
  const [pdfUrl,  setPdfUrl]  = useState<string | null>(null);

  // New quotation file
  const [newFile, setNewFile] = useState<File | null>(null);

  // Form — all purchase fields editable by PI
  const [form, setForm] = useState({
    purpose:       "",
    description:   "",
    invoiceNumber: "",
    material:      "",
    expenditure:   "",
    mode:          "",
    piResponse:    "",
  });

  useEffect(() => { if (requestId) load(); }, [requestId]);
  useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); }, [pdfUrl]);

  const load = async () => {
    try {
      setLoading(true);
      const res  = await fetch(
        `${API}/get-pi-budget-requests.php?piEmail=${encodeURIComponent(PI_EMAIL)}`
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      const req = (data.data as RequestData[]).find(r => r.id === requestId);
      if (!req) { toast.error("Request not found"); navigate("/pi"); return; }
      if (!req.hasOpenQuery) { toast.info("No open query on this request."); navigate("/pi"); return; }

      setRequest(req);

      // Pre-fill ALL purchase fields from DB
      setForm({
        purpose:       req.purpose       || "",
        description:   req.description   || "",
        invoiceNumber: req.invoiceNumber || "",
        material:      req.material      || "",
        expenditure:   req.expenditure   || "",
        mode:          req.mode          || "",
        piResponse:    "",
      });
    } catch (e: any) {
      toast.error(e.message || "Failed to load");
      navigate("/pi");
    } finally { setLoading(false); }
  };

  const set = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleViewFile = async () => {
    if (!request) return;
    if (request.quotationFile) {
      try {
        let dataUrl = request.quotationFile;
        if (!dataUrl.startsWith("data:")) dataUrl = `data:application/pdf;base64,${dataUrl}`;
        const blob    = await (await fetch(dataUrl)).blob();
        const blobUrl = URL.createObjectURL(blob);
        if (pdfUrl) URL.revokeObjectURL(pdfUrl);
        setPdfUrl(blobUrl);
        setShowPdf(v => !v);
      } catch { toast.error("Could not open the file."); }
      return;
    }
    window.open(`${API}/download-file.php?requestId=${request.id}&type=quotation`, "_blank");
  };

  const handleNewFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { toast.error("Only PDF files allowed"); return; }
    if (file.size > 10 * 1024 * 1024)   { toast.error("File must be less than 10 MB"); return; }
    setNewFile(file);
  };

  const toBase64 = (file: File): Promise<string> => new Promise((res, rej) => {
    const r = new FileReader(); r.readAsDataURL(file);
    r.onload = () => res(r.result as string); r.onerror = rej;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;
    if (!form.piResponse.trim()) { toast.error("Please write your response to the query."); return; }

    try {
      setSubmitting(true);
      let newQuotationBase64 = "";
      if (newFile) {
        try { newQuotationBase64 = await toBase64(newFile); }
        catch { toast.error("File conversion failed"); return; }
      }

      const res = await fetch(`${API}/resolve-query.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId:        request.id,
          piEmail:          PI_EMAIL,
          purpose:          form.purpose,
          description:      form.description,
          invoiceNumber:    form.invoiceNumber,
          material:         form.material,
          mode:             form.mode,
          piResponse:       form.piResponse,
          newQuotation:     newQuotationBase64,
          newQuotationName: newFile?.name || "",
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      toast.success(
        newFile
          ? `Query resolved! New file uploaded. File number ${request.fileNumber} retained.`
          : "Query resolved! The reviewer has been notified."
      );
      navigate("/pi");
    } catch (e: any) {
      toast.error(e.message || "Submission failed");
    } finally { setSubmitting(false); }
  };

  const steps = ["You (PI)", "DA", "AR", "DR", "DRC Office", "DR (R&C)", "DRC", "Director"];

  /* ── Loading ─────────────────────────────────────────────────────── */
  if (loading) return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 bg-[#f5f4f0]"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center">
          <BookOpen className="h-5 w-5 text-white animate-pulse" />
        </div>
        <p className="text-sm font-semibold text-slate-500">Loading request…</p>
      </div>
    </Layout>
  );

  if (!request) return null;

  const q = request.latestQuery;

  return (
    <Layout>
      <Fonts />
      <div className="min-h-screen bg-[#f5f4f0]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

        {/* ══ Masthead ═════════════════════════════════════════════ */}
        <div className="bg-slate-900">
          <div className="max-w-2xl mx-auto px-5 pt-8 pb-6">

            {/* Back button */}
            <button
              onClick={() => navigate("/pi")}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white text-[12px] font-semibold mb-4 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
            </button>

            <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-2">
              Research &amp; Consultancy · Query Response
            </p>
            <h1 className="text-white text-[28px] font-bold leading-tight"
              style={{ fontFamily: "'Instrument Serif', serif" }}>
              Respond to Query
            </h1>
            <p className="text-slate-400 text-sm mt-1.5">
              Review, update your request details, then submit your response.
            </p>

            {/* Approval chain */}
            <div className="mt-5 flex items-center gap-1 flex-wrap">
              {steps.map((s, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${
                    i === 0
                      ? "bg-amber-400 text-amber-900"
                      : "bg-white/10 text-slate-300"
                  }`}>{s}</span>
                  {i < steps.length - 1 && <ChevronRight className="h-3 w-3 text-slate-600 shrink-0" />}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ══ Content ══════════════════════════════════════════════ */}
        <div className="max-w-2xl mx-auto px-5 py-6 space-y-4">

          {/* ── Query Banner ──────────────────────────────────────── */}
          {q && (
            <div className="rounded-2xl bg-amber-50 border border-amber-300 overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 px-5 py-3 bg-amber-100 border-b border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-[12px] font-bold text-amber-800 uppercase tracking-widest">
                  Open Query
                </p>
              </div>
              <div className="px-5 py-4">
                <p className="text-[12px] font-semibold text-amber-800 mb-2">
                  Raised by <span className="font-bold">{q.raisedByLabel || q.raisedBy}</span>
                  {q.raisedAt && (
                    <span className="ml-2 text-amber-600 font-normal">
                      on {fmtDate(q.raisedAt)}
                    </span>
                  )}
                </p>
                <div className="bg-white border border-amber-200 rounded-xl px-4 py-3">
                  <p className="text-sm text-amber-900 italic">"{q.query}"</p>
                </div>
                <p className="text-[11px] text-amber-600 mt-2">
                  Review all fields below, edit anything that needs correction, then submit your response.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* ── Part A: Project Details ───────────────────────────── */}
            <Section icon={BookOpen} letter="A" title="Project Details" sub="Auto-filled from database">

              {/* Project info grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl bg-slate-50 border border-slate-100 p-4">
                <InfoRow label="GP Number"    value={request.gpNumber} mono />
                <InfoRow label="File Number"  value={request.fileNumber} mono />
                <InfoRow label="Project Name" value={request.projectTitle} />
                <InfoRow label="Project Type" value={request.projectType} />
                <InfoRow label="Indentor"     value={`${request.piName}, ${request.department}`} />
                <InfoRow label="End Date"     value={fmtDate(request.projectEndDate)} />
              </div>

              {/* Balance tiles */}
              <div className="flex gap-2.5">
                <BalTile label="Head"      value={request.headName}          color="blue" />
                <BalTile label="Head Type" value={request.headType}          color="slate" />
                <BalTile label="Amount"    value={fmtINR(request.amount)}    color="emerald" />
              </div>

            </Section>

            {/* ── Part B: Purchase Details (all editable) ───────────── */}
            <Section icon={ClipboardList} letter="B" title="Purchase Details" sub="Review & edit if needed">

              {/* Total Cost — read-only display (amount can't change after booking) */}
              <div className="rounded-xl border-2 border-slate-200 bg-slate-50 overflow-hidden">
                <div className="h-[3px] bg-emerald-500" />
                <div className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Total Cost for Purchase
                    </p>
                    <p className="text-[22px] font-bold text-slate-800 mt-0.5"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {fmtINR(request.amount)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-white border border-slate-200 px-3 py-1 rounded-lg">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    Booked — cannot change
                  </div>
                </div>
              </div>

              {/* Name of Material & Qty */}
              <Field
                label="Name of Material & Quantity"
                required
                tag={<Tag color="slate">Locked after original submission</Tag>}
                hint="You may correct this if the reviewer flagged an issue"
              >
                <Textarea
                  name="material"
                  value={form.material}
                  onChange={set}
                  placeholder="e.g. Lab chemicals × 5 kg, Glassware set × 10 units"
                  rows={3}
                  className="rounded-xl border-slate-200 bg-slate-50 text-sm focus:border-slate-400 focus:ring-0 resize-none"
                />
              </Field>

              {/* Purpose */}
              <Field label="Purpose" required>
                <Input
                  name="purpose"
                  value={form.purpose}
                  onChange={set}
                  placeholder="Brief purpose of this expenditure"
                  className="h-11 rounded-xl border-slate-200 bg-slate-50 text-sm focus:border-slate-400 focus:ring-0"
                  required
                />
              </Field>

              {/* Description */}
              <Field label="Detailed Description" required>
                <Textarea
                  name="description"
                  value={form.description}
                  onChange={set}
                  placeholder="Provide a detailed justification for this budget request"
                  rows={4}
                  className="rounded-xl border-slate-200 bg-slate-50 text-sm focus:border-slate-400 focus:ring-0 resize-none"
                  required
                />
              </Field>

              {/* Invoice No */}
              <Field label="Invoice / Bill Number" required>
                <Input
                  name="invoiceNumber"
                  value={form.invoiceNumber}
                  onChange={set}
                  placeholder="e.g. INV-2025-001"
                  className="h-11 rounded-xl border-slate-200 bg-slate-50 text-sm focus:border-slate-400 focus:ring-0"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  required
                />
              </Field>

              {/* Mode of Procurement — may have been updated by DRC R&C / DRC */}
              <Field
                label="Mode of Procurement"
                required
                tag={<Tag color="teal">DR (R&C) / DRC may have updated</Tag>}
                hint="This field may have been filled/updated by the reviewer. You can correct it if needed."
              >
                <Textarea
                  name="mode"
                  value={form.mode}
                  onChange={set}
                  placeholder="e.g. Direct purchase / GeM portal / Open tender / Limited tender"
                  rows={2}
                  className="rounded-xl border-slate-200 bg-slate-50 text-sm focus:border-slate-400 focus:ring-0 resize-none"
                  required
                />
              </Field>

              {/* Availability of Funds — may have been updated by AR / DR */}
              <Field
                label="Availability of Funds & Head of Expenditure"
                tag={<Tag color="amber">AR / DR may have updated</Tag>}
                hint="This field may have been filled/updated by AR or DR. You can correct it if needed."
              >
                <Textarea
                  name="expenditure"
                  value={form.expenditure}
                  onChange={set}
                  placeholder="Funds availability details as confirmed by accounts"
                  rows={3}
                  className="rounded-xl border-slate-200 bg-slate-50 text-sm focus:border-slate-400 focus:ring-0 resize-none"
                />
              </Field>

            </Section>

            {/* ── Part C: Supporting Document ───────────────────────── */}
            <Section icon={Paperclip} letter="C" title="Supporting Document" sub="Keep existing or re-upload">

              {/* Current file */}
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-slate-700">Current Quotation</p>
                      <p className="text-[11px] text-slate-400">{request.quotationFileName || "Quotation.pdf"}</p>
                      {request.fileNumber && (
                        <p className="text-[11px] font-semibold text-blue-600 mt-0.5"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          File No: {request.fileNumber}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleViewFile}
                    className="flex items-center gap-1.5 h-8 px-3 text-[12px] font-semibold border border-blue-300 text-blue-700 hover:bg-blue-50 rounded-lg transition-colors bg-white"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {showPdf ? "Hide" : "View"}
                  </button>
                </div>

                {/* Inline PDF viewer */}
                {showPdf && pdfUrl && (
                  <div>
                    <div className="flex items-center justify-between px-4 py-2 bg-slate-100 border-b border-slate-200">
                      <p className="text-[12px] font-semibold text-slate-700">📄 Quotation Preview</p>
                      <div className="flex items-center gap-3">
                        <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                          className="text-[12px] text-blue-600 hover:underline flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" /> New tab
                        </a>
                        <button type="button" onClick={() => setShowPdf(false)}
                          className="text-[12px] text-slate-500 hover:text-slate-800">✕ Close</button>
                      </div>
                    </div>
                    <iframe src={pdfUrl} className="w-full" style={{ height: "460px" }} title="Quotation" />
                  </div>
                )}
              </div>

              {/* File number retention notice */}
              <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
                <FileText className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[12px] font-semibold text-blue-800">File number is always retained</p>
                  <p className="text-[11px] text-blue-600 mt-0.5">
                    Even if you re-upload a revised quotation, the reference{" "}
                    <span className="font-bold font-mono">{request.fileNumber}</span>{" "}
                    on the approval certificate will not change.
                  </p>
                </div>
              </div>

              {/* Re-upload drop zone */}
              <label
                htmlFor="newQuotationFile"
                className={`flex items-center gap-4 w-full cursor-pointer rounded-xl border-2 border-dashed px-5 py-4 transition-all select-none ${
                  newFile
                    ? "border-emerald-400 bg-emerald-50/40"
                    : "border-slate-200 bg-slate-50 hover:border-slate-400 hover:bg-white"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  newFile ? "bg-emerald-100" : "bg-white border border-slate-200"
                }`}>
                  {newFile
                    ? <FileText className="h-5 w-5 text-emerald-600" />
                    : <Upload className="h-5 w-5 text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  {newFile ? (
                    <>
                      <p className="text-sm font-semibold text-emerald-700 truncate">{newFile.name}</p>
                      <p className="text-xs text-emerald-500 mt-0.5">{(newFile.size / 1024).toFixed(1)} KB · PDF</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-slate-700">Re-upload Quotation PDF (optional)</p>
                      <p className="text-xs text-slate-400 mt-0.5">PDF only · max 10 MB · replaces existing file</p>
                    </>
                  )}
                </div>
                {newFile && (
                  <button
                    type="button"
                    onClick={e => { e.preventDefault(); setNewFile(null); }}
                    className="text-[11px] font-semibold text-rose-600 border border-rose-300 bg-white px-3 py-1 rounded-lg shrink-0 hover:bg-rose-50 transition-colors"
                  >
                    Remove
                  </button>
                )}
                <input
                  id="newQuotationFile"
                  type="file"
                  accept=".pdf"
                  onChange={handleNewFile}
                  className="hidden"
                />
              </label>

            </Section>

            {/* ── Part D: Query Response ────────────────────────────── */}
            <Section icon={MessageSquare} letter="D" title="Your Response" sub="Required to resolve query">

              <Field
                label="Response to the Query"
                required
                hint={`Explain how you've addressed the query raised by ${q?.raisedByLabel || "the reviewer"}`}
              >
                <Textarea
                  name="piResponse"
                  value={form.piResponse}
                  onChange={set}
                  placeholder={`Describe changes made or clarify the query raised by ${q?.raisedByLabel || "the reviewer"}…`}
                  rows={5}
                  className="rounded-xl border-slate-200 bg-slate-50 text-sm focus:border-slate-400 focus:ring-0 resize-none"
                  required
                />
              </Field>

              <p className="text-[11px] text-slate-400">
                This response will be visible to{" "}
                <span className="font-semibold">{q?.raisedByLabel || "the reviewer"}</span>{" "}
                who raised the query. After submission, the request will be returned to the reviewer's queue.
              </p>

            </Section>

            {/* ── Submit ────────────────────────────────────────────── */}
            <div className="flex gap-3 pt-1 pb-8">
              <button
                type="submit"
                disabled={submitting || !form.piResponse.trim()}
                className="flex-1 h-12 rounded-xl bg-slate-900 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-md"
              >
                {submitting
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
                  : <><Send className="h-4 w-4" /> Submit Response & Resolve Query</>}
              </button>
              <button
                type="button"
                onClick={() => navigate("/pi")}
                className="h-12 px-6 rounded-xl border-2 border-slate-200 bg-white text-slate-600 hover:border-red-300 hover:text-red-600 text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>

          </form>
        </div>
      </div>
    </Layout>
  );
};

export default QueryResponsePage;