import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ShoppingCart, Package, ChevronDown, ChevronUp, Clock } from "lucide-react";

const STATUS_COLORS = {
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

  const loadItems = async () => {
    if (!expanded) {
      const data = await base44.entities.OrderItem.filter({ order_id: order.id });
      setItems(data);
    }
    setExpanded(e => !e);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50 transition"
        onClick={loadItems}
      >
        <div className="flex items-center gap-4">
          <div>
            <div className="font-semibold text-slate-800 text-sm font-mono">
              {order.order_number || order.id.slice(0, 8)}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {order.created_date ? new Date(order.created_date).toLocaleDateString() : "—"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[order.status] || "bg-slate-100 text-slate-600"}`}>
            {order.status?.replace(/_/g, " ")}
          </span>
          <span className="font-bold text-slate-800 text-sm">${(order.total_amount || 0).toFixed(2)}</span>
          {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4 bg-slate-50 space-y-3">
          {/* Order details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-500">
            <div><span className="font-medium text-slate-700 block">Payment</span>{order.payment_method?.replace(/_/g, " ")}</div>
            <div><span className="font-medium text-slate-700 block">Payment Status</span>{order.payment_status}</div>
            <div><span className="font-medium text-slate-700 block">Ship To</span>{[order.shipping_city, order.shipping_state].filter(Boolean).join(", ") || "—"}</div>
            <div><span className="font-medium text-slate-700 block">Type</span>{order.customer_type}</div>
          </div>

          {/* Items */}
          {items.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-600 mb-1">Items</div>
              {items.map(item => (
                <div key={item.id} className="flex justify-between text-sm bg-white rounded-lg px-3 py-2">
                  <span className="text-slate-700">{item.product_name} {item.variant_name && `(${item.variant_name})`} × {item.quantity_variants}</span>
                  <span className="font-medium text-slate-800">${(item.line_total || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Totals */}
          <div className="bg-white rounded-xl px-4 py-3 text-sm space-y-1">
            <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>${(order.subtotal || 0).toFixed(2)}</span></div>
            <div className="flex justify-between text-slate-500"><span>Tax</span><span>${(order.tax_amount || 0).toFixed(2)}</span></div>
            <div className="flex justify-between font-bold text-slate-900 border-t border-slate-100 pt-1 mt-1"><span>Total</span><span>${(order.total_amount || 0).toFixed(2)}</span></div>
          </div>

          {order.notes && (
            <div className="text-xs text-slate-500 bg-white rounded-lg px-3 py-2">
              <span className="font-medium text-slate-700">Notes: </span>{order.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const init = async () => {
      const u = await base44.auth.me().catch(() => null);
      setUser(u);
      if (u) {
        const data = await base44.entities.Order.filter({ customer_email: u.email }, "-created_date", 100);
        setOrders(data);
      }
      setLoading(false);
    };
    init();
  }, []);

  const statuses = ["all", ...new Set(orders.map(o => o.status).filter(Boolean))];
  const filtered = statusFilter === "all" ? orders : orders.filter(o => o.status === statusFilter);

  const totalSpent = orders.filter(o => o.status !== "cancelled").reduce((s, o) => s + (o.total_amount || 0), 0);
  const activeOrders = orders.filter(o => !["delivered", "cancelled"].includes(o.status)).length;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Orders</h1>
        <p className="text-slate-500 text-sm mt-1">{orders.length} order{orders.length !== 1 ? "s" : ""} total</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="text-xs text-slate-500 font-medium">Total Orders</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{orders.length}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="text-xs text-slate-500 font-medium">Active</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{activeOrders}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 col-span-2 sm:col-span-1">
          <div className="text-xs text-slate-500 font-medium">Total Spent</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">${totalSpent.toFixed(2)}</div>
        </div>
      </div>

      {/* Filters */}
      {statuses.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {statuses.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition capitalize ${statusFilter === s ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              {s === "all" ? "All" : s.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      )}

      {/* Orders */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading orders…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingCart size={40} className="mx-auto text-slate-200 mb-3" />
          <p className="text-slate-400">No orders yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => <OrderRow key={order.id} order={order} />)}
        </div>
      )}
    </div>
  );
}