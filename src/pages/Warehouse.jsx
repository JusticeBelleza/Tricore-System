import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Package, CheckCircle, Warehouse as WarehouseIcon, Download } from "lucide-react";
import { downloadPackingSlip } from "../components/orders/PackingSlip";

const statusColor = {
  approved: "bg-blue-100 text-blue-700",
  picking: "bg-purple-100 text-purple-700",
  packed: "bg-indigo-100 text-indigo-700",
};

export default function Warehouse() {
  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [variants, setVariants] = useState([]);
  const [active, setActive] = useState(null);
  const [updating, setUpdating] = useState(false);

  const load = async () => {
    const [o, picking, packed, i, v] = await Promise.all([
      base44.entities.Order.filter({ status: "approved" }),
      base44.entities.Order.filter({ status: "picking" }),
      base44.entities.Order.filter({ status: "packed" }),
      base44.entities.OrderItem.list("-created_date", 500),
      base44.entities.ProductVariant.list("-created_date", 500),
    ]);
    setOrders([...o, ...picking, ...packed]);
    setItems(i);
    setVariants(v);
  };

  useEffect(() => { load(); }, []);

  const orderItems = (orderId) => items.filter(i => i.order_id === orderId);

  // Core logic: convert base units → physical variant quantities
  const getPickList = (orderId) => {
    return orderItems(orderId).map(item => {
      const variant = variants.find(v => v.id === item.variant_id);
      const multiplier = item.base_multiplier || variant?.base_multiplier || 1;
      const physicalQty = item.quantity_variants; // already in variants
      return {
        ...item,
        variant_display: item.variant_name || "Unit",
        physical_qty: physicalQty,
        base_units_total: item.total_base_units || physicalQty * multiplier,
        bin_location: variant?.warehouse_location || "—",
      };
    });
  };

  const advance = async (order) => {
    setUpdating(true);
    const next = order.status === "approved" ? "picking" : "packed";
    await base44.entities.Order.update(order.id, { status: next });
    if (next === "packed") {
      downloadPackingSlip({ ...order, status: next }, orderItems(order.id));
    }
    await load();
    setActive(prev => prev?.id === order.id ? { ...order, status: next } : prev);
    setUpdating(false);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pick & Pack</h1>
        <p className="text-slate-500 text-sm mt-1">{orders.length} orders to fulfill</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Order Queue */}
        <div className="space-y-3">
          {orders.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
              <WarehouseIcon size={40} className="mx-auto text-slate-200 mb-3" />
              <p className="text-slate-400">No orders to pick</p>
            </div>
          )}
          {orders.map(order => (
            <div
              key={order.id}
              onClick={() => setActive(order)}
              className={`bg-white rounded-2xl border-2 p-4 cursor-pointer transition ${active?.id === order.id ? "border-blue-500 shadow-lg" : "border-slate-100 hover:border-slate-200"}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-semibold text-slate-800">Order #{order.order_number || order.id.slice(0, 8)}</div>
                  <div className="text-sm text-slate-500">{order.customer_name}</div>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor[order.status] || "bg-slate-100 text-slate-600"}`}>
                  {order.status}
                </span>
              </div>
              <div className="text-sm text-slate-500">{orderItems(order.id).length} line items</div>
            </div>
          ))}
        </div>

        {/* Pick List */}
        {active && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900">Pick List</h2>
                <p className="text-sm text-slate-500">Order #{active.order_number || active.id.slice(0, 8)}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor[active.status] || "bg-slate-100 text-slate-600"}`}>
                {active.status}
              </span>
            </div>

            <div className="p-5 space-y-3">
              {getPickList(active.id).map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Package size={16} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-800 text-sm">{item.product_name}</div>
                    <div className="text-2xl font-black text-blue-600 leading-tight">
                      {item.physical_qty} <span className="text-base font-semibold text-slate-600">{item.variant_display}</span>
                    </div>
                    <div className="text-xs text-slate-400">= {item.base_units_total} base units</div>
                    {item.bin_location !== "—" && (
                      <div className="text-xs text-slate-500 mt-1">📍 Bin: {item.bin_location}</div>
                    )}
                  </div>
                  <CheckCircle size={20} className="text-slate-200 mt-1 flex-shrink-0" />
                </div>
              ))}
            </div>

            <div className="px-5 py-4 border-t border-slate-100 flex gap-3 flex-wrap">
              <button onClick={() => setActive(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition">
                Close
              </button>
              <button
                onClick={() => downloadPackingSlip(active, orderItems(active.id))}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition">
                <Download size={14} /> Packing Slip
              </button>
              {active.status !== "packed" && (
                <button onClick={() => advance(active)} disabled={updating}
                  className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60">
                  {updating ? "Updating…" : active.status === "approved" ? "Start Picking →" : "Mark Packed ✓"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}