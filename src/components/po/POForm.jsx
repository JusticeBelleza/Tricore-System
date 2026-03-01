import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Plus, Trash2 } from "lucide-react";

export default function POForm({ onClose, onSaved }) {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState([]);
  const [form, setForm] = useState({ supplier_id: "", expected_delivery_date: "", notes: "" });
  const [lineItems, setLineItems] = useState([{ product_id: "", variant_id: "", quantity_ordered: 1, unit_cost: 0 }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.Supplier.list("-name", 100),
      base44.entities.Product.list("-name", 200),
      base44.entities.ProductVariant.list("-created_date", 500),
    ]).then(([s, p, v]) => { setSuppliers(s); setProducts(p); setVariants(v); });
  }, []);

  const setLine = (i, k, v) => setLineItems(ls => ls.map((l, idx) => idx === i ? { ...l, [k]: v } : l));

  const variantsFor = (productId) => variants.filter(v => v.product_id === productId);

  const total = lineItems.reduce((s, l) => s + (parseFloat(l.unit_cost) || 0) * (parseFloat(l.quantity_ordered) || 0), 0);

  const handleSave = async () => {
    setSaving(true);
    const supplier = suppliers.find(s => s.id === form.supplier_id);
    const items = lineItems.map(l => {
      const product = products.find(p => p.id === l.product_id);
      const variant = variants.find(v => v.id === l.variant_id);
      return {
        product_id: l.product_id,
        variant_id: l.variant_id,
        product_name: product?.name || "",
        variant_name: variant?.variant_name || "",
        quantity_ordered: parseFloat(l.quantity_ordered) || 0,
        quantity_received: 0,
        base_multiplier: variant?.base_multiplier || 1,
        unit_cost: parseFloat(l.unit_cost) || 0,
        line_total: (parseFloat(l.quantity_ordered) || 0) * (parseFloat(l.unit_cost) || 0),
      };
    });

    const poNum = `PO-${Date.now().toString().slice(-6)}`;
    await base44.entities.PurchaseOrder.create({
      po_number: poNum,
      supplier_id: form.supplier_id,
      supplier_name: supplier?.name || "",
      status: "sent",
      expected_delivery_date: form.expected_delivery_date,
      notes: form.notes,
      subtotal: total,
      total_amount: total,
      items,
    });
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Create Purchase Order</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Supplier *</label>
              <select value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select supplier…</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Expected Delivery</label>
              <input type="date" value={form.expected_delivery_date} onChange={e => setForm(f => ({ ...f, expected_delivery_date: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-slate-700">Line Items</label>
              <button onClick={() => setLineItems(l => [...l, { product_id: "", variant_id: "", quantity_ordered: 1, unit_cost: 0 }])}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                <Plus size={13} /> Add Item
              </button>
            </div>
            {lineItems.map((l, i) => (
              <div key={i} className="grid grid-cols-5 gap-2 mb-2 items-end bg-slate-50 rounded-lg p-3">
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 block mb-1">Product</label>
                  <select value={l.product_id} onChange={e => setLine(i, "product_id", e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">Select…</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Variant</label>
                  <select value={l.variant_id} onChange={e => setLine(i, "variant_id", e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">—</option>
                    {variantsFor(l.product_id).map(v => <option key={v.id} value={v.id}>{v.variant_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Qty × Cost</label>
                  <div className="flex gap-1">
                    <input type="number" value={l.quantity_ordered} onChange={e => setLine(i, "quantity_ordered", e.target.value)}
                      className="w-14 border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none" />
                    <input type="number" step="0.01" value={l.unit_cost} onChange={e => setLine(i, "unit_cost", e.target.value)}
                      className="w-16 border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none" />
                  </div>
                </div>
                <button onClick={() => setLineItems(ls => ls.filter((_, idx) => idx !== i))}
                  className="flex justify-center text-slate-400 hover:text-red-500 pb-1.5">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end text-sm font-bold text-slate-800">
            Total: ${total.toFixed(2)}
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.supplier_id}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
            {saving ? "Saving…" : "Create PO"}
          </button>
        </div>
      </div>
    </div>
  );
}