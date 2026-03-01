import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, CheckCircle } from "lucide-react";

export default function POReceive({ po, onClose, onSaved }) {
  const [quantities, setQuantities] = useState(
    (po.items || []).reduce((acc, item, i) => { acc[i] = item.quantity_ordered; return acc; }, {})
  );
  const [saving, setSaving] = useState(false);

  const handleReceive = async () => {
    setSaving(true);
    const items = po.items || [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const received = parseFloat(quantities[i]) || 0;
      const baseUnitsReceived = received * (item.base_multiplier || 1);

      // Update inventory
      const invs = await base44.entities.Inventory.filter({ product_id: item.product_id });
      if (invs.length) {
        await base44.entities.Inventory.update(invs[0].id, {
          base_units_on_hand: (invs[0].base_units_on_hand || 0) + baseUnitsReceived
        });
      } else if (item.product_id) {
        await base44.entities.Inventory.create({
          product_id: item.product_id,
          base_units_on_hand: baseUnitsReceived
        });
      }
    }

    const updatedItems = items.map((item, i) => ({
      ...item,
      quantity_received: parseFloat(quantities[i]) || 0,
    }));

    await base44.entities.PurchaseOrder.update(po.id, {
      status: "received",
      received_date: new Date().toISOString().split("T")[0],
      items: updatedItems,
    });

    setSaving(false);
    onSaved();
  };

  const items = po.items || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Receive PO #{po.po_number}</h2>
            <p className="text-sm text-slate-500">From: {po.supplier_name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-3">
          <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
            Received quantities will be multiplied by base_multiplier and added to inventory.
          </p>

          {items.map((item, i) => (
            <div key={i} className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="font-medium text-slate-800 text-sm">{item.product_name}</div>
                  <div className="text-xs text-slate-500">{item.variant_name} (×{item.base_multiplier} base units each)</div>
                  <div className="text-xs text-slate-400">Ordered: {item.quantity_ordered}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <label className="text-xs text-slate-500">Qty Received</label>
                  <input
                    type="number"
                    min="0"
                    value={quantities[i]}
                    onChange={e => setQuantities(q => ({ ...q, [i]: e.target.value }))}
                    className="w-20 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                  <div className="text-xs text-blue-600 font-medium">
                    = {(parseFloat(quantities[i]) || 0) * (item.base_multiplier || 1)} base units
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={handleReceive} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition disabled:opacity-60">
            <CheckCircle size={16} /> {saving ? "Processing…" : "Confirm Receipt"}
          </button>
        </div>
      </div>
    </div>
  );
}