// pages/approvals/ApprovalCertificate.tsx
// Route: /approval-certificate/:requestId
// Renders the official "Admn cum Financial Approval Under MEITY Project" form
// Accessible by: drc_rc, director (and admin)
// Matches exactly the format in the uploaded image

import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, Printer, ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const API = import.meta.env.VITE_API_URL;

interface CertificateData {
  requestId: string; requestNumber: string; fileNumber: string; approvedDate: string;
  projectTitle: string; projectType: string; gpNumber: string;
  piName: string; piEmail: string; department: string;
  projectEndDate: string;
  totalSanctionedAmount: number; totalReleasedAmount: number;
  material: string; headName: string; headType: string;
  amount: number; amountWords: string;
  expenditure: string; mode: string;
  purpose: string; description: string;
  invoiceNumber: string;
  daRemarks: string; arRemarks: string; drRemarks: string;
}

const fmtINR = (n: number) =>
  "₹" + parseFloat(String(n || 0)).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const ApprovalCertificate = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [data,    setData]    = useState<CertificateData | null>(null);

  useEffect(() => { if (requestId) load(); }, [requestId]);

  const load = async () => {
    try {
      setLoading(true);
      const res  = await fetch(`${API}/get-approval-certificate.php?requestId=${requestId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setData(json.data);
    } catch (e: any) {
      toast.error(e.message || "Failed to load certificate");
      navigate(-1);
    } finally { setLoading(false); }
  };

  const handlePrint = () => window.print();

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 gap-3">
      <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
      <p className="text-gray-500 text-sm font-medium">Loading approval certificate…</p>
    </div>
  );

  if (!data) return null;

  // Row 7: build the availability text like in the image
  const availabilityText = data.expenditure
    || `Yes, as per IFMS Budget-ID/${data.requestNumber} dated ${data.approvedDate} under Head "${data.headName} (${data.headType})"`;

  // Row 8: mode of procurement
  const modeText = data.mode || "Through Direct Purchase on GeM portal under GFR 2017 rule (149-I).";

  // Special remarks from description
  const specialRemarks = data.description || data.purpose || "";

  return (
    <>
      {/* Screen controls — hidden on print */}
      <div className="no-print fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm px-6 py-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 font-medium">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex items-center gap-2">
          <p className="text-sm text-gray-500 mr-2">
            <span className="font-semibold text-gray-800">Approval Certificate</span>
            {data.fileNumber && <> &nbsp;·&nbsp; File: <span className="font-mono font-bold text-blue-700">{data.fileNumber}</span></>}
          </p>
          <Button size="sm" onClick={handlePrint} className="bg-blue-700 hover:bg-blue-800 h-8 gap-1.5">
            <Printer className="h-3.5 w-3.5" /> Print / Save PDF
          </Button>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; background: white; }
          .print-page { margin: 0 !important; padding: 10mm 12mm !important; box-shadow: none !important; border: none !important; }
        }
        @page { size: A4; margin: 10mm 12mm; }
      `}</style>

      {/* Certificate body */}
      <div className="bg-gray-100 min-h-screen pt-16 pb-12 no-print-bg">
        <div
          ref={printRef}
          className="print-page bg-white mx-auto shadow-lg"
          style={{ width: "210mm", minHeight: "297mm", padding: "14mm 14mm 10mm 14mm", fontFamily: "Times New Roman, serif", fontSize: "12pt" }}
        >
          {/* ── Header ── */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[11pt]">Sub: Admn cum Financial Approval</p>
            </div>
            <div className="text-right">
              <p className="text-[11pt] font-bold">Under MEITY Project</p>
            </div>
          </div>

          {/* File number + date line */}
          <div className="flex justify-between mb-3 text-[10pt]">
            {data.fileNumber && <p>File No.: <span className="font-semibold">{data.fileNumber}</span></p>}
            {data.approvedDate && <p>Date: <span className="font-semibold">{data.approvedDate}</span></p>}
          </div>

          {/* ── Main table ── */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11pt" }}>
            <tbody>

              {/* Row 1 — Name of Project */}
              <TableRow num="1." label="Name of the Project" value={
                <span>{data.projectTitle}{data.gpNumber && <> &nbsp;(<span className="font-semibold">{data.gpNumber}</span>)</>}</span>
              } />

              {/* Row 2 — Name of Indentor & Department */}
              <TableRow num="2." label="Name of Indentor & Department" value={
                <span>{data.piName}{data.department && <>, {data.department}</>}</span>
              } />

              {/* Row 3 — Completion Date */}
              <TableRow num="3." label="Completion Date of Project" value={data.projectEndDate || "—"} />

              {/* Row 4 — Total cost */}
              <TableRow num="4." label="Total cost of the Project" value={
                data.totalSanctionedAmount > 0
                  ? <span>{fmtINR(data.totalSanctionedAmount)} (Sanctioned) &nbsp;/&nbsp; {fmtINR(data.totalReleasedAmount)} (Released)</span>
                  : "—"
              } />

              {/* Row 5 — Material */}
              <TableRow num="5." label={<span>Name of the Material to be<br />Purchased &amp; Qty.</span>} value={data.material || data.purpose || "—"} />

              {/* Row 6 — Total amount estimated */}
              <TableRow num="6." label={<span>Total Amount (Estimated)<br />involved in Purchase</span>} value={
                <span><strong>{fmtINR(data.amount)}</strong>{data.amountWords && <> &nbsp;({data.amountWords})</>}</span>
              } />

              {/* Row 7 — Availability of funds */}
              <TableRow num="7." label={<span>Availability of Funds &amp; Head to<br />which Expenditure Debitable</span>} value={availabilityText} />

              {/* Row 8 — Mode of procurement */}
              <TableRow num="8." label="Mode of Procurement" value={modeText} />

              {/* Row 9 — Special remarks */}
              <tr>
                <td style={tdNumStyle}>9.</td>
                <td style={tdLabelStyle}>Special Remarks:</td>
                <td style={{ ...tdValueStyle, padding: "6px 8px" }}>
                  {specialRemarks ? (
                    <ul style={{ margin: 0, paddingLeft: "16px", listStyle: "disc" }}>
                      <li>{specialRemarks}</li>
                      {data.invoiceNumber && (
                        <li>Invoice / Bill No.: <strong>{data.invoiceNumber}</strong></li>
                      )}
                      {data.daRemarks && (
                        <li>DA: {data.daRemarks}</li>
                      )}
                    </ul>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: "16px", listStyle: "disc" }}>
                      <li>The GeM quotations and price reasonability certificates duly signed by the principal investigator are available at (CP-5 to 12).</li>
                      {data.invoiceNumber && <li>Invoice No.: <strong>{data.invoiceNumber}</strong></li>}
                    </ul>
                  )}
                </td>
              </tr>

            </tbody>
          </table>

          {/* ── Detail of Expenditure section ── */}
          <div style={{ marginTop: "18px" }}>
            <p style={{ fontSize: "11pt", marginBottom: "6px" }}>
              <strong>Detail of Expenditure:</strong>{" "}
              {modeText.toLowerCase().includes("gem") ? "Through GeM portal (As per GeM policy supplier name is un-identified)" : ""}
            </p>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11pt" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Sr.No.</th>
                  <th style={thStyle}>Description</th>
                  <th style={thStyle}>Qty.</th>
                  <th style={thStyle}>Rate (In Rs.)</th>
                  <th style={thStyle}>Amount (In Rs.)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={tdCenterStyle}>1.</td>
                  <td style={{ ...tdBorderStyle, padding: "8px" }}>
                    <p style={{ margin: 0, fontStyle: "italic", fontSize: "10pt" }}>
                      (Strictly as per specifications mentioned in the offer)
                    </p>
                    {data.material && <p style={{ margin: "4px 0 0", fontSize: "11pt" }}>{data.material}</p>}
                  </td>
                  <td style={tdCenterStyle}></td>
                  <td style={tdCenterStyle}></td>
                  <td style={{ ...tdCenterStyle, fontWeight: "bold" }}>
                    {data.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr>
                  <td style={tdCenterStyle} colSpan={3}></td>
                  <td style={{ ...tdCenterStyle, fontWeight: "bold" }}>Total:</td>
                  <td style={{ ...tdCenterStyle, fontWeight: "bold" }}>
                    {data.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr>
                  <td colSpan={5} style={{ ...tdBorderStyle, textAlign: "center", padding: "6px", fontStyle: "italic" }}>
                    ({data.amountWords})
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── Signature section ── */}
          <div style={{ marginTop: "32px", display: "flex", justifyContent: "space-between", fontSize: "11pt" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ borderTop: "1px solid black", width: "160px", marginTop: "40px", paddingTop: "4px" }}>
                <p style={{ margin: 0 }}>Principal Investigator</p>
                <p style={{ margin: "2px 0 0", fontSize: "10pt" }}>{data.piName}</p>
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ borderTop: "1px solid black", width: "160px", marginTop: "40px", paddingTop: "4px" }}>
                <p style={{ margin: 0 }}>Dealing Assistant</p>
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ borderTop: "1px solid black", width: "160px", marginTop: "40px", paddingTop: "4px" }}>
                <p style={{ margin: 0 }}>Director</p>
                {data.approvedDate && <p style={{ margin: "2px 0 0", fontSize: "10pt" }}>Dt: {data.approvedDate}</p>}
              </div>
            </div>
          </div>

          {/* Approval stamp */}
          <div style={{ marginTop: "24px", borderTop: "2px solid black", paddingTop: "8px", textAlign: "center", fontSize: "10pt", color: "#555" }}>
            <p style={{ margin: 0 }}>
              This is a system-generated approval certificate from IFMS Portal.
              {data.requestNumber && <> &nbsp;|&nbsp; Request No.: <strong>{data.requestNumber}</strong></>}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const borderStyle = "1px solid black";

const tdNumStyle: React.CSSProperties = {
  border: borderStyle, padding: "6px 8px", width: "32px",
  verticalAlign: "top", textAlign: "center", fontWeight: "bold",
};
const tdLabelStyle: React.CSSProperties = {
  border: borderStyle, padding: "6px 8px", width: "220px",
  verticalAlign: "top",
};
const tdValueStyle: React.CSSProperties = {
  border: borderStyle, padding: "6px 8px",
  verticalAlign: "top",
};
const thStyle: React.CSSProperties = {
  border: borderStyle, padding: "6px 8px", backgroundColor: "#f0f0f0",
  textAlign: "center", fontWeight: "bold",
};
const tdBorderStyle: React.CSSProperties = {
  border: borderStyle, verticalAlign: "top",
};
const tdCenterStyle: React.CSSProperties = {
  border: borderStyle, padding: "6px 8px",
  textAlign: "center", verticalAlign: "middle",
};

// ── Table row helper ──────────────────────────────────────────────────────────
const TableRow = ({
  num, label, value,
}: {
  num: string;
  label: React.ReactNode;
  value: React.ReactNode;
}) => (
  <tr>
    <td style={tdNumStyle}>{num}</td>
    <td style={tdLabelStyle}>{label}</td>
    <td style={tdValueStyle}>{value}</td>
  </tr>
);

export default ApprovalCertificate;
