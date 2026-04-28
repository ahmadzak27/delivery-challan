import { useState, useRef, useCallback } from "react";
import Papa from "papaparse";

// ─── CONFIG ───
const COMPANY_INFO = {
  name: "FBASE Remote IT Services (INDIA) Private Limited",
  address: "No. 43, Phase I, Hosur Road, Electronic City",
  city: "Bengaluru Urban, Karnataka 560100",
  phone: "",
  email: "support@firstbase.com",
  gstin: "29AAGCF0820J1ZO",
  state: "Karnataka",
  stateCode: "29",
};

const CATEGORIES = [
  { id: "laptop", label: "Laptop", hsn: "8471.30", newVal: 45000, usedVal: 25000, unit: "Unit" },
  { id: "monitor", label: "Monitor", hsn: "8528.52", newVal: 15000, usedVal: 8000, unit: "Unit" },
  { id: "keyboard", label: "Keyboard", hsn: "8471.60", newVal: 2500, usedVal: 1200, unit: "Unit" },
  { id: "mouse", label: "Mouse", hsn: "8471.60", newVal: 1500, usedVal: 750, unit: "Unit" },
  { id: "headset", label: "Headset", hsn: "8518.30", newVal: 5000, usedVal: 2500, unit: "Unit" },
  { id: "webcam", label: "Webcam", hsn: "8525.80", newVal: 3000, usedVal: 1500, unit: "Unit" },
  { id: "charger", label: "Charger / Power Adapter", hsn: "8504.40", newVal: 2000, usedVal: 1500, unit: "Unit" },
  { id: "dock", label: "Docking Station", hsn: "8471.80", newVal: 8000, usedVal: 4000, unit: "Unit" },
  { id: "bag", label: "Laptop Bag / Sleeve", hsn: "4202.12", newVal: 1500, usedVal: 800, unit: "Unit" },
  { id: "other", label: "Other Accessory", hsn: "8473.30", newVal: 1000, usedVal: 500, unit: "Unit" },
];

const TRANSPORT_REASONS = [
  "Delivery to employee on behalf of client",
  "Stock transfer to branch",
  "Supply on approval basis",
  "Return of goods for repair",
  "Movement for job work",
];

const INDIAN_STATES = [
  { name: "Andhra Pradesh", code: "37", abbr: "AP" }, { name: "Arunachal Pradesh", code: "12", abbr: "AR" },
  { name: "Assam", code: "18", abbr: "AS" }, { name: "Bihar", code: "10", abbr: "BR" },
  { name: "Chhattisgarh", code: "22", abbr: "CG" }, { name: "Delhi", code: "07", abbr: "DL" },
  { name: "Goa", code: "30", abbr: "GA" }, { name: "Gujarat", code: "24", abbr: "GJ" },
  { name: "Haryana", code: "06", abbr: "HR" }, { name: "Himachal Pradesh", code: "02", abbr: "HP" },
  { name: "Jharkhand", code: "20", abbr: "JH" }, { name: "Karnataka", code: "29", abbr: "KA" },
  { name: "Kerala", code: "32", abbr: "KL" }, { name: "Madhya Pradesh", code: "23", abbr: "MP" },
  { name: "Maharashtra", code: "27", abbr: "MH" }, { name: "Manipur", code: "14", abbr: "MN" },
  { name: "Meghalaya", code: "17", abbr: "ML" }, { name: "Mizoram", code: "15", abbr: "MZ" },
  { name: "Nagaland", code: "13", abbr: "NL" }, { name: "Odisha", code: "21", abbr: "OD" },
  { name: "Punjab", code: "03", abbr: "PB" }, { name: "Rajasthan", code: "08", abbr: "RJ" },
  { name: "Sikkim", code: "11", abbr: "SK" }, { name: "Tamil Nadu", code: "33", abbr: "TN" },
  { name: "Telangana", code: "36", abbr: "TG" }, { name: "Tripura", code: "16", abbr: "TR" },
  { name: "Uttar Pradesh", code: "09", abbr: "UP" }, { name: "Uttarakhand", code: "05", abbr: "UK" },
  { name: "West Bengal", code: "19", abbr: "WB" },
];

// ─── UTILITIES ───
function genChallan(i = 0) {
  const d = new Date();
  const fy = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `FB/DC/${fy}-${(fy + 1).toString().slice(2)}/${String(Date.now() + i).slice(-6)}`;
}

function fmtCur(v) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v); }
function fmtDate(d) { return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d || new Date()); }

function numWords(num) {
  if (num === 0) return "Zero";
  const o = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const t = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  function c(n) {
    if (n < 20) return o[n]; if (n < 100) return t[n/10|0] + (n%10 ? " " + o[n%10] : "");
    if (n < 1000) return o[n/100|0] + " Hundred" + (n%100 ? " and " + c(n%100) : "");
    if (n < 100000) return c(n/1000|0) + " Thousand" + (n%1000 ? " " + c(n%1000) : "");
    if (n < 10000000) return c(n/100000|0) + " Lakh" + (n%100000 ? " " + c(n%100000) : "");
    return c(n/10000000|0) + " Crore" + (n%10000000 ? " " + c(n%10000000) : "");
  }
  return "Rupees " + c(Math.floor(num)) + " Only";
}

function shortId(u) { return u && u.length > 12 ? u.slice(0, 8) + "…" : u || "—"; }

// ─── FILE PARSER ───
async function parseFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  if (ext === "csv") {
    return Papa.parse(await file.text(), { header: true, skipEmptyLines: true }).data;
  }
  // Try reading xlsx/xls as text (some exports are really CSV)
  try {
    const text = await file.text();
    if (text.includes(",") && text.includes("\n") && !text.startsWith("PK")) {
      return Papa.parse(text, { header: true, skipEmptyLines: true }).data;
    }
  } catch {}
  throw new Error("Please export as CSV. XLSX binary is not supported in this environment.");
}

function groupOrders(rows) {
  const m = {};
  for (const r of rows) {
    const ref = r.OrderReference || r.order_reference || r.order_id || "";
    if (!ref) continue;
    if (!m[ref]) {
      m[ref] = {
        orderRef: ref, name: r.ShipToAddName || r.ship_to_name || "",
        addr1: r.ShipToAddLine1 || "", addr2: r.ShipToAddLine2 || "",
        city: r.ShipToCity || "", zip: r.ShipToZipCode || "",
        region: r.ShipToRegionCode || "", country: r.ShipToCountry || "",
        phone: r.ShipToTelephone || "", email: r.ShipToEmail || "",
        owner: r.Owner || "", lines: [],
      };
    }
    m[ref].lines.push({
      lineId: r.OrderLine || "", itemCode: r.ItemCode || r.ShipItemCode || "",
      qty: parseInt(r.OrderQty || "1") || 1, condition: r.MandatoryCondition || r.condition || "NEW",
      serial: r.ManufacturerSerialNumber || "",
      productName: r.ProductName || r.ProductTitle || r.product_name || "",
      category: r.Category || r.category || "",
    });
  }
  return Object.values(m);
}

// ─── LOGO (Firstbase "FB" SVG placeholder — replace with actual logo data URL) ───
const LOGO_SVG = `<svg width="120" height="40" viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
  <rect width="40" height="40" rx="8" fill="#1B4332"/>
  <text x="20" y="27" text-anchor="middle" fill="#D4A373" font-family="DM Sans,sans-serif" font-weight="700" font-size="18">FB</text>
  <text x="50" y="17" fill="#1B4332" font-family="DM Sans,sans-serif" font-weight="700" font-size="12">firstbase</text>
  <text x="50" y="32" fill="#6B7280" font-family="DM Sans,sans-serif" font-weight="400" font-size="9">Device Lifecycle Mgmt</text>
</svg>`;
const LOGO_DATA = `data:image/svg+xml;base64,${btoa(LOGO_SVG)}`;

// ─── THEME ───
const T = {
  bg: "#F4F3EF", card: "#FFFFFF", primary: "#1B4332", primaryLight: "#2D6A4F",
  accent: "#D4A373", text: "#1A1A1A", muted: "#6B7280",
  border: "#E5E2DB", inputBg: "#FAFAF8", error: "#B91C1C", success: "#15803D",
  warn: "#92400E", warnBg: "#FFFBEB", salmon: "#F4A89A",
};
const S = {
  label: { display: "block", fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" },
  input: { width: "100%", padding: "9px 12px", border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: T.inputBg, color: T.text, outline: "none", boxSizing: "border-box" },
  select: { width: "100%", padding: "9px 12px", border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: T.inputBg, color: T.text, outline: "none", boxSizing: "border-box", cursor: "pointer" },
  textarea: { width: "100%", padding: "9px 12px", border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: T.inputBg, color: T.text, outline: "none", resize: "vertical", minHeight: 56, boxSizing: "border-box" },
  btn: { background: T.primary, color: "#fff", border: "none", padding: "10px 22px", borderRadius: 7, fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 },
  btn2: { background: "transparent", color: T.primary, border: `1.5px solid ${T.primary}`, padding: "10px 22px", borderRadius: 7, fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 },
  btnSm: { background: T.primaryLight, color: "#fff", border: "none", padding: "7px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" },
  btnX: { background: "transparent", color: T.error, border: "none", padding: "4px 8px", borderRadius: 4, fontSize: 12, cursor: "pointer", fontFamily: "inherit" },
  sec: { background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, padding: "22px 26px", marginBottom: 14 },
  secT: { fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: T.primaryLight, marginBottom: 14, paddingBottom: 8, borderBottom: `2px solid ${T.border}` },
  badge: { background: "rgba(212,163,115,0.15)", color: T.accent, padding: "5px 12px", borderRadius: 16, fontSize: 11, fontWeight: 600, letterSpacing: "0.04em" },
};

// ═══════════════════════════════════════════════════
// CHALLAN DOCUMENT HTML — matching template layout
// ═══════════════════════════════════════════════════
function buildChallanHTML(data, copy) {
  const total = data.items.reduce((s, i) => s + i.qty * i.value, 0);
  const totalQty = data.items.reduce((s, i) => s + i.qty, 0);
  const needsEwb = total > 50000;

  const rows = data.items.map((it, i) => `
    <tr>
      <td style="text-align:center">${i + 1}</td>
      <td>${it.label}${it.description ? `<div style="font-size:9px;color:#555;margin-top:1px">${it.description}</div>` : ""}${it.serial ? `<div style="font-size:8px;color:#888">S/N: ${it.serial}</div>` : ""}</td>
      <td style="text-align:center">${it.hsn}</td>
      <td style="text-align:center">${it.qty}</td>
      <td style="text-align:center">${it.unit || "Unit"}</td>
      <td style="text-align:center">${it.condition || "NEW"}</td>
      <td style="text-align:right">${fmtCur(it.value)}</td>
      <td style="text-align:right;font-weight:600">${fmtCur(it.qty * it.value)}</td>
    </tr>`).join("");

  return `
<div class="dc">
  <!-- HEADER with Company Info + Logo -->
  <div class="dc-title">Delivery Challan</div>
  <div class="dc-copy">${copy}</div>

  <div class="dc-header">
    <div class="dc-company">
      <table class="info-tbl">
        <tr><td class="lbl">Company:</td><td class="val" style="font-weight:700;font-size:12px">${COMPANY_INFO.name}</td></tr>
        <tr><td class="lbl">Address:</td><td class="val">${COMPANY_INFO.address}<br/>${COMPANY_INFO.city}</td></tr>
        ${COMPANY_INFO.phone ? `<tr><td class="lbl">Phone:</td><td class="val">${COMPANY_INFO.phone}</td></tr>` : ""}
        <tr><td class="lbl">Email:</td><td class="val">${COMPANY_INFO.email}</td></tr>
        <tr><td class="lbl">GSTIN:</td><td class="val" style="font-weight:600">${COMPANY_INFO.gstin}</td></tr>
        ${data.dispatchFrom ? `<tr><td class="lbl">Dispatch From:</td><td class="val">${data.dispatchFrom}</td></tr>` : ""}
      </table>
    </div>
    <div class="dc-logo">
      <img src="${LOGO_DATA}" alt="Logo" style="width:120px;height:auto"/>
    </div>
  </div>

  <!-- TWO COLUMN: Challan For / Shipping To -->
  <div class="dc-parties">
    <div class="dc-party">
      <div class="party-hdr">Delivery Challan For:</div>
      <table class="info-tbl">
        <tr><td class="lbl">Party Name:</td><td class="val" style="font-weight:700">${data.owner || "—"}</td></tr>
        <tr><td class="lbl">Order Ref:</td><td class="val">${data.orderRef ? shortId(data.orderRef) : "—"}</td></tr>
        <tr><td class="lbl">Reason:</td><td class="val">${data.reason}</td></tr>
      </table>
    </div>
    <div class="dc-party">
      <div class="party-hdr">Shipping To: <span style="font-weight:400;font-size:8px;color:#666;text-transform:none;letter-spacing:0">${data.deliveryType === "office" ? "🏢 Office" : "🏠 Residence"}</span></div>
      <table class="info-tbl">
        <tr><td class="lbl">Name:</td><td class="val" style="font-weight:700">${data.consigneeName}</td></tr>
        <tr><td class="lbl">Address:</td><td class="val">${data.consigneeAddress}<br/>${data.consigneeCity}, ${data.consigneeState} ${data.consigneePincode}</td></tr>
        <tr><td class="lbl">Phone:</td><td class="val">${data.consigneePhone || "—"}</td></tr>
        <tr><td class="lbl">Email:</td><td class="val">${data.consigneeEmail || "—"}</td></tr>
        ${data.consigneeGstin ? `<tr><td class="lbl">GSTIN:</td><td class="val" style="font-weight:600">${data.consigneeGstin}</td></tr>` : `<tr><td class="lbl">Place of Supply:</td><td class="val">${data.consigneeState} (${data.consigneeStateCode})</td></tr>`}
      </table>
    </div>
  </div>

  <!-- Challan Meta -->
  <div class="dc-meta">
    <div class="meta-item"><span class="lbl">Challan No.:</span> <span class="val" style="font-weight:700">${data.challanNumber}</span></div>
    <div class="meta-item"><span class="lbl">Date:</span> <span class="val">${fmtDate(new Date())}</span></div>
    <div class="meta-item"><span class="lbl">Delivery Time:</span> <span class="val">${data.deliveryTime || "—"}</span></div>
    <div class="meta-item"><span class="lbl">Transporter:</span> <span class="val">${data.transporterName || "—"}</span></div>
    <div class="meta-item"><span class="lbl">AWB No.:</span> <span class="val">${data.awbNumber || "—"}</span></div>
    ${needsEwb ? `<div class="meta-item" style="color:#B91C1C;font-weight:600"><span class="lbl">e-Way Bill:</span> <span class="val">${data.ewayBillNo || "REQUIRED — NOT YET GENERATED"}</span></div>` : ""}
  </div>

  <!-- ITEMS TABLE -->
  <table class="items-tbl">
    <thead>
      <tr>
        <th style="width:36px">Sl No.</th>
        <th>Item Name</th>
        <th style="width:70px">HSN/SAC</th>
        <th style="width:46px">Qty</th>
        <th style="width:46px">Unit</th>
        <th style="width:54px">Cond.</th>
        <th style="width:76px;text-align:right">Unit Val.</th>
        <th style="width:80px;text-align:right">Total Val.</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="3" style="text-align:right;font-weight:700">Total</td>
        <td style="text-align:center;font-weight:700">${totalQty}</td>
        <td colspan="3"></td>
        <td style="text-align:right;font-weight:700">${fmtCur(total)}</td>
      </tr>
    </tfoot>
  </table>

  <div class="dc-words"><strong>Value in words:</strong> ${numWords(total)}</div>

  ${needsEwb ? `<div class="dc-ewb">⚠ Total declared value exceeds ₹50,000. e-Way Bill is mandatory before dispatch under Rule 138 of CGST Rules.</div>` : ""}

  <!-- TERMS + AUTHORIZED SIGNATORY -->
  <div class="dc-terms-sig">
    <div class="dc-terms">
      <div class="section-lbl">Terms and Conditions:</div>
      <div class="terms-text">
        1. Goods described are for internal movement/delivery and do not constitute a sale.<br/>
        2. This challan is issued under Rule 55(1)(c) of the CGST Rules, 2017.<br/>
        3. Goods remain the property of ${COMPANY_INFO.name} / client company.
      </div>
    </div>
    <div class="dc-auth">
      <div class="section-lbl">For, ${COMPANY_INFO.name}</div>
      <div style="height:50px"></div>
      <div class="sig-line">Authorised Signature</div>
    </div>
  </div>

  <!-- RECEIVED BY -->
  <div class="dc-recv">
    <div class="section-lbl">Received By</div>
    <div class="recv-grid">
      <div><span class="lbl">Name:</span> <span class="recv-blank"></span></div>
      <div><span class="lbl">Comment:</span> <span class="recv-blank"></span></div>
      <div><span class="lbl">Date:</span> <span class="recv-blank"></span></div>
      <div><span class="lbl">Signature:</span> <span class="recv-blank"></span></div>
    </div>
  </div>

  <!-- DELIVERED BY -->
  <div class="dc-recv">
    <div class="section-lbl">Delivered By</div>
    <div class="recv-grid">
      <div><span class="lbl">Name:</span> <span class="recv-blank"></span></div>
      <div><span class="lbl">Comment:</span> <span class="recv-blank"></span></div>
      <div><span class="lbl">Date:</span> <span class="recv-blank"></span></div>
      <div><span class="lbl">Signature:</span> <span class="recv-blank"></span></div>
    </div>
  </div>

  <div class="dc-footer">Computer-generated delivery challan under GST Rule 55. No tax is charged — goods movement is not a supply transaction.</div>
</div>`;
}

const PRINT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'DM Sans',sans-serif;color:#1A1A1A;padding:16px;font-size:10px}
.dc{border:2px solid #1B4332;max-width:760px;margin:0 auto 16px;page-break-inside:avoid}
.dc-title{background:#1B4332;color:#fff;text-align:center;font-size:16px;font-weight:700;padding:8px;letter-spacing:0.08em;text-transform:uppercase}
.dc-copy{text-align:center;font-size:9px;font-weight:600;color:#666;padding:3px 0;border-bottom:1px solid #ccc;text-transform:uppercase;letter-spacing:0.1em;background:#f9f8f5}
.dc-header{display:flex;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #ccc}
.dc-company{flex:1}
.dc-logo{display:flex;align-items:flex-start;justify-content:flex-end;padding-left:16px}
.info-tbl{width:100%;border-collapse:collapse}
.info-tbl td{padding:2px 0;vertical-align:top}
.info-tbl .lbl{font-size:9px;font-weight:600;color:#666;width:70px;white-space:nowrap;padding-right:8px}
.info-tbl .val{font-size:10px;color:#1A1A1A}
.dc-parties{display:flex;border-bottom:1px solid #ccc}
.dc-party{flex:1;padding:10px 14px}
.dc-party:first-child{border-right:1px solid #ccc}
.party-hdr{font-size:10px;font-weight:700;color:#1B4332;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.04em;padding-bottom:3px;border-bottom:1px solid #e5e2db}
.dc-meta{display:flex;flex-wrap:wrap;gap:4px 20px;padding:8px 14px;border-bottom:1px solid #ccc;background:#f9f8f5}
.meta-item{font-size:10px}
.meta-item .lbl{font-weight:600;color:#666}
.meta-item .val{color:#1A1A1A}
.items-tbl{width:100%;border-collapse:collapse}
.items-tbl thead th{background:#F4A89A;color:#1A1A1A;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;padding:6px 8px;text-align:left;border-bottom:2px solid #1B4332}
.items-tbl tbody td{padding:5px 8px;font-size:10px;border-bottom:1px solid #e5e2db}
.items-tbl tfoot .total-row td{background:#F4A89A;padding:6px 8px;font-size:10px;border-top:2px solid #1B4332}
.dc-words{padding:6px 14px;font-size:9px;font-style:italic;color:#444;border-top:1px solid #ccc}
.dc-ewb{padding:6px 14px;font-size:9px;color:#B91C1C;font-weight:600;background:#fef2f2;border-top:1px solid #ccc}
.dc-terms-sig{display:flex;border-top:1px solid #ccc}
.dc-terms{flex:1;padding:10px 14px;border-right:1px solid #ccc}
.dc-auth{flex:1;padding:10px 14px;display:flex;flex-direction:column;justify-content:space-between}
.section-lbl{font-size:9px;font-weight:700;color:#1B4332;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px}
.terms-text{font-size:8.5px;color:#555;line-height:1.6}
.sig-line{border-top:1px solid #999;padding-top:3px;font-size:9px;color:#666;text-align:center}
.dc-recv{padding:10px 14px;border-top:1px solid #ccc}
.recv-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 20px;margin-top:4px}
.recv-grid .lbl{font-size:9px;font-weight:600;color:#666}
.recv-blank{display:inline-block;width:140px;border-bottom:1px solid #ccc}
.dc-footer{background:#f5f3ef;padding:4px 14px;font-size:7px;color:#888;text-align:center;border-top:1px solid #ccc}
@media print{body{padding:0}.dc{border-width:1.5px}}
`;

// ═══════════════════════════════════════════════════
// PREVIEW COMPONENT
// ═══════════════════════════════════════════════════
function Preview({ data, copy, onClose, onSwitchCopy }) {
  const ref = useRef();
  const copies = ["Original for Consignee", "Duplicate for Transporter", "Triplicate for Consigner"];

  const getFullHTML = (html) => `<html><head><title>DC-${data.challanNumber}</title><style>${PRINT_CSS}</style></head><body>${html}</body></html>`;

  const doPrint = (html) => { const w = window.open("", "_blank"); w.document.write(getFullHTML(html)); w.document.close(); w.print(); };

  const doPrintAll = () => {
    const all = copies.map(c => buildChallanHTML(data, c)).join('<div style="page-break-after:always"></div>');
    doPrint(all);
  };

  const doDownload = () => {
    const all = copies.map(c => buildChallanHTML(data, c)).join('<div style="page-break-after:always"></div>');
    const html = getFullHTML(all);
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    // Trigger print dialog — user selects "Save as PDF" as destination
    setTimeout(() => { w.print(); }, 400);
  };

  const doEmail = () => {
    const subject = encodeURIComponent(`Delivery Challan ${data.challanNumber} — ${data.consigneeName}`);
    const body = encodeURIComponent(`Hi,\n\nPlease find the Delivery Challan details below:\n\nChallan No: ${data.challanNumber}\nDate: ${fmtDate(new Date())}\nConsignee: ${data.consigneeName}\nCity: ${data.consigneeCity}, ${data.consigneeState}\nItems: ${data.items.length}\nTotal Value: ${fmtCur(data.items.reduce((s,i) => s + i.qty * i.value, 0))}\nOrder Ref: ${data.orderRef || "N/A"}\nClient: ${data.owner || "N/A"}\n\nPlease download and attach the PDF challan from the system before sending.\n\nRegards,\nFBASE Remote IT Services (INDIA) Pvt. Ltd.`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.6)", overflow: "auto", padding: 16 }}>
      <div style={{ maxWidth: 860, margin: "0 auto", background: "#fff", borderRadius: 10, overflow: "hidden" }}>
        {/* Toolbar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderBottom: `1px solid ${T.border}`, background: T.bg, flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{copy}</span>
            <span style={S.badge}>{data.challanNumber}</span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button style={{ ...S.btnSm, background: "#2563EB" }} onClick={doEmail} title="Open email client">✉ Email</button>
            <button style={{ ...S.btnSm, background: "#7C3AED" }} onClick={doDownload} title="Save as PDF (use Print > Save as PDF)">⬇ Save PDF</button>
            <button style={S.btnSm} onClick={() => doPrint(ref.current.innerHTML)} title="Print this copy">⎙ Print</button>
            <button style={{ ...S.btnSm, background: T.accent, color: T.primary }} onClick={doPrintAll} title="Print all 3 copies">⎙ All 3</button>
            <button style={S.btn2} onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Document */}
        <div style={{ padding: 18, background: "#e8e7e3" }} ref={ref}>
          <div dangerouslySetInnerHTML={{ __html: buildChallanHTML(data, copy) }} />
          <style>{PRINT_CSS}</style>
        </div>

        {/* Copy switcher */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, padding: "10px 18px", background: T.primary }}>
          {copies.map(c => (
            <button key={c} onClick={() => onSwitchCopy(c)} style={{ ...S.btnSm, background: copy === c ? T.accent : "rgba(255,255,255,0.1)", color: copy === c ? T.primary : "#fff", fontSize: 10, padding: "5px 12px" }}>{c}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MAPPING MODAL ───
function MappingModal({ codes, itemMap, onSave, onClose }) {
  const [m, setM] = useState(() => {
    const init = { ...itemMap };
    codes.forEach(c => { if (!init[c]) init[c] = { categoryId: "", description: "" }; });
    return init;
  });
  const upd = (code, f, v) => setM(prev => ({ ...prev, [code]: { ...prev[code], [f]: v } }));
  const ready = codes.every(c => m[c]?.categoryId);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 900, background: "rgba(0,0,0,0.5)", overflow: "auto", padding: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 10, width: "100%", maxWidth: 720, maxHeight: "80vh", overflow: "auto" }}>
        <div style={{ padding: "14px 24px", borderBottom: `1px solid ${T.border}`, background: T.warnBg }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: T.warn }}>Map Item Codes → Categories</div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>{codes.length} code{codes.length !== 1 ? "s" : ""} need mapping. Saved for future uploads.</div>
        </div>
        <div style={{ padding: "14px 24px" }}>
          {codes.map(code => (
            <div key={code} style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 1.5fr", gap: 8, marginBottom: 8, alignItems: "center" }}>
              <code style={{ fontSize: 10, color: T.muted, background: T.bg, padding: "6px 8px", borderRadius: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={code}>{shortId(code)}</code>
              <select style={S.select} value={m[code]?.categoryId || ""} onChange={e => upd(code, "categoryId", e.target.value)}>
                <option value="">— Select —</option>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label} ({c.hsn})</option>)}
              </select>
              <input style={S.input} placeholder="Product name" value={m[code]?.description || ""} onChange={e => upd(code, "description", e.target.value)} />
            </div>
          ))}
        </div>
        <div style={{ padding: "12px 24px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button style={S.btn2} onClick={onClose}>Cancel</button>
          <button style={{ ...S.btn, opacity: ready ? 1 : 0.4 }} disabled={!ready} onClick={() => onSave(m)}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════
export default function App() {
  const [view, setView] = useState("form");
  const [previewCopy, setPreviewCopy] = useState("Original for Consignee");

  const [orders, setOrders] = useState([]);
  const [itemMap, setItemMap] = useState({});
  const [showMap, setShowMap] = useState(false);
  const [unmapped, setUnmapped] = useState([]);
  const [uploadErr, setUploadErr] = useState("");
  const fileRef = useRef();

  const [challanNum, setChallanNum] = useState(() => genChallan());
  const [cName, setCName] = useState("");
  const [cAddr, setCAddr] = useState("");
  const [cCity, setCCity] = useState("");
  const [cState, setCState] = useState("Karnataka");
  const [cPin, setCPin] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cGstin, setCGstin] = useState("");
  const [deliveryType, setDeliveryType] = useState("residence");
  const [owner, setOwner] = useState("");
  const [reason, setReason] = useState(TRANSPORT_REASONS[0]);
  const [transporter, setTransporter] = useState("");
  const [awb, setAwb] = useState("");
  const [oRef, setORef] = useState("");
  const [ewb, setEwb] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [dispatchFrom, setDispatchFrom] = useState("GMS Worldwide Express O/B/O Firstbase, Ground, Survey No. 71, 1st Main Road, Near Dasanapura Village, Dasanapura, Bengaluru 562162");
  const [items, setItems] = useState([
    { categoryId: "laptop", description: "", qty: 1, label: "Laptop", hsn: "8471.30", value: 45000, unit: "Unit", condition: "NEW", serial: "" },
  ]);
  const [fromFile, setFromFile] = useState(false);

  const handleUpload = useCallback(async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadErr("");
    try {
      const rows = await parseFile(file);
      if (!rows.length) { setUploadErr("No data rows found."); return; }
      const parsed = groupOrders(rows);
      if (!parsed.length) { setUploadErr("Could not parse orders. Check headers."); return; }
      setOrders(parsed);
      const codes = new Set();
      parsed.forEach(o => o.lines.forEach(l => { if (l.itemCode && !l.productName && !l.category) codes.add(l.itemCode); }));
      const need = [...codes].filter(c => !itemMap[c]?.categoryId);
      if (need.length) { setUnmapped(need); setShowMap(true); }
    } catch (err) { setUploadErr(err.message); }
    e.target.value = "";
  }, [itemMap]);

  const selectOrder = useCallback((order) => {
    setCName(order.name);
    setCAddr([order.addr1, order.addr2].filter(Boolean).join(", "));
    setCCity(order.city); setCPin(String(order.zip || ""));
    setCPhone(String(order.phone || "")); setCEmail(order.email || "");
    setORef(order.orderRef); setOwner(order.owner || "");
    setFromFile(true);
    const region = (order.region || "").trim().toUpperCase();
    const st = INDIAN_STATES.find(s =>
      s.abbr === region ||
      s.code === region ||
      s.name.toUpperCase() === region
    );
    if (st) setCState(st.name);

    const newItems = order.lines.map(line => {
      const mapped = itemMap[line.itemCode];
      const cond = (line.condition || "NEW").toUpperCase();
      if (mapped?.categoryId) {
        const cat = CATEGORIES.find(c => c.id === mapped.categoryId);
        const val = cond === "USED" ? cat.usedVal : cat.newVal;
        return { categoryId: mapped.categoryId, description: line.productName || mapped.description || "", qty: line.qty || 1, label: cat?.label || "", hsn: cat?.hsn || "", value: val, unit: cat?.unit || "Unit", condition: cond, serial: line.serial || "" };
      }
      if (line.category) {
        const cat = CATEGORIES.find(c => c.id === line.category.toLowerCase() || c.label.toLowerCase() === line.category.toLowerCase());
        if (cat) { const val = cond === "USED" ? cat.usedVal : cat.newVal; return { categoryId: cat.id, description: line.productName || "", qty: line.qty || 1, label: cat.label, hsn: cat.hsn, value: val, unit: cat.unit, condition: cond, serial: line.serial || "" }; }
      }
      return { categoryId: "other", description: line.productName || shortId(line.itemCode), qty: line.qty || 1, label: "Other Accessory", hsn: "8473.30", value: cond === "USED" ? 500 : 1000, unit: "Unit", condition: cond, serial: line.serial || "" };
    });
    setItems(newItems.length ? newItems : [{ categoryId: "laptop", description: "", qty: 1, label: "Laptop", hsn: "8471.30", value: 45000, unit: "Unit", condition: "NEW", serial: "" }]);
    setChallanNum(genChallan());
  }, [itemMap]);

  const addItem = () => { const c = CATEGORIES[0]; setItems([...items, { categoryId: c.id, description: "", qty: 1, label: c.label, hsn: c.hsn, value: c.newVal, unit: c.unit, condition: "NEW", serial: "" }]); };
  const updItem = (i, f, v) => {
    const n = [...items];
    if (f === "categoryId") {
      const c = CATEGORIES.find(x => x.id === v);
      const cond = n[i].condition || "NEW";
      n[i] = { ...n[i], categoryId: v, label: c.label, hsn: c.hsn, value: cond === "USED" ? c.usedVal : c.newVal, unit: c.unit };
    } else if (f === "condition") {
      const c = CATEGORIES.find(x => x.id === n[i].categoryId);
      n[i] = { ...n[i], condition: v, value: v === "USED" ? c.usedVal : c.newVal };
    } else { n[i] = { ...n[i], [f]: v }; }
    setItems(n);
  };
  const rmItem = (i) => { if (items.length > 1) setItems(items.filter((_, x) => x !== i)); };

  const total = items.reduce((s, i) => s + i.qty * i.value, 0);
  const stObj = INDIAN_STATES.find(s => s.name === cState) || { code: "" };
  const canGen = cName && cAddr && cCity && cPin && items.length > 0;

  const data = {
    challanNumber: challanNum, consigneeName: cName, consigneeAddress: cAddr, consigneeCity: cCity,
    consigneeState: cState, consigneeStateCode: stObj.code, consigneePincode: cPin,
    consigneePhone: cPhone, consigneeEmail: cEmail, consigneeGstin: cGstin, deliveryType, owner,
    reason, transporterName: transporter, awbNumber: awb, orderRef: oRef,
    ewayBillNo: ewb, deliveryTime, dispatchFrom, items,
  };

  const itemLabel = (line) => {
    const m = itemMap[line.itemCode];
    if (m?.categoryId) { const c = CATEGORIES.find(x => x.id === m.categoryId); return m.description || c?.label || m.categoryId; }
    return line.productName || line.category || shortId(line.itemCode);
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "'DM Sans','Helvetica Neue',sans-serif", color: T.text }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {view === "preview" && <Preview data={data} copy={previewCopy} onClose={() => setView("form")} onSwitchCopy={setPreviewCopy} />}
      {showMap && <MappingModal codes={unmapped} itemMap={itemMap} onSave={m => { setItemMap(m); setShowMap(false); setUnmapped([]); }} onClose={() => { setShowMap(false); setUnmapped([]); }} />}

      {/* Header */}
      <div style={{ background: T.primary, padding: "13px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 30, height: 30, background: T.accent, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: T.primary }}>FB</div>
          <div>
            <div style={{ color: "#fff", fontSize: 16, fontWeight: 600 }}>Delivery Challan Generator</div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>GST Rule 55 · India</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {Object.keys(itemMap).length > 0 && <button style={{ ...S.btnSm, background: "rgba(255,255,255,0.1)", fontSize: 10, padding: "4px 10px" }} onClick={() => { setUnmapped(Object.keys(itemMap)); setShowMap(true); }}>⚙ Mappings ({Object.keys(itemMap).length})</button>}
          <span style={S.badge}>{challanNum}</span>
        </div>
      </div>

      <div style={{ maxWidth: 940, margin: "0 auto", padding: "20px 18px" }}>
        {/* Upload */}
        <div style={{ ...S.sec, background: orders.length ? "#f0fdf4" : T.card, borderColor: orders.length ? "#86efac" : T.border }}>
          <div style={S.secT}><span style={{ display: "flex", justifyContent: "space-between" }}><span>📁 Upload Order File</span>{orders.length > 0 && <span style={{ fontSize: 11, color: T.success, fontWeight: 600 }}>✓ {orders.length} orders</span>}</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleUpload} style={{ display: "none" }} />
            <button style={S.btn} onClick={() => fileRef.current?.click()}>Upload CSV</button>
            <span style={{ fontSize: 11, color: T.muted }}>Groups by <strong>OrderReference</strong> · each line = one challan item · condition (NEW/USED) sets price</span>
          </div>
          {uploadErr && <div style={{ marginTop: 8, fontSize: 12, color: T.error, fontWeight: 600 }}>{uploadErr}</div>}
        </div>

        {/* Order list */}
        {orders.length > 0 && (
          <div style={S.sec}>
            <div style={S.secT}><span style={{ display: "flex", justifyContent: "space-between" }}><span>📋 Select Order</span><button style={S.btnX} onClick={() => { setOrders([]); setFromFile(false); }}>✕ Clear</button></span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {orders.map(o => (
                <div key={o.orderRef} onClick={() => selectOrder(o)}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: T.inputBg, borderRadius: 7, border: `1px solid ${T.border}`, cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = T.primary; }} onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{o.name}</div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{o.city} · {o.owner} · <strong>{o.lines.length} item{o.lines.length > 1 ? "s" : ""}</strong> · {o.lines.map(l => (l.condition || "NEW")).join(", ")}</div>
                    <div style={{ fontSize: 11, color: T.primaryLight, marginTop: 2 }}>{o.lines.map(l => itemLabel(l)).join(" · ")}</div>
                  </div>
                  <div style={{ fontSize: 18, color: T.muted }}>→</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Consignee */}
        <div style={S.sec}>
          <div style={S.secT}>Consignee{fromFile && <span style={{ float: "right", fontSize: 10, color: T.success }}>✓ From file</span>}</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button onClick={() => setDeliveryType("residence")} style={{ ...S.btnSm, background: deliveryType === "residence" ? T.primary : T.inputBg, color: deliveryType === "residence" ? "#fff" : T.muted, border: `1px solid ${deliveryType === "residence" ? T.primary : T.border}`, fontSize: 11, padding: "6px 14px" }}>🏠 Residence</button>
            <button onClick={() => setDeliveryType("office")} style={{ ...S.btnSm, background: deliveryType === "office" ? T.primary : T.inputBg, color: deliveryType === "office" ? "#fff" : T.muted, border: `1px solid ${deliveryType === "office" ? T.primary : T.border}`, fontSize: 11, padding: "6px 14px" }}>🏢 Office</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div><label style={S.label}>Name</label><input style={S.input} value={cName} onChange={e => setCName(e.target.value)} /></div>
            <div><label style={S.label}>Phone</label><input style={S.input} value={cPhone} onChange={e => setCPhone(e.target.value)} /></div>
            <div><label style={S.label}>Email</label><input style={S.input} value={cEmail} onChange={e => setCEmail(e.target.value)} /></div>
          </div>
          {deliveryType === "office" && (
            <div style={{ marginTop: 10 }}>
              <label style={S.label}>Consignee GSTIN (if registered)</label>
              <input style={{ ...S.input, maxWidth: 320 }} value={cGstin} onChange={e => setCGstin(e.target.value.toUpperCase())} placeholder="e.g. 29AABCT1234F1ZP" maxLength={15} />
            </div>
          )}
          <div style={{ marginTop: 10 }}><label style={S.label}>Address</label><textarea style={S.textarea} value={cAddr} onChange={e => setCAddr(e.target.value)} rows={2} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 10 }}>
            <div><label style={S.label}>City</label><input style={S.input} value={cCity} onChange={e => setCCity(e.target.value)} /></div>
            <div><label style={S.label}>State</label><select style={S.select} value={cState} onChange={e => setCState(e.target.value)}>{INDIAN_STATES.map(s => <option key={s.code} value={s.name}>{s.name} ({s.code})</option>)}</select></div>
            <div><label style={S.label}>Pincode</label><input style={S.input} value={cPin} onChange={e => setCPin(e.target.value)} maxLength={6} /></div>
          </div>
        </div>

        {/* Items */}
        <div style={S.sec}>
          <div style={S.secT}>Items{fromFile && <span style={{ float: "right", fontSize: 10, color: T.success }}>✓ {items.length} lines</span>}</div>
          <div style={{ overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1.2fr 60px 60px 70px 80px 24px", gap: 8, marginBottom: 4, minWidth: 640 }}>
              <span style={S.label}>Category</span><span style={S.label}>Description / Product Name</span><span style={S.label}>Qty</span><span style={S.label}>Cond.</span><span style={S.label}>Unit Val ₹</span><span style={S.label}>Line Total</span><span></span>
            </div>
            {items.map((item, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1.8fr 1.2fr 60px 60px 70px 80px 24px", gap: 8, alignItems: "center", marginBottom: 7, minWidth: 640 }}>
                <select style={S.select} value={item.categoryId} onChange={e => updItem(i, "categoryId", e.target.value)}>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label} ({c.hsn})</option>)}
                </select>
                <input style={S.input} value={item.description} onChange={e => updItem(i, "description", e.target.value)} placeholder="Product name" />
                <input style={S.input} type="number" min={1} value={item.qty} onChange={e => updItem(i, "qty", parseInt(e.target.value) || 1)} />
                <select style={{ ...S.select, padding: "9px 4px", fontSize: 11 }} value={item.condition} onChange={e => updItem(i, "condition", e.target.value)}>
                  <option value="NEW">New</option><option value="USED">Used</option>
                </select>
                <input style={S.input} type="number" value={item.value} onChange={e => updItem(i, "value", parseFloat(e.target.value) || 0)} />
                <div style={{ fontSize: 13, fontWeight: 600, color: T.primary, textAlign: "right" }}>{fmtCur(item.qty * item.value)}</div>
                <button style={S.btnX} onClick={() => rmItem(i)}>✕</button>
              </div>
            ))}
          </div>
          <button style={S.btnSm} onClick={addItem}>+ Add Item</button>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, padding: "12px 0 0", borderTop: `2px solid ${T.border}`, marginTop: 12 }}>
            <span style={{ fontSize: 12, color: T.muted }}>Total Declared Value:</span>
            <span style={{ fontSize: 17, fontWeight: 700, color: T.primary }}>{fmtCur(total)}</span>
          </div>
          {total > 50000 && <div style={{ marginTop: 8, padding: "6px 10px", background: "#fef2f2", borderRadius: 5, fontSize: 11, color: T.error, fontWeight: 600 }}>⚠ Exceeds ₹50,000 — e-Way Bill mandatory.</div>}
        </div>

        {/* Transport */}
        <div style={S.sec}>
          <div style={S.secT}>Transport & Dispatch</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div><label style={S.label}>Reason</label><select style={S.select} value={reason} onChange={e => setReason(e.target.value)}>{TRANSPORT_REASONS.map(r => <option key={r}>{r}</option>)}</select></div>
            <div><label style={S.label}>Client / Owner</label><input style={S.input} value={owner} onChange={e => setOwner(e.target.value)} placeholder="e.g. TYPEFORM" /></div>
            <div><label style={S.label}>Order Ref</label><input style={S.input} value={oRef} onChange={e => setORef(e.target.value)} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 10 }}>
            <div><label style={S.label}>Dispatch From (3PL Warehouse)</label><input style={S.input} value={dispatchFrom} onChange={e => setDispatchFrom(e.target.value)} placeholder="3PL warehouse address (optional)" /></div>
            <div><label style={S.label}>Transporter</label><input style={S.input} value={transporter} onChange={e => setTransporter(e.target.value)} placeholder="BlueDart" /></div>
            <div><label style={S.label}>AWB No.</label><input style={S.input} value={awb} onChange={e => setAwb(e.target.value)} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 10 }}>
            <div><label style={S.label}>e-Way Bill</label><input style={S.input} value={ewb} onChange={e => setEwb(e.target.value)} /></div>
            <div><label style={S.label}>Delivery Time</label><input style={S.input} value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)} placeholder="e.g. 10:00 AM" /></div>
            <div></div>
          </div>
        </div>

        {/* Generate */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
          <button style={{ ...S.btn, opacity: canGen ? 1 : 0.4, fontSize: 14, padding: "12px 30px" }} disabled={!canGen}
            onClick={() => { setPreviewCopy("Original for Consignee"); setView("preview"); }}>
            Generate Challan →
          </button>
        </div>

        <div style={{ textAlign: "center", padding: "22px 0 8px", fontSize: 10, color: T.muted }}>{COMPANY_INFO.name} · GSTIN: {COMPANY_INFO.gstin}</div>
      </div>
    </div>
  );
}
