import { useState, useRef, useCallback, useEffect } from "react";
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

const DISPATCH_DEFAULT = {
  name: "GMS Worldwide Express O/B/O Firstbase",
  address: "Ground, Survey No. 71, 1st Main Road, Near Dasanapura Village",
  city: "Dasanapura, Bengaluru",
  state: "Karnataka",
  pincode: "562162",
};

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

// ─── APPS SCRIPT API ───
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw9kB-Lr2lB5IFWhllD5GVJxX6jmtomKRsmLr_zBnQe341S-U_I5zEvdwSG9BR0benp/exec";

async function fetchNextChallan() {
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=next`);
    const data = await res.json();
    return data.challanNumber || "DC------";
  } catch { return "DC------"; }
}

async function registerChallan(payload) {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" }, // Apps Script needs text/plain to avoid CORS preflight
    body: JSON.stringify({ action: "register", ...payload }),
  });
  return await res.json();
}

async function checkOrderChallan(orderRef) {
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=check&orderRef=${encodeURIComponent(orderRef)}`);
    return await res.json();
  } catch { return { exists: false }; }
}

// ─── UTILITIES ───
function genChallanLocal() {
  // Fallback only — used for display before API responds
  return "DC------";
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
    const ref = r.OrderReference || r["Order Id"] || r.order_reference || r.order_id || "";
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
      lineId: r["Order Item ID"] || r.OrderLine || "",
      itemCode: r.ItemCode || r.ShipItemCode || r["SKU ID"] || "",
      qty: parseInt(r.OrderQty || "1") || 1,
      condition: r.MandatoryCondition || r.condition || "NEW",
      serial: r.ManufacturerSerialNumber || "",
      productName: r["Product Name"] || r.ProductName || r.ProductTitle || r.product_name || "",
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

const SIGNATURE_DATA = "data:image/png;base64,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";

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
        ${data.dispatch.name ? `<tr><td class="lbl">Dispatch From:</td><td class="val" style="font-weight:600">${data.dispatch.name}</td></tr>
        <tr><td class="lbl"></td><td class="val">${data.dispatch.address}<br/>${data.dispatch.city}, ${data.dispatch.state} ${data.dispatch.pincode}</td></tr>` : ""}
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
      <div style="height:50px;display:flex;align-items:center;justify-content:center"><img src="${SIGNATURE_DATA}" alt="Signature" style="height:44px;width:auto;opacity:0.9"/></div>
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

  const [challanNum, setChallanNum] = useState("DC------");
  const [isRegistered, setIsRegistered] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  // Fetch next challan number on load
  useEffect(() => { fetchNextChallan().then(n => setChallanNum(n)); }, []);
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
  const [dispName, setDispName] = useState(DISPATCH_DEFAULT.name);
  const [dispAddr, setDispAddr] = useState(DISPATCH_DEFAULT.address);
  const [dispCity, setDispCity] = useState(DISPATCH_DEFAULT.city);
  const [dispState, setDispState] = useState(DISPATCH_DEFAULT.state);
  const [dispPin, setDispPin] = useState(DISPATCH_DEFAULT.pincode);
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
    const regionNoSpace = region.replace(/\s+/g, "");
    const st = INDIAN_STATES.find(s =>
      s.abbr === region ||
      s.code === region ||
      s.name.toUpperCase() === region ||
      s.name.toUpperCase().replace(/\s+/g, "") === regionNoSpace
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
    setIsRegistered(false);
    setGenError("");
    fetchNextChallan().then(n => setChallanNum(n));
    // Check if order already has a challan
    checkOrderChallan(order.orderRef).then(res => {
      if (res.exists) setGenError(`⚠ This order already has challan ${res.challanNumber}. Generating a new one will create a duplicate.`);
    });
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
    ewayBillNo: ewb, deliveryTime, dispatch: { name: dispName, address: dispAddr, city: dispCity, state: dispState, pincode: dispPin }, items,
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
          <div style={{ ...S.sec, marginTop: 14 }}>
            <div style={S.secT}>Dispatch From (3PL Warehouse)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={S.label}>Name</label><input style={S.input} value={dispName} onChange={e => setDispName(e.target.value)} /></div>
              <div><label style={S.label}>Pincode</label><input style={S.input} value={dispPin} onChange={e => setDispPin(e.target.value)} maxLength={6} /></div>
            </div>
            <div style={{ marginTop: 10 }}><label style={S.label}>Address</label><input style={S.input} value={dispAddr} onChange={e => setDispAddr(e.target.value)} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
              <div><label style={S.label}>City</label><input style={S.input} value={dispCity} onChange={e => setDispCity(e.target.value)} /></div>
              <div><label style={S.label}>State</label><input style={S.input} value={dispState} onChange={e => setDispState(e.target.value)} /></div>
            </div>
          </div>

          <div style={S.sec}>
            <div style={S.secT}>Transport & Dispatch</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div><label style={S.label}>Reason</label><select style={S.select} value={reason} onChange={e => setReason(e.target.value)}>{TRANSPORT_REASONS.map(r => <option key={r}>{r}</option>)}</select></div>
            <div><label style={S.label}>Client / Owner</label><input style={S.input} value={owner} onChange={e => setOwner(e.target.value)} placeholder="e.g. TYPEFORM" /></div>
            <div><label style={S.label}>Order Ref</label><input style={S.input} value={oRef} onChange={e => setORef(e.target.value)} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 10 }}>
            <div><label style={S.label}>Transporter</label><input style={S.input} value={transporter} onChange={e => setTransporter(e.target.value)} placeholder="BlueDart" /></div>
            <div><label style={S.label}>AWB No.</label><input style={S.input} value={awb} onChange={e => setAwb(e.target.value)} /></div>
            <div><label style={S.label}>Delivery Time</label><input style={S.input} value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)} placeholder="e.g. 10:00 AM" /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 10 }}>
            <div><label style={S.label}>e-Way Bill</label><input style={S.input} value={ewb} onChange={e => setEwb(e.target.value)} /></div>
            <div></div>
            <div></div>
          </div>
        </div>

        {/* Generate */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, marginTop: 16 }}>
          {genError && <div style={{ fontSize: 12, color: genError.startsWith("⚠") ? T.warn : T.error, fontWeight: 600, background: genError.startsWith("⚠") ? T.warnBg : "#fef2f2", padding: "8px 14px", borderRadius: 6, maxWidth: 500, textAlign: "right" }}>{genError}</div>}
          <button
            style={{ ...S.btn, opacity: (canGen && !generating) ? 1 : 0.4, fontSize: 14, padding: "12px 30px" }}
            disabled={!canGen || generating}
            onClick={async () => {
              setGenerating(true);
              setGenError("");
              try {
                const conditions = [...new Set(items.map(i => i.condition))].join(", ");
                const payload = {
                  orderRef: oRef || "",
                  owner: owner || "",
                  consigneeName: cName,
                  consigneeCity: cCity,
                  consigneeState: cState,
                  deliveryType,
                  itemsCount: items.length,
                  itemsDescription: items.map(i => i.description || i.label).join(", "),
                  totalValue: items.reduce((s, i) => s + i.qty * i.value, 0),
                  condition: conditions,
                  transporter: transporter || "",
                  awbNumber: awb || "",
                  ewayBill: ewb || "",
                  dispatchFrom: [dispName, dispAddr, dispCity, dispState, dispPin].filter(Boolean).join(", "),
                  generatedBy: "",
                  date: fmtDate(new Date()),
                };
                const result = await registerChallan(payload);
                if (result.success) {
                  setChallanNum(result.challanNumber);
                  setIsRegistered(true);
                  setPreviewCopy("Original for Consignee");
                  setView("preview");
                } else {
                  setGenError("Registration failed: " + (result.error || "Unknown error"));
                }
              } catch (err) {
                setGenError("Could not reach challan register. Check your internet connection.");
              } finally {
                setGenerating(false);
              }
            }}>
            {generating ? "Registering…" : "Generate Challan →"}
          </button>
        </div>

        <div style={{ textAlign: "center", padding: "22px 0 8px", fontSize: 10, color: T.muted }}>{COMPANY_INFO.name} · GSTIN: {COMPANY_INFO.gstin}</div>
      </div>
    </div>
  );
}
