/**
 * ProjectReportWindow.jsx  v2
 * Full institutional project report with:
 *  - Correct fund release history (from fund_releases collection)
 *  - Per-release booking sections
 *  - effectiveAmount logic (actual if DA filled, else booked)
 *  - Actual expenditure per row with timestamp when DA entered it
 *  - Available balance = Released âˆ’ Effective Booked
 */

const INR = (n) =>
  "Rs. " + parseFloat(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });

const statusLabel = (s) => ({
  pending:     "Pending",
  active:      "Active",
  completed:   "Completed",
  rejected:    "Rejected",
  approved:    "Approved",
  da_approved: "DA Approved",
  ar_approved: "AR Approved",
  sanctioned:  "Sanctioned",
  released:    "Released",
}[s?.toLowerCase()] || s || "â€”");

const stageName = (s) => ({
  pi:    "Principal Investigator",
  da:    "Dealing Assistant",
  ar:    "Assistant Registrar",
  dr:    "Deputy Registrar",
  admin: "Administrator",
}[s?.toLowerCase()] || s || "â€”");

const buildReportHTML = (data) => {
  const { project: p, allocations, releaseHistory, releaseGroups, budgetRequests, extensions, summary } = data;

  const esc = (s) => String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const amt = (n) => INR(n);
  const pct = (v, m) => m > 0 ? ((v / m) * 100).toFixed(1) + "%" : "0%";

  const th = (txt, right = false) =>
    `<th style="padding:8px 11px;text-align:${right?"right":"left"};font-size:10px;font-weight:700;
    text-transform:uppercase;letter-spacing:.5px;color:#fff;background:#1a3a5c;
    border:1px solid #1a3a5c;">${esc(txt)}</th>`;

  const td = (txt, right = false, mono = false) =>
    `<td style="padding:7px 11px;font-size:12px;color:#1e293b;border:1px solid #dde3ea;
    ${right?"text-align:right;":""}${mono?"font-family:monospace;":""}">${txt}</td>`;

  const secHead = (num, title) => `
    <div style="margin:32px 0 12px;">
      <div style="display:flex;align-items:center;border-bottom:2px solid #1a3a5c;padding-bottom:7px;">
        <span style="background:#1a3a5c;color:#fff;font-size:11px;font-weight:700;
          padding:3px 10px;margin-right:12px;">${num}</span>
        <span style="font-size:14px;font-weight:700;color:#1a3a5c;">${title}</span>
      </div>
    </div>`;

  const irow = (label, value) => `
    <tr>
      <td style="padding:7px 13px;font-size:11.5px;font-weight:600;color:#374151;
        background:#f0f4f8;width:200px;border:1px solid #dde3ea;">${esc(label)}</td>
      <td style="padding:7px 13px;font-size:12px;color:#111827;border:1px solid #dde3ea;">${value}</td>
    </tr>`;

  const amtBox = (label, value, sub = "", highlight = false) => `
    <div style="border:1px solid #c8d5e3;border-top:3px solid ${highlight?"#166534":"#1a3a5c"};
      background:${highlight?"#f0fdf4":"#fff"};padding:12px 15px;min-width:140px;">
      <div style="font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;
        letter-spacing:.5px;margin-bottom:5px;">${esc(label)}</div>
      <div style="font-size:16px;font-weight:800;color:${highlight?"#166534":"#1a3a5c"};">${value}</div>
      ${sub ? `<div style="font-size:10px;color:#6b7280;margin-top:2px;">${esc(sub)}</div>` : ""}
    </div>`;

  /* â”€â”€ SECTION 2: Fund Release History â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const releaseHistoryHTML = (releases) => {
    if (!releases || releases.length === 0)
      return `<p style="font-size:12px;color:#6b7280;font-style:italic;">No fund releases recorded.</p>`;

    const rows = releases.map((r, i) => {
      const hwRows = (r.headwiseReleases || []).map(h => `
        <tr style="background:#f8fafc;">
          <td style="padding:5px 10px 5px 28px;font-size:11px;color:#374151;border:1px solid #e5e7eb;border-top:none;">
            &rsaquo;&nbsp;${esc(h.headName)}
            <span style="color:#6b7280;margin-left:6px;font-size:10px;">${esc(h.headType)}</span>
          </td>
          <td style="padding:5px 10px;font-size:11px;font-family:monospace;text-align:right;color:#374151;border:1px solid #e5e7eb;border-top:none;">
            ${amt(h.releaseAmount)}
          </td>
          <td style="padding:5px 10px;font-size:11px;font-family:monospace;text-align:right;color:#166534;border:1px solid #e5e7eb;border-top:none;">
            ${amt(h.newTotalReleased)}
          </td>
          <td colspan="4" style="border:1px solid #e5e7eb;border-top:none;"></td>
        </tr>`).join("");

      return `
        <tr style="background:${i%2===0?"#fff":"#f8fafc"};">
          ${td(String(i+1), true)}
          ${td(`<span style="font-family:monospace;font-weight:700;color:#1a3a5c;">${esc(r.releaseNumber||"â€”")}</span>`)}
          ${td(esc(r.letterNumber||"â€”"), false, true)}
          ${td(esc(r.letterDate||"â€”"))}
          ${td(amt(r.totalReleased), true)}
          ${td(esc(r.releasedBy||"â€”"))}
          ${td(esc(r.releasedAt||"â€”"))}
        </tr>
        ${hwRows}`;
    }).join("");

    return `
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead><tr>
          ${th("#",true)}${th("Release No.")}${th("Letter No.")}${th("Letter Date")}
          ${th("Amount Released",true)}${th("Released By")}${th("Date & Time")}
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr style="background:#1a3a5c;">
            <td colspan="4" style="padding:8px 11px;font-weight:700;font-size:11px;color:#fff;border:1px solid #1a3a5c;">TOTAL RELEASED</td>
            <td style="padding:8px 11px;font-weight:700;font-size:12px;color:#fff;text-align:right;border:1px solid #1a3a5c;font-family:monospace;">${amt(summary.totalReleased)}</td>
            <td colspan="2" style="border:1px solid #1a3a5c;"></td>
          </tr>
        </tfoot>
      </table>`;
  };

  /* â”€â”€ SECTION 4: Per-release booking groups â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const releaseGroupsHTML = (groups) => {
    if (!groups || groups.length === 0)
      return `<p style="font-size:12px;color:#6b7280;font-style:italic;">No approved bookings found.</p>`;

    return groups.map((grp, gi) => {
      const headsHTML = grp.heads.map((head) => {
        const reqRows = (head.requests || []).map((req, ri) => `
          <tr style="background:${req.expenditureFilled?"#f0fdf4":ri%2===0?"#fff":"#f8fafc"};">
            ${td(String(ri+1),true)}
            ${td(`<span style="font-family:monospace;font-weight:600;color:#1a3a5c;">${esc(req.requestNumber||"â€”")}</span>`)}
            ${td(esc(req.purpose||"â€”"))}
            ${td(esc(req.invoiceNumber||"â€”"),false,true)}
            ${td(amt(req.amount),true)}
            ${td(req.expenditureFilled
              ? `<strong style="color:#166534;">${amt(req.actualExpenditure)}</strong>`
              : `<em style="color:#92400e;">Pending DA</em>`, true)}
            ${td(req.expenditureFilled ? esc(req.actualEnteredAt||"â€”") : "â€”")}
            ${td(esc(req.createdAt||"â€”"))}
          </tr>`).join("");

        const headBooked = (head.requests||[]).reduce((s,r) => s + r.effectiveAmount, 0);
        const headActual = (head.requests||[]).reduce((s,r) => s + r.actualExpenditure, 0);

        return `
          <div style="margin-bottom:16px;border:1px solid #c8d5e3;">
            <div style="background:#334155;color:#fff;padding:9px 14px;display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:13px;font-weight:700;">${esc(head.headName)}
                <span style="font-size:10px;opacity:.7;margin-left:8px;">${esc(head.headType)}</span>
              </span>
              <span style="font-size:12px;">
                Booked: <strong>${amt(headBooked)}</strong>
                &nbsp;|&nbsp; Actual: <strong style="color:#86efac;">${amt(headActual)}</strong>
              </span>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:11.5px;">
              <thead><tr>
                ${th("#",true)}${th("Ref. No.")}${th("Purpose")}${th("Invoice")}
                ${th("Booked",true)}${th("Actual Exp.",true)}${th("Actual Entered On")}${th("Requested On")}
              </tr></thead>
              <tbody>${reqRows}</tbody>
            </table>
          </div>`;
      }).join("");

      return `
        <div style="margin-bottom:24px;border:1px solid #93c5fd;border-radius:4px;overflow:hidden;">
          <div style="background:#1e3a5f;color:#fff;padding:11px 16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
            <div>
              <span style="font-size:14px;font-weight:800;">Release ${gi+1} â€” ${esc(grp.releaseNumber)}</span>
              ${grp.letterDate ? `<span style="font-size:11px;opacity:.7;margin-left:10px;">Letter Date: ${esc(grp.letterDate)}</span>` : ""}
              ${grp.letterNumber ? `<span style="font-size:11px;opacity:.7;margin-left:8px;">Ref: ${esc(grp.letterNumber)}</span>` : ""}
            </div>
            <div style="display:flex;gap:20px;">
              ${[
                ["Released",   grp.totalReleased,      "#93c5fd"],
                ["Booked",     grp.totalBooked,        "#fff"],
                ["Actual",     grp.totalActual,        "#86efac"],
                ["Remaining",  grp.remainingInRelease, grp.remainingInRelease<=0?"#94a3b8":"#fde68a"],
              ].map(([l,v,c]) => `
                <div style="text-align:right;">
                  <div style="font-size:9px;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8;">${esc(l)}</div>
                  <div style="font-size:13px;font-weight:800;color:${c};font-family:monospace;">${amt(v)}</div>
                </div>`).join("")}
            </div>
          </div>
          <div style="padding:14px 16px;background:#f8fafc;">
            ${headsHTML}
          </div>
        </div>`;
    }).join("");
  };

  /* â”€â”€ SECTION 5: Head-wise summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const headSection = (alloc, hIdx) => {
    const relRows = (alloc.releases||[]).map((r,i) => `
      <tr style="background:${i%2===0?"#fff":"#f8fafc"};">
        ${td(String(i+1),true)}
        ${td(`<span style="font-family:monospace;">${esc(r.releaseNumber||"â€”")}</span>`)}
        ${td(esc(r.letterNumber||"â€”"),false,true)}
        ${td(amt(r.amountReleased),true)}
        ${td(esc(r.newTotal!=null?amt(r.newTotal):"â€”"),true)}
        ${td(esc(r.releasedBy||"â€”"))}
        ${td(esc(r.releasedAt||"â€”"))}
      </tr>`).join("");

    return `
      <div style="border:1px solid #c8d5e3;margin-bottom:20px;background:#fff;">
        <div style="background:#1a3a5c;color:#fff;padding:11px 16px;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <span style="font-size:15px;font-weight:700;">${esc(alloc.headName)}</span>
            <span style="font-size:10px;margin-left:10px;opacity:.7;text-transform:uppercase;">${esc(alloc.headType)}</span>
          </div>
          <div style="text-align:right;">
            <div style="font-size:16px;font-weight:800;">${amt(alloc.sanctionedAmount)}</div>
            <div style="font-size:9px;opacity:.7;text-transform:uppercase;">Sanctioned</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid #dde3ea;">
          ${[
            ["Sanctioned",      alloc.sanctionedAmount,                 "#1a3a5c"],
            ["Released to Head",alloc.releasedAmount,                   "#166534"],
            ["Booked (Effective)",alloc.bookedAmount,                   "#1e40af"],
            ["Actual (DA)",     alloc.actualExpenditure,                "#6b21a8"],
          ].map(([l,v,c]) => `
            <div style="padding:11px 14px;border-right:1px solid #e5e7eb;">
              <div style="font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.4px;margin-bottom:3px;">${esc(l)}</div>
              <div style="font-size:14px;font-weight:800;color:${c};font-family:monospace;">${amt(v)}</div>
            </div>`).join("")}
        </div>

        <div style="padding:13px 16px;border-bottom:1px solid #dde3ea;">
          <div style="font-size:11px;font-weight:700;color:#1a3a5c;text-transform:uppercase;letter-spacing:.4px;margin-bottom:9px;">
            Fund Releases for this Head (${(alloc.releases||[]).length})
          </div>
          ${(alloc.releases||[]).length === 0
            ? `<p style="font-size:11px;color:#6b7280;font-style:italic;margin:0;">No releases recorded.</p>`
            : `<table style="width:100%;border-collapse:collapse;font-size:11.5px;">
                <thead><tr>
                  ${th("#",true)}${th("Release No.")}${th("Letter Ref.")}
                  ${th("Amount Released",true)}${th("New Total",true)}${th("By")}${th("Date & Time")}
                </tr></thead>
                <tbody>${relRows}</tbody>
              </table>`}
        </div>

        <div style="padding:13px 16px;">
          <div style="font-size:11px;font-weight:700;color:#1a3a5c;text-transform:uppercase;letter-spacing:.4px;margin-bottom:9px;">
            Budget Requests (${(alloc.bookings||[]).length})
          </div>
          ${(alloc.bookings||[]).length === 0
            ? `<p style="font-size:11px;color:#6b7280;font-style:italic;margin:0;">No requests.</p>`
            : `<table style="width:100%;border-collapse:collapse;font-size:11px;">
                <thead><tr>
                  ${th("#",true)}${th("Ref. No.")}${th("Purpose")}${th("Invoice")}
                  ${th("Booked",true)}${th("Actual (DA)",true)}${th("DA Entered On")}${th("Status")}
                </tr></thead>
                <tbody>
                ${(alloc.bookings||[]).map((bk,i) => `
                  <tr style="background:${bk.expenditureFilled?"#f0fdf4":i%2===0?"#fff":"#f8fafc"};">
                    ${td(String(i+1),true)}
                    ${td(`<span style="font-family:monospace;font-weight:700;color:#1a3a5c;">${esc(bk.requestNumber)}</span>`)}
                    ${td(esc(bk.purpose||"â€”"))}
                    ${td(esc(bk.invoiceNumber||"â€”"),false,true)}
                    ${td(amt(bk.amount),true)}
                    ${td(bk.expenditureFilled
                      ? `<strong style="color:#166534;">${amt(bk.actualExpenditure)}</strong>`
                      : `<em style="color:#92400e;">Pending</em>`,true)}
                    ${td(esc(bk.actualEnteredAt||"â€”"))}
                    ${td(esc(statusLabel(bk.status)))}
                  </tr>`).join("")}
                </tbody>
              </table>`}
        </div>
      </div>`;
  };

  /* â”€â”€ EXTENSIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const extensionSection = (exts) => {
    if (exts.length === 0)
      return `<p style="font-size:12px;color:#6b7280;font-style:italic;">No extensions granted.</p>`;
    return `
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead><tr>
          ${th("#",true)}${th("Original End")}${th("Extended End")}${th("Period")}
          ${th("Extended By")}${th("Extended On")}${th("Remarks")}${th("Letter")}
        </tr></thead>
        <tbody>
        ${exts.map((e,i) => `
          <tr style="background:${i%2===0?"#fff":"#f8fafc"};">
            ${td(String(i+1),true)}
            ${td(`<span style="color:#92400e;font-weight:600;">${esc(e.originalEndDate||"â€”")}</span>`)}
            ${td(`<strong style="color:#166534;">${esc(e.extendedEndDate||"â€”")}</strong>`)}
            ${td(e.additionalYears>0?`<strong style="color:#1a3a5c;">${e.additionalYears} Yr(s)</strong>`:"â€”")}
            ${td(esc(e.extendedBy||"â€”"))}
            ${td(`<span style="font-family:monospace;font-size:11px;">${esc(e.extendedAt||"â€”")}</span>`)}
            ${td(e.remarks?`<em style="color:#374151;">${esc(e.remarks)}</em>`:`<span style="color:#9ca3af;">â€”</span>`)}
            ${td(e.hasPdf?`<span style="color:#166534;font-weight:700;">Yes</span><span style="display:block;font-size:10px;color:#6b7280;">${esc(e.pdfOriginalName)}</span>`:`<span style="color:#9ca3af;">No</span>`)}
          </tr>`).join("")}
        </tbody>
      </table>`;
  };

  /* â”€â”€ FULL PAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Report â€” ${esc(p.gpNumber)}</title>
<style>
* { box-sizing:border-box; margin:0; padding:0; }
body { font-family:Georgia,'Times New Roman',serif; background:#eef1f5; color:#111827; }
@media print { .no-print{display:none!important} body{background:#fff} .wrap{max-width:100%!important;box-shadow:none!important} }
</style>
</head>
<body>

<div class="no-print" style="position:sticky;top:0;z-index:100;background:#1a3a5c;
  padding:10px 24px;display:flex;align-items:center;gap:16px;box-shadow:0 2px 6px rgba(0,0,0,.25);">
  <div style="flex:1;min-width:0;">
    <div style="font-size:10px;color:#93c5fd;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Project Comprehensive Report</div>
    <div style="color:#fff;font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
      ${esc(p.gpNumber)} â€” ${esc(p.projectName)}
    </div>
  </div>
  <div style="display:flex;gap:8px;flex-shrink:0;">
    <button onclick="window.print()"
      style="padding:7px 16px;background:transparent;color:#e2e8f0;border:1px solid #475569;
      border-radius:4px;cursor:pointer;font-size:12px;font-weight:600;font-family:inherit;">Print</button>
    <button id="pdfBtn" onclick="downloadPDF()"
      style="padding:7px 18px;background:#fff;color:#1a3a5c;border:none;
      border-radius:4px;cursor:pointer;font-size:12px;font-weight:700;font-family:inherit;">Download PDF</button>
    <button onclick="window.close()"
      style="padding:7px 14px;background:transparent;color:#fca5a5;border:1px solid #7f1d1d;
      border-radius:4px;cursor:pointer;font-size:12px;font-weight:600;font-family:inherit;">Close</button>
  </div>
</div>

<div class="wrap" style="max-width:1100px;margin:24px auto 60px;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,.1);">

  <!-- LETTERHEAD -->
  <div style="text-align:center;padding:26px 32px 18px;border-bottom:3px double #1a3a5c;">
    <div style="font-size:10px;font-weight:700;color:#1a3a5c;letter-spacing:1px;text-transform:uppercase;margin-bottom:3px;">Office of Research &amp; Development</div>
    <div style="font-size:19px;font-weight:700;color:#1a3a5c;">PROJECT COMPREHENSIVE REPORT</div>
    <div style="font-size:12px;color:#374151;margin-top:5px;">${esc(p.gpNumber)} &nbsp;&bull;&nbsp; Generated: ${new Date().toLocaleString("en-IN",{day:"2-digit",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"})}</div>
    <div style="margin-top:7px;">
      <span style="display:inline-block;padding:3px 14px;border:1px solid #1a3a5c;
        font-size:10px;font-weight:700;color:#1a3a5c;text-transform:uppercase;letter-spacing:.5px;">
        Status: ${esc(statusLabel(p.status))}${p.hasExtension?" &nbsp;|&nbsp; Extended":""}
      </span>
    </div>
  </div>

  <div style="padding:22px 32px;">

    <!-- S1: PROJECT INFORMATION -->
    ${secHead("1", "Project Information")}
    <div style="display:grid;grid-template-columns:1fr 1fr;border:1px solid #dde3ea;">
      <table style="width:100%;border-collapse:collapse;">
        <tbody>
          ${irow("GP Number",`<span style="font-family:monospace;font-weight:700;">${esc(p.gpNumber)}</span>`)}
          ${irow("Project Name",`<strong>${esc(p.projectName)}</strong>`)}
          ${irow("Principal Investigator",esc(p.piName))}
          ${irow("Email (PI)",esc(p.piEmail))}
          ${irow("Department",esc(p.department))}
          ${irow("Mode of Project",esc(p.modeOfProject))}
          ${irow("Funding Agency",esc(p.projectAgencyName))}
          ${irow("Scheme",esc(p.nameOfScheme))}
        </tbody>
      </table>
      <table style="width:100%;border-collapse:collapse;border-left:2px solid #dde3ea;">
        <tbody>
          ${irow("Sanction Order No.",`<span style="font-family:monospace;">${esc(p.sanctionOrderNo)}</span>`)}
          ${irow("Bank",esc(p.bankDetails))}
          ${irow("Start Date",esc(p.projectStartDate||"â€”"))}
          ${irow("End Date",esc(p.projectEndDate||"â€”")+(p.hasExtension?` <span style="font-size:10px;font-weight:700;color:#92400e;margin-left:5px;">(EXTENDED)</span>`:""))}
          ${irow("Original End Date",esc(p.originalEndDate||"â€”"))}
          ${irow("Duration",esc(p.totalYears+" Year(s)"))}
          ${irow("Registered On",esc(p.createdAt||"â€”"))}
          ${irow("Last Updated",esc(p.updatedAt||"â€”"))}
        </tbody>
      </table>
    </div>

    <!-- S2: FINANCIAL SUMMARY -->
    ${secHead("2", "Financial Summary")}
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px;">
      ${amtBox("Total Sanctioned",amt(summary.totalSanctioned))}
      ${amtBox("Total Released",amt(summary.totalReleased),`Pending: ${amt(summary.unreleasedAmount)}`)}
      ${amtBox("Total Booked (Effective)",amt(summary.totalBooked),"Based on effectiveAmount")}
      ${amtBox("Actual Expenditure (DA)",amt(summary.totalActual))}
      ${amtBox("Available Balance",amt(summary.piBalance),"Released âˆ’ Booked",true)}
      ${amtBox("Utilisation Rate",summary.utilizationPct+"%",`${summary.approvedRequests} approved / ${summary.pendingRequests} pending / ${summary.rejectedRequests} rejected`)}
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead><tr>${th("Financial Parameter")}${th("Amount (Rs.)",true)}</tr></thead>
      <tbody>
        ${[
          ["Total Sanctioned Amount",                    amt(summary.totalSanctioned)],
          ["Total Released to PI",                       amt(summary.totalReleased)],
          ["Unreleased (Pending Release)",               amt(summary.unreleasedAmount)],
          ["Total Booked (Effective â€” actual where filled)", amt(summary.totalBooked)],
          ["Actual Expenditure (DA Entered)",            amt(summary.totalActual)],
          ["Available Balance (Released âˆ’ Booked)",     amt(summary.piBalance)],
          ["Utilisation %",                              summary.utilizationPct+"%"],
          ["Total Budget Requests",                      String(summary.totalRequests)],
          ["Approved / Pending / Rejected",              `${summary.approvedRequests} / ${summary.pendingRequests} / ${summary.rejectedRequests}`],
          ["Fund Releases",                              String(summary.totalReleases)],
          ["Extensions Granted",                         String(summary.totalExtensions||0)],
        ].map(([l,v],i) => `
          <tr style="background:${i%2===0?"#fff":"#f8fafc"};">
            <td style="padding:7px 13px;font-weight:600;color:#374151;border:1px solid #dde3ea;">${esc(l)}</td>
            <td style="padding:7px 13px;text-align:right;font-family:monospace;font-weight:700;color:#1a3a5c;border:1px solid #dde3ea;">${v}</td>
          </tr>`).join("")}
      </tbody>
    </table>
    <p style="font-size:10px;color:#6b7280;margin-top:6px;">
      Note: "Effective Booked" = actualExpenditure where DA has entered it; original booked amount otherwise. This ensures booked â‰¤ released.
    </p>

    <!-- S3: FUND RELEASE HISTORY -->
    ${secHead("3", `Fund Release History (${summary.totalReleases} Release${summary.totalReleases!==1?"s":""})`)}
    ${releaseHistoryHTML(releaseHistory)}

    <!-- S4: RELEASE-WISE BOOKING & EXPENDITURE -->
    ${secHead("4", `Release-wise Booking & Expenditure Register`)}
    <p style="font-size:11px;color:#6b7280;margin-bottom:12px;">Each booking is grouped under the release that was active when it was submitted. Booked â‰¤ Released for each release.</p>
    ${releaseGroupsHTML(releaseGroups)}

    <!-- S5: HEAD-WISE SUMMARY -->
    ${secHead("5", `Head-wise Allocation Summary (${allocations.length} Heads)`)}
    ${allocations.length === 0
      ? `<p style="font-size:12px;color:#6b7280;font-style:italic;">No head-wise allocations found.</p>`
      : allocations.map((a,i) => headSection(a, i+1)).join("")}

    <!-- S6: EXTENSIONS -->
    ${secHead("6", `Project Extensions (${extensions.length})`)}
    ${extensionSection(extensions)}

    <div style="margin-top:36px;padding-top:14px;border-top:2px solid #1a3a5c;
      display:flex;justify-content:space-between;font-size:10px;color:#6b7280;">
      <div>System-generated report. No signature required.</div>
      <div>${new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"long",year:"numeric"})}</div>
    </div>

  </div>
</div>

<script>
async function downloadPDF() {
  const btn = document.getElementById("pdfBtn");
  btn.textContent = "Generating..."; btn.disabled = true;
  try {
    if (!window.jspdf) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
    if (!window.jspdf?.jsPDF?.prototype?.autoTable)
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
    const W = doc.internal.pageSize.getWidth(), M = 14;
    let y = 0;
    const guard = (n=20) => { if (y+n>272) { doc.addPage(); y=18; } };
    const sec = (num, title) => {
      guard(14);
      doc.setFillColor(26,58,92); doc.rect(M,y,W-M*2,7,"F");
      doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.setTextColor(255,255,255);
      doc.text(num+"  "+title, M+3, y+5);
      y+=11; doc.setTextColor(30,41,59);
    };

    // Cover
    doc.setFillColor(26,58,92); doc.rect(0,0,W,40,"F");
    doc.setTextColor(255,255,255);
    doc.setFontSize(8); doc.setFont("helvetica","normal");
    doc.text("OFFICE OF RESEARCH & DEVELOPMENT", W/2, 11, {align:"center"});
    doc.setFontSize(15); doc.setFont("helvetica","bold");
    doc.text("PROJECT COMPREHENSIVE REPORT", W/2, 21, {align:"center"});
    doc.setFontSize(8); doc.setFont("helvetica","normal");
    doc.text("${esc(p.gpNumber)}  |  Status: ${esc(statusLabel(p.status))}  |  "+new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"long",year:"numeric"}), W/2, 31, {align:"center"});
    y = 48;

    // 1. Project info
    sec("1.", "PROJECT INFORMATION");
    doc.autoTable({
      startY:y, margin:{left:M,right:M},
      body:[
        ["GP Number","${esc(p.gpNumber)}"],["Project Name","${esc(p.projectName)}"],
        ["Principal Investigator","${esc(p.piName)}"],["Email","${esc(p.piEmail||"â€”")}"],
        ["Department","${esc(p.department)}"],["Funding Agency","${esc(p.projectAgencyName||"â€”")}"],
        ["Scheme","${esc(p.nameOfScheme||"â€”")}"],["Sanction Order","${esc(p.sanctionOrderNo||"â€”")}"],
        ["Bank","${esc(p.bankDetails||"Canara Bank")}"],["Start Date","${esc(p.projectStartDate||"â€”")}"],
        ["End Date","${esc(p.projectEndDate||"â€”")}${p.hasExtension?" (EXTENDED)":""}"],
        ["Original End Date","${esc(p.originalEndDate||"â€”")}"],
        ["Duration","${esc(p.totalYears+" Year(s)")}"],["Status","${esc(statusLabel(p.status))}"],
      ],
      theme:"grid", styles:{fontSize:8,cellPadding:2.5},
      columnStyles:{0:{fontStyle:"bold",fillColor:[240,244,248],cellWidth:55}},
    });
    y = doc.lastAutoTable.finalY+8;

    // 2. Financial
    sec("2.", "FINANCIAL SUMMARY");
    doc.autoTable({
      startY:y, margin:{left:M,right:M},
      head:[["Parameter","Amount (Rs.)"]],
      body:[
        ["Total Sanctioned","${INR(summary.totalSanctioned)}"],
        ["Total Released","${INR(summary.totalReleased)}"],
        ["Unreleased (Pending)","${INR(summary.unreleasedAmount)}"],
        ["Total Booked (Effective)","${INR(summary.totalBooked)}"],
        ["Actual Expenditure (DA)","${INR(summary.totalActual)}"],
        ["Available Balance","${INR(summary.piBalance)}"],
        ["Utilisation %","${summary.utilizationPct}%"],
        ["Approved / Pending / Rejected","${summary.approvedRequests} / ${summary.pendingRequests} / ${summary.rejectedRequests}"],
        ["Fund Releases","${summary.totalReleases}"],
        ["Extensions","${summary.totalExtensions||0}"],
      ],
      theme:"grid",
      headStyles:{fillColor:[26,58,92],textColor:255,fontSize:8.5},
      styles:{fontSize:8,cellPadding:2.5},
      columnStyles:{0:{fontStyle:"bold",cellWidth:110},1:{halign:"right"}},
      alternateRowStyles:{fillColor:[248,250,252]},
    });
    y = doc.lastAutoTable.finalY+8;

    // 3. Release history
    sec("3.", "FUND RELEASE HISTORY");
    const relRows = ${JSON.stringify((releaseHistory||[]).map((r,i)=>[
      i+1, r.releaseNumber||"â€”", r.letterNumber||"â€”",
      r.letterDate||"â€”", INR(r.totalReleased), r.releasedBy||"â€”", r.releasedAt||"â€”"
    ]))};
    doc.autoTable({
      startY:y, margin:{left:M,right:M},
      head:[["#","Release No.","Letter No.","Letter Date","Amount Released","Released By","Date & Time"]],
      body: relRows.length ? relRows : [["â€”","No releases","","","","",""]],
      theme:"grid",
      headStyles:{fillColor:[26,58,92],textColor:255,fontSize:7.5},
      styles:{fontSize:7.5,cellPadding:2},
      columnStyles:{0:{cellWidth:7,halign:"center"},4:{halign:"right"},5:{cellWidth:28},6:{cellWidth:34}},
      alternateRowStyles:{fillColor:[248,250,252]},
    });
    y = doc.lastAutoTable.finalY+8;

    // 4. Release-wise bookings
    sec("4.", "RELEASE-WISE BOOKING & EXPENDITURE");
    const grpRows = ${JSON.stringify((releaseGroups||[]).flatMap((grp,gi)=>
      (grp.heads||[]).flatMap(h=>
        (h.requests||[]).map((req,ri)=>[
          `R${gi+1} â€” ${grp.releaseNumber}`,
          h.headName,
          req.requestNumber||"â€”",
          req.purpose||"â€”",
          INR(req.amount),
          req.expenditureFilled ? INR(req.actualExpenditure) : "Pending",
          req.actualEnteredAt||"â€”",
          statusLabel(req.status),
        ])
      )
    ))};
    doc.autoTable({
      startY:y, margin:{left:M,right:M},
      head:[["Release","Head","Ref. No.","Purpose","Booked","Actual (DA)","DA Entered On","Status"]],
      body: grpRows.length ? grpRows : [["â€”","No approved bookings","","","","","",""]],
      theme:"grid",
      headStyles:{fillColor:[26,58,92],textColor:255,fontSize:7},
      styles:{fontSize:7,cellPadding:2},
      columnStyles:{0:{cellWidth:22},1:{cellWidth:22},2:{cellWidth:18},3:{cellWidth:30},
        4:{halign:"right",cellWidth:20},5:{halign:"right",cellWidth:20},6:{cellWidth:28},7:{cellWidth:16}},
      alternateRowStyles:{fillColor:[248,250,252]},
    });
    y = doc.lastAutoTable.finalY+8;

    // 5. Head-wise
    sec("5.", "HEAD-WISE ALLOCATION SUMMARY");
    doc.autoTable({
      startY:y, margin:{left:M,right:M},
      head:[["#","Head","Type","Sanctioned","Released","Booked (Effective)","Actual (DA)","Available","Status"]],
      body: ${JSON.stringify(allocations.map((a,i)=>[
        i+1, a.headName, a.headType,
        INR(a.sanctionedAmount), INR(a.releasedAmount),
        INR(a.bookedAmount), INR(a.actualExpenditure),
        INR(a.availableBalance), statusLabel(a.status)
      ]))},
      theme:"grid",
      headStyles:{fillColor:[26,58,92],textColor:255,fontSize:7},
      styles:{fontSize:7,cellPadding:2},
      columnStyles:{0:{cellWidth:7,halign:"center"},1:{cellWidth:28},2:{cellWidth:16},
        3:{halign:"right",cellWidth:22},4:{halign:"right",cellWidth:20},
        5:{halign:"right",cellWidth:22},6:{halign:"right",cellWidth:20},
        7:{halign:"right",cellWidth:20},8:{cellWidth:16}},
      alternateRowStyles:{fillColor:[248,250,252]},
    });

    // Page footers
    const total = doc.internal.getNumberOfPages();
    for (let pg=1;pg<=total;pg++) {
      doc.setPage(pg);
      doc.setFontSize(7); doc.setFont("helvetica","normal"); doc.setTextColor(100,116,139);
      doc.text("Page "+pg+" of "+total, W-M, 290, {align:"right"});
      doc.text("${esc(p.gpNumber)} â€” Confidential", M, 290);
    }
    doc.save("Report_${esc(p.gpNumber.replace(/\//g,"-"))}.pdf");
  } catch(e) { alert("PDF failed: "+e.message); }
  finally { btn.textContent="Download PDF"; btn.disabled=false; }
}
function loadScript(src) {
  return new Promise((res,rej)=>{
    const s=document.createElement("script");
    s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s);
  });
}
</script>
</body>
</html>`;
};

/* â”€â”€â”€ Public API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export const openProjectReport = async (project) => {
  const win = window.open("","_blank","width=1200,height=900,scrollbars=yes,resizable=yes");
  if (!win) { alert("Popup blocked. Please allow popups for this site."); return; }

  win.document.write(`<!DOCTYPE html><html><head><title>Loading...</title>
  <style>body{display:flex;align-items:center;justify-content:center;height:100vh;margin:0;
  font-family:Georgia,serif;background:#1a3a5c;color:#e2e8f0;flex-direction:column;gap:16px;}
  .sp{width:36px;height:36px;border:3px solid rgba(255,255,255,.2);border-top:3px solid #fff;
  border-radius:50%;animation:s 1s linear infinite;}
  @keyframes s{to{transform:rotate(360deg)}}</style></head>
  <body><div class="sp"></div><div style="font-size:13px;">Loading report data...</div></body></html>`);
  win.document.close();

  try {
    const res  = await fetch(`http://localhost:8000/api/get-project-report.php?projectId=${project.id}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.message || "Server error");
    const html = buildReportHTML(json.data);
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.document.title = `Report â€” ${json.data.project.gpNumber}`;
  } catch (err) {
    win.document.open();
    win.document.write(`<!DOCTYPE html><html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:Georgia;flex-direction:column;gap:12px;">
      <div style="font-size:28px;color:#991b1b;">&#9888;</div>
      <div style="font-size:15px;font-weight:700;">Failed to load report</div>
      <div style="font-size:12px;color:#374151;">${err.message}</div>
      <button onclick="window.close()" style="margin-top:10px;padding:8px 20px;background:#1a3a5c;color:#fff;border:none;cursor:pointer;">Close</button>
    </body></html>`);
    win.document.close();
  }
};

export default openProjectReport;
