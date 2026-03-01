import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, ShoppingCart, ChevronDown, ChevronUp } from "lucide-react";

const statusColor = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-blue-100 text-blue-700",
  picking: "bg-indigo-100 text-indigo-700",
  packed: "bg-purple-100 text-purple-700",
  out_for_delivery: "bg-orange-100 text-orange-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

function OrderRow({ order }) {
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState([]);

  const handleExpand = async () => {
    if (!expanded && items.length === 0) {
      const data = await base44.entities.OrderItem.filter({ order_id: order.id });
      setItems(data);
    }
    setExpanded(e => !e);
  };

  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <button onClick={handleExpand} className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition text-left">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-800">#{order.order_number || order.id.slice(-6).toUpperCase()}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusColor[order.status] || "bg-slate-100 text-slate-600"}`}>
            {order.status?.replace(/_/g, " ")}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-slate-700">${(order.total_amount || 0).toFixed(2)}</span>
          <span className="text-xs text-slate-400">{order.created_date ? new Date(order.created_date).toLocaleDateString() : "—"}</span>
          {expanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </div>
      </button>
      {expanded && (
        <div className="border-t border-slate-100 px-4 py-3 bg-slate-50 space-y-1.5">
          {items.length === 0 ? (
            <p className="text-xs text-slate-400">No items found.</p>
          ) : (
            items.map(item => (
              <div key={item.id} className="flex items-center justify-between text-xs text-slate-600">
                <span>{item.product_name} {item.variant_name ? `(${item.variant_name})` : ""} × {item.quantity_variants}</span>
                <span className="font-medium">${(item.line_total || 0).toFixed(2)}</span>
              </div>
            ))
          )}
          <div className="border-t border-slate-200 pt-2 flex justify-between text-xs font-semibold text-slate-700 mt-1">
            <span>Total</span>
            <span>${(order.total_amount || 0).toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrderHistoryPanel({ company, onClose }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Order.filter({ company_id: company.id }, "-created_date", 50)
      .then(setOrders)
      .finally(() => setLoading(false));
  }, [company.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Order History</h2>
            <p className="text-sm text-slate-500">{company.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading ? (
            <p className="text-center text-slate-400 text-sm py-10">Loading...</p>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart size={36} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-400 text-sm">No orders found</p>
            </div>
          ) : (
            orders.map(order => <OrderRow key={order.id} order={order} />)
          )}
        </div>
      </div>
    </div>
  );
}