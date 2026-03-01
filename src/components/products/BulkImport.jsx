import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { X, Upload, Download, CheckCircle, AlertCircle } from "lucide-react";

export default function BulkImport({ onClose, onSaved }) {
  const [rows, setRows] = useState([]);
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef();

  const parseCSV = (text) => {
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
    return lines.slice(1).map(line => {
      const vals = line.split(",").map(v => v.trim().replace(/"/g, ""));
      return headers.reduce((obj, h, i) => { obj[h] = vals[i] || ""; return obj; }, {});
    });
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result);
      const errs = [];
      parsed.forEach((r, i) => {
        if (!r.product_name) errs.push(`Row ${i + 2}: missing product_name`);
        if (!r.base_sku) errs.push(`Row ${i + 2}: missing base_sku`);
        if (!r.retail_base_price || isNaN(parseFloat(r.retail_base_price))) errs.push(`Row ${i + 2}: invalid retail_base_price`);
        if (r.variant_sku && (!r.base_multiplier || isNaN(parseFloat(r.base_multiplier)))) {
          errs.push(`Row ${i + 2}: variant_sku present but base_multiplier missing or invalid`);
        }
      });
      setErrors(errs);
      setRows(parsed);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (errors.length) return;
    setSaving(true);
    // Group rows by base_sku
    const productMap = {};
    for (const r of rows) {
      if (!productMap[r.base_sku]) {
        productMap[r.base_sku] = {
          name: r.product_name,
          base_sku: r.base_sku,
          base_unit_name: r.base_unit_name || "Each",
          retail_base_price: parseFloat(r.retail_base_price),
          category: r.category || "Other",
          manufacturer: r.manufacturer || "",
          status: "active",
          variants: [],
        };
      }
      if (r.variant_name && r.variant_sku) {
        productMap[r.base_sku].variants.push({
          variant_name: r.variant_name,
          variant_sku: r.variant_sku,
          base_multiplier: parseFloat(r.base_multiplier) || 1,
          retail_price: parseFloat(r.variant_price) || 0,
          status: "active",
        });
      }
    }

    for (const [, p] of Object.entries(productMap)) {
      const { variants, ...productData } = p;
      // Check if exists
      const existing = await base44.entities.Product.filter({ base_sku: productData.base_sku });
      let productId;
      if (existing.length) {
        await base44.entities.Product.update(existing[0].id, productData);
        productId = existing[0].id;
      } else {
        const created = await base44.entities.Product.create(productData);
        productId = created.id;
        await base44.entities.Inventory.create({ product_id: productId, base_units_on_hand: 0 });
      }
      for (const v of variants) {
        const existingV = await base44.entities.ProductVariant.filter({ variant_sku: v.variant_sku });
        if (existingV.length) {
          await base44.entities.ProductVariant.update(existingV[0].id, { ...v, product_id: productId });
        } else {
          await base44.entities.ProductVariant.create({ ...v, product_id: productId });
        }
      }
    }
    setSaving(false);
    setDone(true);
    setTimeout(onSaved, 1200);
  };

  const exportTemplate = () => {
    const headers = "product_name,base_sku,base_unit_name,retail_base_price,category,manufacturer,variant_name,variant_sku,base_multiplier,variant_price";
    const example = "Nitrile Gloves,GLV-001,Pair,0.25,Gloves,Medline,Box,GLV-001-BOX,100,24.99";
    const blob = new Blob([headers + "\n" + example], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "tricore_products_template.csv"; a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Bulk Import Products</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          <button onClick={exportTemplate}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
            <Download size={15} /> Download CSV Template
          </button>

          <div
            onClick={() => fileRef.current.click()}
            className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition"
          >
            <Upload size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">Click to upload CSV file</p>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          </div>

          {rows.length > 0 && errors.length === 0 && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle size={16} /> {rows.length} rows ready to import
            </div>
          )}

          {errors.length > 0 && (
            <div className="bg-red-50 rounded-xl p-4 space-y-1">
              {errors.map((e, i) => (
                <div key={i} className="flex items-start gap-2 text-red-600 text-xs">
                  <AlertCircle size={13} className="mt-0.5 flex-shrink-0" /> {e}
                </div>
              ))}
            </div>
          )}

          {done && (
            <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
              <CheckCircle size={16} /> Import complete!
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          <button
            onClick={handleImport}
            disabled={rows.length === 0 || errors.length > 0 || saving}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving ? "Importing…" : `Import ${rows.length} Rows`}
          </button>
        </div>
      </div>
    </div>
  );
}