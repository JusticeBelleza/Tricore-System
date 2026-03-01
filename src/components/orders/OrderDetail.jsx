import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, ChevronRight } from "lucide-react";
import { downloadPackingSlip } from "./PackingSlip";

const STATUS_FLOW = ["pending","approved","picking","packed","out_for_delivery","delivered"];

const statusColor = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  picking: "bg-purple-100 text-purple-700",
  packed: "bg-indigo-100 text-indigo-700",
  out_for_delivery: "bg-orange-100 text-orange-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function OrderDetail({ order, onClose, onUpdated }) {
  const [items, setItems] = useState([]);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    base44.entities.OrderItem.filter({ order_id: order.id }).then(setItems);
  }, [order.id]);

  const advance = async () => {
    const idx = STATUS_FLOW.indexOf(order.status);
    if (idx < 0 || idx >= STATUS_FLOW.length - 1) return;
    setUpdating(true);
    const newStatus = STATUS_FLOW[idx + 1];
    await base44.entities.Order.update(order.id, { status: newStatus });

    // Download packing slip when marked as packed
    if (newStatus === "packed") {
      downloadPackingSlip({ ...order, status: newStatus }, items);
    }

    // Deduct inventory on delivery
    if (newStatus === "delivered") {
      for (const item of items) {
        const invs = await base44.entities.Inventory.filter({ product_id: item.product_id });
        if (invs.length) {
          const inv = invs[0];
          await base44.entities.Inventory.update(inv.id, {
            base_units_on_hand: Math.max(0, (inv.base_units_on_hand || 0) - (item.total_base_units || 0))
          });
        }
      }
    }
    setUpdating(false);
    onUpdated();
  };

  const idx = STATUS_FLOW.indexOf(order.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Order #{order.order_number || order.id.slice(0,8)}</h2>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[order.status] || "bg-slate-100 text-slate-600"}`}>
              {order.status?.replace(/_/g, " ")}
            </span>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-6">
          {/* Progress */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {STATUS_FLOW.map((s, i) => (
              <div key={s} className="flex items-center gap-1 flex-shrink-0">
                <div className={`text-xs px-2 py-1 rounded-full font-medium ${i <= idx ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                  {s.replace(/_/g, " ")}
                </div>
                {i < STATUS_FLOW.length - 1 && <ChevronRight size={12} className="text-slate-300" />}
              </div>
            ))}
          </div>

          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold mb-1">Customer</p>
              <p className="text-sm font-medium text-slate-800">{order.customer_name}</p>
              <p className="text-sm text-slate-500">{order.customer_email}</p>
              <p className="text-sm text-slate-500">{order.customer_phone}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold mb-1">Ship To</p>
              <p className="text-sm text-slate-700">{order.shipping_address}</p>
              <p className="text-sm text-slate-700">{order.shipping_city}, {order.shipping_state} {order.shipping_zip}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold mb-1">Payment</p>
              <p className="text-sm text-slate-700 capitalize">{order.payment_method?.replace(/_/g, " ")}</p>
              <p className={`text-sm font-medium ${order.payment_status === "paid" ? "text-green-600" : "text-amber-600"}`}>
                {order.payment_status}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold mb-1">Totals</p>
              <p className="text-sm text-slate-600">Subtotal: ${(order.subtotal || 0).toFixed(2)}</p>
              <p className="text-sm text-slate-600">Tax: ${(order.tax_amount || 0).toFixed(2)}</p>
              <p className="text-sm font-bold text-slate-900">Total: ${(order.total_amount || 0).toFixed(2)}</p>
            </div>
          </div>

          {/* Items */}
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold mb-2">Line Items</p>
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead><tr className="bg-slate-50">
                  <th className="text-left px-4 py-2 text-xs text-slate-500">Product</th>
                  <th className="text-left px-4 py-2 text-xs text-slate-500">Variant</th>
                  <th className="text-right px-4 py-2 text-xs text-slate-500">Qty</th>
                  <th className="text-right px-4 py-2 text-xs text-slate-500">Base Units</th>
                  <th className="text-right px-4 py-2 text-xs text-slate-500">Total</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {items.map(item => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-sm text-slate-800">{item.product_name}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{item.variant_name}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-700">{item.quantity_variants}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-500">{item.total_base_units}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-slate-800">${(item.line_total || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {order.notes && (
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold mb-1">Notes</p>
              <p className="text-sm text-slate-600">{order.notes}</p>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Close</button>
          {order.status !== "delivered" && order.status !== "cancelled" && (
            <button onClick={advance} disabled={updating}
              className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-60">
              {updating ? "Updating…" : `Advance → ${STATUS_FLOW[idx + 1]?.replace(/_/g, " ")}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}