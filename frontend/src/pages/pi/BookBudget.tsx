import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import {
  Send, Wallet, FileText, Receipt, DollarSign,
  TrendingUp, CheckCircle, Loader2, AlertCircle, Info,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Head {
  id: string;
  headId: string;
  headName: string;
  headType: string;
  sanctionedAmount: number;
  releasedAmount: number;
  bookedAmount: number;
  availableBalance: number;
}

interface Project {
  id: string;
  gpNumber: string;
  projectName: string;
  modeOfProject: string;
  piName: string;
  piEmail: string;
  department: string;
  material: string;
  expenditure: string;
  mode: string;
  totalSanctionedAmount: number;
  totalReleasedAmount: number;
  amountBookedByPI: number;
  availableBalance: number;
  actualExpenditure: number;
  status: string;
  heads: Head[];
}

// ── Auth — replace with your actual auth hook ──────────────────────────────────
// const { user } = useAuth();
const PI_EMAIL = "pi@ifms.edu";   // ← replace with auth context
const PI_NAME  = "Dr. John Smith"; // ← replace with auth context

const fmt = (n: number) => `₹${parseFloat(String(n || 0)).toLocaleString("en-IN")}`;
const fmtINR = (n: number) => parseFloat(String(n || 0)).toLocaleString("en-IN");

// ═══════════════════════════════════════════════════════════════════════════════
const BookBudget = () => {
  const navigate = useNavigate();

  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [projects,    setProjects]    = useState<Project[]>([]);
  const [selectedId,  setSelectedId]  = useState("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedHead,    setSelectedHead]     = useState<Head | null>(null);
const [quotation, setQuotation] = useState<File | null>(null);
  const [form, setForm] = useState({
    headId:       "",
    amount:       "",
    purpose:      "",
    description:  "",
    material: "",
    expenditure: "",
    mode: "",
    invoiceNumber:"",
  });
const [fileNumber, setFileNumber] = useState("");
  useEffect(() => { fetchProjects(); }, []);

  
  
const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files && e.target.files[0]) {
    const file = e.target.files[0];

    if (file.type !== "application/pdf") {
      toast.error("Only PDF files allowed");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be less than 10MB");
      return;
    }

    setQuotation(file);
  
};


};
  // Update selectedProject whenever selectedId or projects changes
  useEffect(() => {
    const p = projects.find(p => p.id === selectedId) ?? null;
    setSelectedProject(p);
    setSelectedHead(null);
    setForm(f => ({ ...f, headId: "", amount: "" }));
  }, [selectedId, projects]);

  useEffect(() => {
  const p = projects.find(p => p.id === selectedId) ?? null;
  setSelectedProject(p);
  setSelectedHead(null);
  setForm(f => ({ ...f, headId: "", amount: "" }));

  if (p) generateFileNumber(p.gpNumber);
}, [selectedId, projects]);

const generateFileNumber = async (gpNumber: string) => {
  try {
    const res = await fetch(`https://ifms-backend-nitj.onrender.com/api/get-next-file-num.php?gpNumber=${gpNumber}`);
    const data = await res.json();

    if (!data.success) throw new Error(data.message);

    setFileNumber(data.fileNumber); // e.g., GP-001/FILE-03
  } catch (e: any) {
    toast.error("Failed to generate file number: " + e.message);
  }
};
  // Update selectedHead when headId changes
  useEffect(() => {
    if (!selectedProject || !form.headId) { setSelectedHead(null); return; }
    const h = selectedProject.heads.find(h => h.id === form.headId) ?? null;
    setSelectedHead(h);
  }, [form.headId, selectedProject]);
const toBase64 = (file: File) => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res  = await fetch(`https://ifms-backend-nitj.onrender.com/api/get-pi-projects.php?piEmail=${PI_EMAIL}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      // Only projects with released funds are returned by the backend
      setProjects(data.data || []);
    } catch (e: any) {
      toast.error("Failed to load projects: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSelect = (name: string, value: string) => {
    setForm(f => ({ ...f, [name]: value }));
  };

  // Heads that have available balance
  const availableHeads = selectedProject?.heads.filter(h => h.availableBalance > 0) ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProject)    { toast.error("Please select a project"); return; }
    if (!form.headId)        { toast.error("Please select a project head"); return; }
    if (!form.purpose.trim()){ toast.error("Please enter the purpose"); return; }
    if (!form.description.trim()) { toast.error("Please enter a description"); return; }
    if (!form.invoiceNumber.trim()){ toast.error("Please enter invoice number"); return; }

    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) { toast.error("Please enter a valid amount"); return; }

    if (!selectedHead) { toast.error("Selected head not found"); return; }
    if (amount > selectedHead.availableBalance) {
      toast.error(
        `Amount exceeds available balance for "${selectedHead.headName}". ` +
        `Available: ₹${fmtINR(selectedHead.availableBalance)}`
      );
      return;
    }
    if (amount > selectedProject.availableBalance) {
      toast.error(
        `Amount exceeds project available balance. Available: ₹${fmtINR(selectedProject.availableBalance)}`
      );
      return;
    }

    try {
      setSubmitting(true);

      if (!quotation) {
  toast.error("Quotation file is required");
  return;
}

let base64File = "";
try {
  base64File = await toBase64(quotation);
} catch {
  toast.error("File conversion failed");
  return;
}

const payload = {
  projectId: selectedProject.id,
  gpNumber: selectedProject.gpNumber,
  fileNumber: fileNumber,
  projectTitle: selectedProject.projectName,
  projectType: selectedProject.modeOfProject,
  piName: PI_NAME,
  piEmail: PI_EMAIL,
  department: selectedProject.department ?? "",
  headId: form.headId,
  headName: selectedHead.headName,
  headType: selectedHead.headType,
  amount,
  purpose: form.purpose,
  description: form.description,
  material: form.material,
  invoiceNumber: form.invoiceNumber,

  // ✅ FIXED
  quotation: base64File,
};
      const res  = await fetch(`${import.meta.env.VITE_API_URL}/create-budget-requests.php`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
        
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      toast.success(
        `Budget request submitted! Request #${data.data.requestNumber}. ` +
        `Awaiting DA approval.`
      );
      navigate("/pi");

    } catch (e: any) {
      toast.error("Submission failed: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Loading your projects…</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-600 shadow-lg">
              <Wallet className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Book Budget</h1>
              <p className="text-gray-600 mt-1">
                Submit a budget booking request · DA → AR → DR approval chain
              </p>
            </div>
          </div>
        </div>

        {/* ── No projects message ── */}
        {projects.length === 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Projects with Released Funds
                </h3>
                <p className="text-gray-600 mb-4">
                  None of your projects have released funds yet.
                  Please wait for the admin to release funds.
                </p>
                <Button variant="outline" onClick={() => navigate("/pi")}>
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Form ── */}
        {projects.length > 0 && (
          <form onSubmit={handleSubmit}>
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-100">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold">Budget Booking Form</CardTitle>
                    <CardDescription>
                      Fill in the details — your request goes through DA → AR → DR approval
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 pt-6">

                {/* ── Project selection ── */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <span className="text-blue-600">⚡</span>
                    Select Project (GP Number) <span className="text-red-500">*</span>
                  </Label>
                  <Select value={selectedId} onValueChange={setSelectedId}>
                    <SelectTrigger className="border-2 h-12 hover:border-blue-500 transition-colors">
                      <SelectValue placeholder="Choose a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          <span className="font-semibold">{p.gpNumber}</span>
                          <span className="text-gray-500 ml-2">— {p.projectName}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
{fileNumber && (
  <div className="space-y-2">
    <Label className="text-sm font-semibold">
      File Number
    </Label>
    <Input
      value={fileNumber}
      readOnly
      className="border-2 h-12 bg-gray-100 font-semibold"
    />
  </div>
)}
                {/* ── Project-level balance card ── */}
                {selectedProject && (
                  <Card className="bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 border-2 border-blue-200 shadow-md">
                    <CardContent className="pt-5 pb-4">
                      <div className="grid gap-4 md:grid-cols-3">
                        <BalanceStat
                          icon={<DollarSign className="h-4 w-4 text-blue-600" />}
                          label="Released Amount"
                          value={fmt(selectedProject.totalReleasedAmount)}
                          color="text-blue-600"
                        />
                        <BalanceStat
                          icon={<Receipt className="h-4 w-4 text-amber-600" />}
                          label="Already Booked"
                          value={fmt(selectedProject.amountBookedByPI)}
                          color="text-amber-600"
                        />
                        <BalanceStat
                          icon={<TrendingUp className="h-4 w-4 text-green-600" />}
                          label="Available Balance"
                          value={fmt(selectedProject.availableBalance)}
                          color="text-green-600"
                          highlight
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* ── Head selection ── */}
                {selectedProject && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      Project Head <span className="text-red-500">*</span>
                    </Label>
                    {availableHeads.length === 0 ? (
                      <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        No heads with available balance in this project.
                      </div>
                    ) : (
                      <Select value={form.headId} onValueChange={v => handleSelect("headId", v)}>
                        <SelectTrigger className="border-2 h-12 hover:border-blue-500 transition-colors">
                          <SelectValue placeholder="Select head" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableHeads.map(h => (
                            <SelectItem key={h.id} value={h.id}>
                              <span className="font-medium">{h.headName}</span>
                              <span className="text-xs text-gray-500 ml-2">
                                ({h.headType}) — Available: ₹{fmtINR(h.availableBalance)}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                {/* ── Selected head detail card ── */}
                {selectedHead && (
                  <Card className="bg-blue-50 border border-blue-200">
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center gap-2 mb-3">
                        <Info className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-semibold text-blue-800">
                          {selectedHead.headName}
                        </span>
                        <Badge variant="outline" className={`text-xs ${
                          selectedHead.headType === "recurring"
                            ? "bg-blue-100 text-blue-700 border-blue-300"
                            : "bg-gray-100 text-gray-700 border-gray-300"
                        }`}>
                          {selectedHead.headType}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 font-medium">Sanctioned</p>
                          <p className="text-lg font-bold text-gray-900">₹{fmtINR(selectedHead.sanctionedAmount)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 font-medium">Released</p>
                          <p className="text-lg font-bold text-blue-700">₹{fmtINR(selectedHead.releasedAmount)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 font-medium">Available to Book</p>
                          <p className="text-lg font-bold text-green-700">₹{fmtINR(selectedHead.availableBalance)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* ── Amount ── */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    Amount (₹) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    name="amount"
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={handleInput}
                    placeholder={selectedHead ? `Max: ₹${fmtINR(selectedHead.availableBalance)}` : "Enter amount"}
                    className="border-2 h-12 hover:border-green-500 focus:border-green-500 text-lg font-semibold"
                    required
                  />
                  {selectedHead && form.amount && parseFloat(form.amount) > selectedHead.availableBalance && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Exceeds available balance of ₹{fmtINR(selectedHead.availableBalance)}
                    </p>
                  )}
                </div>

                {/* ── Purpose ── */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    Purpose <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    name="purpose"
                    value={form.purpose}
                    onChange={handleInput}
                    placeholder="Brief purpose of expenditure"
                    className="border-2 h-12 hover:border-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                {/* ── Description ── */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    Detailed Description <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    name="description"
                    value={form.description}
                    onChange={handleInput}
                    placeholder="Provide detailed justification for the budget request"
                    rows={4}
                    className="border-2 hover:border-blue-500 focus:border-blue-500 resize-none"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    Name of material to be purchased and Qty. <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    name="material"
                    value={form.material}
                    onChange={handleInput}
                    placeholder="Material to be purchased and Qty. "
                    rows={4}
                    className="border-2 hover:border-blue-500 focus:border-blue-500 resize-none"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    Availability of Funds and head to which expenditure debitable <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    name="expenditure"
                    value={form.expenditure}
                    onChange={handleInput}
                    placeholder="Availability of Funds and head to which expenditure debitable"
                    rows={4}
                    className="border-2 hover:border-blue-500 focus:border-blue-500 resize-none"
                    required
                  />
                </div>
<div className="space-y-2">
                  <Label className="text-sm font-semibold">
                  Mode of Procurement <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    name="mode"
                    value={form.mode}
                    onChange={handleInput}
                    placeholder="Mode of Procurement"
                    rows={4}
                    className="border-2 hover:border-blue-500 focus:border-blue-500 resize-none"
                    required
                  />
                </div>
                {/* ── Invoice number ── */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-purple-600" />
                    Invoice / Bill Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    name="invoiceNumber"
                    value={form.invoiceNumber}
                    onChange={handleInput}
                    placeholder="INV-2025-001"
                    className="border-2 h-12 hover:border-purple-500 focus:border-purple-500"
                    required
                  />
                </div>
{/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="sanctionedLetterFile" className="text-sm font-medium text-gray-700">
                  Upload Quotation (PDF only) <span className="text-red-500">*</span>
                </Label>
                <div className="flex items-center gap-4">
                  <label
                    htmlFor="sanctionedLetterFile"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md cursor-pointer transition-colors duration-200 font-medium shadow-sm"
                  >
                    <Upload className="h-4 w-4" />
                    Choose File
                  </label>
                  <input
                    id="sanctionedLetterFile"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {quotation? (
                    <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-md border border-green-200">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium">{quotation.name}</span>
                      <span className="text-gray-500">({quotation.size})</span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">No file chosen</span>
                  )}
                </div>
                <p className="text-xs text-gray-500">Maximum file size: 10MB</p>
              </div>
                {/* ── Approval chain notice ── */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5 text-slate-500" />
                    Approval Chain
                  </p>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">You (PI)</span>
                    <span>→</span>
                    <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-medium">DA</span>
                    <span>→</span>
                    <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-medium">AR</span>
                    <span>→</span>
                    <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-medium">Director</span>
                    <span>→</span>
                    <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-medium">✅ Approved</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">
                    After final DR approval, the DA will record actual expenditure on receipt of hard copy.
                  </p>
                </div>

                {/* ── Buttons ── */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <Button
                    type="submit"
                    disabled={submitting || !selectedProject || availableHeads.length === 0}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 h-12 text-base font-semibold shadow-lg"
                  >
                    {submitting ? (
                      <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Submitting…</>
                    ) : (
                      <><Send className="h-5 w-5 mr-2" />Submit for Approval</>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/pi")}
                    className="h-12 px-8 border-2 hover:border-red-400 hover:text-red-600"
                  >
                    Cancel
                  </Button>
                </div>

              </CardContent>
            </Card>
          </form>
        )}
      </div>
    </Layout>
  );
};

// ─── Small helper component ───────────────────────────────────────────────────
const BalanceStat = ({
  icon, label, value, color, highlight,
}: { icon: React.ReactNode; label: string; value: string; color: string; highlight?: boolean }) => (
  <div className="space-y-1">
    <div className="flex items-center gap-2 text-gray-600">
      {icon}
      <p className="font-semibold text-sm">{label}</p>
    </div>
    <p className={`text-3xl font-bold ${color} ${highlight ? "animate-pulse" : ""}`}>{value}</p>
  </div>
);

export default BookBudget;
