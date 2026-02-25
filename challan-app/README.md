# Firstbase Delivery Challan Generator

GST Rule 55 compliant delivery challan generator for FBASE Remote IT Services (INDIA) Pvt. Ltd.

## Features

- **CSV Upload** — Upload order files, auto-groups by OrderReference, maps each line to a challan item
- **Item Code Mapping** — Map UUID item codes to categories (Laptop, Monitor, etc.) with persistent storage
- **New/Used Pricing** — Dual book values per category based on condition
- **GST Compliant** — Challan number, HSN codes, triplicate copies, e-Way Bill threshold alerts
- **Office/Residence** — Delivery type toggle with conditional GSTIN field
- **Print / PDF / Email** — Print individual or all 3 copies, save as PDF, email with pre-filled details

## Quick Start

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`

## Deploy to Vercel

### Option 1: Vercel CLI
```bash
npm install -g vercel
vercel
```

### Option 2: GitHub → Vercel
1. Push this folder to a GitHub repo
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import the repo
4. Framework: Vite → Deploy

That's it. You'll get a URL like `firstbase-challan.vercel.app`.

### Option 3: Netlify
```bash
npm run build
# Upload the `dist/` folder to Netlify via drag-and-drop at app.netlify.com/drop
```

## Configuration

Company details are in `src/App.jsx` under `COMPANY_INFO`:

```js
const COMPANY_INFO = {
  name: "FBASE Remote IT Services (INDIA) Private Limited",
  address: "No. 43, Phase I, Hosur Road, Electronic City",
  city: "Bengaluru Urban, Karnataka 560100",
  gstin: "29AAGCF0820J1ZO",
  ...
};
```

Category pricing (New/Used book values) is in the `CATEGORIES` array.

## CSV Format

The app expects these column headers (from Firstbase order exports):

| Column | Used For |
|--------|----------|
| OrderReference | Groups lines into orders (one challan per unique value) |
| ShipToAddName | Consignee name |
| ShipToAddLine1 | Address line 1 |
| ShipToAddLine2 | Address line 2 (optional) |
| ShipToCity | City |
| ShipToZipCode | Pincode |
| ShipToRegionCode | State/region |
| ShipToTelephone | Phone |
| ShipToEmail | Email |
| Owner | Client company name |
| ItemCode | UUID mapped to category via mapping table |
| OrderQty | Quantity per line |
| MandatoryCondition | NEW or USED → sets book value |
| ProductName | (Optional) Auto-fills description field |
| Category | (Optional) Auto-maps to category, skips manual mapping |

## Future Enhancements

- [ ] Client GSTIN auto-lookup from reference sheet
- [ ] Google Drive auto-save (OAuth integration)
- [ ] e-Way Bill API integration (NIC portal)
- [ ] Bulk challan generation (all orders at once)
- [ ] Firstbase logo asset (replace SVG placeholder)
