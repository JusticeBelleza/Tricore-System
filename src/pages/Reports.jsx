import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { TrendingUp, ShoppingCart, Package, Truck, Download } from "lucide-react";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const StatCard = ({ label, value, sub, icon: Icon, color }) => (
  <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-slate-500 text-xs font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
    </div>
  </div>
);

export default function Reports() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [range, setRange] = useState("30");

  useEffect(() => {
    Promise.all([
      base44.entities.Order.list("-created_date", 500),
      base44.entities.Product.list("-created_date", 200),
      base44.entities.OrderItem.list("-created_date", 1000),
      base44.entities.Company.list("-created_date", 100),
    ]).then(([o, p, oi, c]) => {
      setOrders(o); setProducts(p); setOrderItems(oi); setCompanies(c);
    });
  }, []);

  const days = parseInt(range);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const filteredOrders = orders.filter(o => o.created_date && new Date(o.created_date) >= cutoff);

  // Revenue by day
  const revenueByDay = Array.from({ length: days <= 30 ? days : Math.ceil(days / 7) }, (_, i) => {
    const d = new Date();
    const step = days <= 30 ? 1 : 7;
    d.setDate(d.getDate() - (days - 1 - i * step));
    const label = days <= 30
      ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const weekOrders = filteredOrders.filter(o => {
      const od = new Date(o.created_date);
      const diff = (d - od) / 86400000;
      return diff >= 0 && diff < step;
    });
    return {
      label,
      revenue: weekOrders.reduce((s, o) => s + (o.total_amount || 0), 0),
      orders: weekOrders.length,
    };
  });

  // Orders by status
  const statusCounts = {};
  filteredOrders.forEach(o => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name: name.replace(/_/g, " "), value }));

  // Revenue by customer type
  const b2bRevenue = filteredOrders.filter(o => o.customer_type === "B2B").reduce((s, o) => s + (o.total_amount || 0), 0);
  const retailRevenue = filteredOrders.filter(o => o.customer_type === "Retail").reduce((s, o) => s + (o.total_amount || 0), 0);
  const typeData = [
    { name: "B2B", value: b2bRevenue },
    { name: "Retail", value: retailRevenue },
  ];

  // Top products by revenue
  const productRevMap = {};
  orderItems.forEach(item => {
    if (!item.product_name) return;
    productRevMap[item.product_name] = (productRevMap[item.product_name] || 0) + (item.line_total || 0);
  });
  const topProducts = Object.entries(productRevMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, revenue]) => ({ name: name.length > 20 ? name.slice(0, 18) + "…" : name, revenue }));

  // Summary stats
  const totalRevenue = filteredOrders.reduce((s, o) => s + (o.total_amount || 0), 0);
  const avgOrderValue = filteredOrders.length ? totalRevenue / filteredOrders.length : 0;
  const deliveredOrders = filteredOrders.filter(o => o.status === "delivered").length;
  const deliveryRate = filteredOrders.length ? (deliveredOrders / filteredOrders.length * 100).toFixed(1) : 0;

  const exportCSV = () => {
    const rows = filteredOrders.map(o => [
      o.order_number || o.id.slice(0, 8),
      o.customer_name || "",
      o.customer_type || "",
      o.status || "",
      o.total_amount || 0,
      o.payment_method || "",
      o.created_date ? new Date(o.created_date).toLocaleDateString() : "",
    ]);
    const csv = [["Order#","Customer","Type","Status","Total","Payment","Date"], ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "tricore_report.csv"; a.click();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
          <p className="text-slate-500 text-sm mt-1">Business performance overview</p>
        </div>
        <div className="flex gap-3">
          <select value={range} onChange={e => setRange(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last 365 days</option>
          </select>
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm hover:bg-slate-50 transition">
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={`$${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon={TrendingUp} color="bg-blue-500" sub={`Last ${range} days`} />
        <StatCard label="Total Orders" value={filteredOrders.length} icon={ShoppingCart} color="bg-green-500" sub={`Last ${range} days`} />
        <StatCard label="Avg Order Value" value={`$${avgOrderValue.toFixed(2)}`} icon={Package} color="bg-amber-500" sub="Per order" />
        <StatCard label="Delivery Rate" value={`${deliveryRate}%`} icon={Truck} color="bg-purple-500" sub={`${deliveredOrders} delivered`} />
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-slate-800 font-semibold mb-4">Revenue Over Time</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={revenueByDay}>
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
              formatter={(v) => [`$${v.toFixed(2)}`, "Revenue"]}
            />
            <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Orders by Status */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-slate-800 font-semibold mb-4">Orders by Status</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* B2B vs Retail */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-slate-800 font-semibold mb-4">Revenue by Customer Type</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={typeData} barSize={48}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
                formatter={(v) => [`$${v.toFixed(2)}`, "Revenue"]}
              />
              <Bar dataKey="revenue" radius={[8, 8, 0, 0]}>
                {typeData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-slate-800 font-semibold mb-4">Top Products by Revenue</h2>
        {topProducts.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">No product data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topProducts} layout="vertical" barSize={18}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={140} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
                formatter={(v) => [`$${v.toFixed(2)}`, "Revenue"]}
              />
              <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
                {topProducts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Orders Table Summary */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-slate-800 font-semibold">Recent Orders</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                {["Order #","Customer","Type","Total","Status","Date"].map(h => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredOrders.slice(0, 10).map(order => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 text-sm font-mono font-medium text-blue-600">{order.order_number || order.id.slice(0, 8)}</td>
                  <td className="px-6 py-3 text-sm text-slate-700">{order.customer_name || "—"}</td>
                  <td className="px-6 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${order.customer_type === "B2B" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                      {order.customer_type}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm font-semibold text-slate-800">${(order.total_amount || 0).toFixed(2)}</td>
                  <td className="px-6 py-3">
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-600 capitalize">
                      {order.status?.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-500">{order.created_date ? new Date(order.created_date).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">No orders in this period</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}