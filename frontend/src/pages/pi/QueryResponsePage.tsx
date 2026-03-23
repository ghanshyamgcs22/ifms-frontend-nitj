// pages/pi/QueryResponsePage.tsx
// View original file + re-upload new quotation
// ✅ Re-upload keeps the SAME file number as the original — no new number generated

import { Layout } from "@/components/Layout";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Loader2, Pencil, Lock, AlertTriangle, CheckCircle,
  Send, ArrowLeft, MessageSquare, FileText, ExternalLink,
  Eye, Upload,
} from "lucide-react";
import { toast } from "sonner";

const API = import.meta.env.VITE_API_URL || "https://ifms-backend-nitj.onrender.com/api";
const PI_EMAIL = "pi@ifms.edu";

interface LatestQuery {
  query: string; raisedBy: string; raisedByLabel: string;
  raisedAt: string; raisedStage: string; resolved: boolean; piResponse?: string;
}
interface RequestData {
  id: string; requestNumber: string; fileNumber: string; gpNumber: string;
  projectTitle: string; piName: string; department: string; headName: string;
  amount: number; purpose: string; description: string; material: string;
  expenditure: string; mode: string; invoiceNumber: string;
  status: string; currentStage: string; hasOpenQuery: boolean;
  latestQuery: LatestQuery | null;
  quotationFile?: string; quotationFileName?: string;
}

type FormField = "purpose"|"description"|"material"|"expenditure"|"mode"|"invoiceNumber"|"piResponse";

const fmtDate = (d: string) =>
  !d ? "—" : new Date(d).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });

const FIELDS: { key: FormField; label: string; type: "input"|"textarea"; rows?: number }[] = [
  { key: "purpose",       label: "Purpose",                                         type: "input" },
  { key: "description",   label: "Detailed Description",                            type: "textarea", rows: 4 },
  { key: "material",      label: "Name of material to be purchased & Qty.",         type: "textarea", rows: 3 },
  { key: "expenditure",   label: "Availability of Funds & Head of Expenditure",     type: "textarea", rows: 3 },
  { key: "mode",          label: "Mode of Procurement",                             type: "textarea", rows: 3 },
  { key: "invoiceNumber", label: "Invoice / Bill Number",                           type: "input" },
];

const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload  = () => resolve(reader.result as string);
  reader.onerror = reject;
});

const QueryResponsePage = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();

  const [loading,       setLoading]    = useState(true);
  const [submitting,    setSubmitting] = useState(false);
  const [request,       setRequest]   = useState<RequestData | null>(null);
  const [editing,       setEditing]   = useState<Partial<Record<FormField, boolean>>>({});
  const [showPdfViewer, setShowPdf]   = useState(false);
  const [pdfUrl,        setPdfUrl]    = useState<string | null>(null);

  // ── New file state — NO file number generation ────────────────────────────
  const [newFile, setNewFile] = useState<File | null>(null);

  const [form, setForm] = useState<Record<FormField, string>>({
    purpose:"", description:"", material:"",
    expenditure:"", mode:"", invoiceNumber:"", piResponse:"",
  });

  useEffect(() => { if (requestId) load(); }, [requestId]);
  useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); }, [pdfUrl]);

  const load = async () => {
    try {
      setLoading(true);
      const res  = await fetch(`${API}/get-pi-budget-requests.php?piEmail=${encodeURIComponent(PI_EMAIL)}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      const req = (data.data as RequestData[]).find(r => r.id === requestId);
      if (!req) { toast.error("Request not found"); navigate("/pi"); return; }
      if (!req.hasOpenQuery) { toast.info("No open query on this request."); navigate("/pi"); return; }
      setRequest(req);
      setForm({
        purpose:       req.purpose       || "",
        description:   req.description   || "",
        material:      req.material      || "",
        expenditure:   req.expenditure   || "",
        mode:          req.mode          || "",
        invoiceNumber: req.invoiceNumber || "",
        piResponse:    "",
      });
    } catch (e: any) { toast.error(e.message || "Failed to load"); navigate("/pi"); }
    finally { setLoading(false); }
  };

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
        setShowPdf(true);
      } catch { toast.error("Could not open the file."); }
      return;
    }
    window.open(`${API}/download-file.php?requestId=${request.id}&type=quotation`, "_blank");
  };

  const handleNewFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { toast.error("Only PDF files allowed"); return; }
    if (file.size > 10 * 1024 * 1024)   { toast.error("File must be less than 10MB"); return; }
    setNewFile(file);
    // ✅ No file number generation — the existing fileNumber is reused as-is
  };

  const removeNewFile = () => setNewFile(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;
    if (!form.piResponse.trim()) { toast.error("Please write your response to the query."); return; }

    try {
      setSubmitting(true);
      let newQuotationBase64 = "";
      if (newFile) newQuotationBase64 = await toBase64(newFile);

      const res = await fetch(`${API}/resolve-query.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId:        request.id,
          piEmail:          PI_EMAIL,
          purpose:          form.purpose,
          description:      form.description,
          material:         form.material,
          expenditure:      form.expenditure,
          mode:             form.mode,
          invoiceNumber:    form.invoiceNumber,
          piResponse:       form.piResponse,
          newQuotation:     newQuotationBase64,
          newQuotationName: newFile?.name || "",
          // ✅ Always send the EXISTING file number — never a new one
          newFileNumber:    request.fileNumber || "",
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      toast.success(
        newFile
          ? `Query resolved! New file uploaded with existing file number: ${request.fileNumber}`
          : "Query resolved! The reviewer has been notified."
      );
      navigate("/pi");
    } catch (e: any) {
      toast.error(e.message || "Submission failed");
    } finally { setSubmitting(false); }
  };

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center min-h-screen gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        <p className="text-slate-500 text-sm">Loading request…</p>
      </div>
    </Layout>
  );
  if (!request) return null;

  const q = request.latestQuery;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        <button onClick={() => navigate("/pi")} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>

        <div>
          <h1 className="text-xl font-bold text-slate-900">Respond to Query</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {request.fileNumber && <><strong>File No:</strong> {request.fileNumber} &nbsp;·&nbsp;</>}
            <strong>GP:</strong> {request.gpNumber}
          </p>
        </div>

        {/* Query banner */}
        {q && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900 mb-2">
                  Query raised by <strong>{q.raisedByLabel || q.raisedBy}</strong>
                  {q.raisedAt && <span className="ml-2 text-xs font-normal text-amber-600">on {fmtDate(q.raisedAt)}</span>}
                </p>
                <div className="bg-amber-100 border border-amber-200 rounded-lg px-4 py-3">
                  <p className="text-sm text-amber-800 italic">"{q.query}"</p>
                </div>
                <p className="text-xs text-amber-600 mt-2">
                  Review your original submission, edit if needed, optionally re-upload the quotation, and submit your response.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm">
          {[
            ["Project", request.projectTitle],
            ["Head",    request.headName],
            ["Amount",  `₹${(request.amount / 100000).toFixed(2)}L`],
            ["Dept.",   request.department],
          ].map(([l, v]) => (
            <div key={l}><p className="text-xs text-slate-500 mb-0.5">{l}</p><p className="font-semibold text-slate-800">{v}</p></div>
          ))}
        </div>

        {/* Quotation file section */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3 pt-4 px-5 bg-slate-50 border-b border-slate-200">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" /> Quotation File
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              View your original file or upload a revised one if the reviewer asked you to.
              The <strong>same file number ({request.fileNumber || "existing"})</strong> will be retained on the approval certificate.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 py-4 space-y-4">

            {/* Original file row */}
            <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
              <div className="flex items-center gap-2.5">
                <FileText className="h-4 w-4 text-slate-500 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-700">Current Quotation</p>
                  <p className="text-xs text-slate-400">{request.quotationFileName || "Quotation.pdf"}</p>
                  {request.fileNumber && (
                    <p className="text-xs text-blue-600 font-mono mt-0.5">File No: {request.fileNumber}</p>
                  )}
                </div>
              </div>
              <Button type="button" size="sm" variant="outline"
                onClick={handleViewFile}
                className="h-8 text-xs border-blue-300 text-blue-700 hover:bg-blue-50 gap-1.5">
                <Eye className="h-3.5 w-3.5" /> View
              </Button>
            </div>

            {/* Inline PDF viewer */}
            {showPdfViewer && pdfUrl && (
              <div className="border border-slate-300 rounded-xl overflow-hidden shadow-md">
                <div className="flex items-center justify-between px-4 py-2 bg-slate-100 border-b border-slate-200">
                  <p className="text-xs font-semibold text-slate-700">📄 Quotation Preview</p>
                  <div className="flex items-center gap-3">
                    <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" /> New tab
                    </a>
                    <button type="button" onClick={() => setShowPdf(false)}
                      className="text-xs text-slate-500 hover:text-slate-800">✕ Close</button>
                  </div>
                </div>
                <iframe src={pdfUrl} className="w-full" style={{ height: "480px" }} title="Quotation" />
              </div>
            )}

            {/* Re-upload section */}
            <div className="border border-dashed border-slate-300 rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <Upload className="h-3.5 w-3.5" /> Re-upload Quotation (optional)
              </p>
              <p className="text-xs text-slate-400">
                If the reviewer asked you to revise the quotation, upload the new file here.
                The existing file number <span className="font-mono font-semibold text-blue-700">{request.fileNumber}</span> will
                be kept — the approval certificate will not change its reference.
              </p>

              {!newFile ? (
                <label className="flex items-center gap-2 w-fit cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors">
                    <Upload className="h-3.5 w-3.5" /> Choose New File
                  </div>
                  <input type="file" accept=".pdf" className="hidden" onChange={handleNewFileChange} />
                  <span className="text-xs text-slate-400">PDF only, max 10 MB</span>
                </label>
              ) : (
                <div className="space-y-2">
                  {/* Selected file chip */}
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2.5">
                      <FileText className="h-4 w-4 text-green-600 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-green-800">{newFile.name}</p>
                        <p className="text-xs text-green-500">{(newFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button type="button" onClick={removeNewFile}
                      className="text-xs text-rose-500 hover:text-rose-700 font-medium">Remove</button>
                  </div>

                  {/* File number notice — shows existing number, read-only */}
                  {request.fileNumber && (
                    <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                      <div>
                        <p className="text-xs text-blue-600 font-medium">File number retained (no change)</p>
                        <p className="text-sm font-bold text-blue-900 font-mono">{request.fileNumber}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Editable form fields */}
        <form onSubmit={handleSubmit}>
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50 border-b border-slate-200">
              <CardTitle className="text-base">Review & Update Your Request</CardTitle>
              <CardDescription className="flex items-center gap-1.5 mt-1 text-xs">
                <Lock className="h-3 w-3" /> Fields locked by default. Click <Pencil className="inline h-3 w-3 mx-0.5" /> Edit to modify.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">

              {FIELDS.map(f => (
                <div key={f.key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">{f.label}</Label>
                    <button type="button"
                      onClick={() => setEditing(p => ({ ...p, [f.key]: !p[f.key] }))}
                      className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border transition-all ${
                        editing[f.key]
                          ? "border-blue-400 bg-blue-50 text-blue-700"
                          : "border-slate-300 bg-white text-slate-500 hover:border-slate-400"
                      }`}>
                      {editing[f.key]
                        ? <><CheckCircle className="h-3 w-3" /> Editing</>
                        : <><Pencil className="h-3 w-3" /> Edit</>}
                    </button>
                  </div>
                  <div className="relative">
                    {f.type === "input" ? (
                      <Input value={form[f.key]}
                        onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                        disabled={!editing[f.key]}
                        className={`h-10 border-2 transition-colors ${
                          editing[f.key] ? "border-blue-400 bg-white" : "border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                        }`}
                      />
                    ) : (
                      <Textarea value={form[f.key]}
                        onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                        disabled={!editing[f.key]} rows={f.rows || 3}
                        className={`resize-none border-2 transition-colors ${
                          editing[f.key] ? "border-blue-400 bg-white" : "border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                        }`}
                      />
                    )}
                    {!editing[f.key] && (
                      <Lock className="absolute right-3 top-3 h-3.5 w-3.5 text-slate-300 pointer-events-none" />
                    )}
                  </div>
                </div>
              ))}

              {/* PI Response */}
              <div className="border-t border-slate-200 pt-5 space-y-1.5">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                  <Label className="text-sm font-semibold text-blue-700">
                    Your Response to the Query <span className="text-red-500">*</span>
                  </Label>
                </div>
                <Textarea
                  value={form.piResponse}
                  onChange={e => setForm(p => ({ ...p, piResponse: e.target.value }))}
                  placeholder={`Explain how you've addressed the query raised by ${q?.raisedByLabel || "the reviewer"}…`}
                  rows={5} className="border-2 border-blue-300 focus:border-blue-500 resize-none" required
                />
                <p className="text-xs text-slate-400">
                  Required. Visible to {q?.raisedByLabel || "the reviewer"} who raised the query.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <Button type="submit" disabled={submitting || !form.piResponse.trim()}
                  className="flex-1 bg-blue-700 hover:bg-blue-800 h-11">
                  {submitting
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting…</>
                    : <><Send className="h-4 w-4 mr-2" />Submit Response & Resolve Query</>}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate("/pi")}
                  disabled={submitting} className="h-11 px-8 border-2">Cancel</Button>
              </div>

            </CardContent>
          </Card>
        </form>
      </div>
    </Layout>
  );
};

export default QueryResponsePage;
