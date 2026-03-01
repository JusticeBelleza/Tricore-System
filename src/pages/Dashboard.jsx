import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ShoppingCart, Package, Building2, TrendingUp, Clock, CheckCircle, AlertTriangle, Truck, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

const StatCard = ({ label, value, icon: Icon, color, sub }) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-slate-500 text-sm font-medium">{label}</p>
        <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
    </div>
  </div>
);

const toDateStr = (d) => d.toISOString().split("T")[0];

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [user, setUser] = useState(null);

  // Date filter for cards
  const today = new Date();
  const defaultFrom = new Date(today);
  defaultFrom.setDate(today.getDate() - 30);
  const [dateFrom, setDateFrom] = useState(toDateStr(defaultFrom));
  const [dateTo, setDateTo] = useState(toDateStr(today));

  // Date filter for chart
  const chart7From = new Date(today);
  chart7From.setDate(today.getDate() - 6);
  const [chartFrom, setChartFrom] = useState(toDateStr(chart7From));
  const [chartTo, setChartTo] = useState(toDateStr(today));

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    base44.entities.Order.list("-created_date", 500).then(setOrders);
    base44.entities.Product.list("-created_date", 20).then(setProducts);
    base44.entities.Company.list("-created_date", 20).then(setCompanies);
  }, []);

  // Orders filtered by card date range
  const filteredOrders = orders.filter(o => {
    if (!o.created_date) return false;
    const d = o.created_date.split("T")[0];
    return d >= dateFrom && d <= dateTo;
  });

  const pending = filteredOrders.filter(o => o.status === "pending").length;
  const delivered = filteredOrders.filter(o => o.status === "delivered").length;
  const outForDelivery = filteredOrders.filter(o => o.status === "out_for_delivery").length;
  const totalRevenue = filteredOrders.reduce((s, o) => s + (o.total_amount || 0), 0);

  const recentOrders = orders.slice(0, 8);

  const statusColor = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-blue-100 text-blue-700",
    picking: "bg-purple-100 text-purple-700",
    packed: "bg-indigo-100 text-indigo-700",
    out_for_delivery: "bg-orange-100 text-orange-700",
    delivered: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };

  // Chart data: custom date range, day by day
  const chartDays = (() => {
    const days = [];
    const from = new Date(chartFrom);
    const to = new Date(chartTo);
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const key = toDateStr(new Date(d));
      const dayOrders = orders.filter(o => o.created_date?.startsWith(key));
      days.push({
        day: new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        orders: dayOrders.length,
        revenue: dayOrders.reduce((s, o) => s + (o.total_amount || 0), 0),
      });
    }
    return days;
  })();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-slate-500 text-sm mt-1">Here's what's happening at Tricore today.</p>
        </div>
        {/* Card Date Filter */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
          <Calendar size={15} className="text-slate-400 flex-shrink-0" />
          <label className="text-xs text-slate-500 font-medium">From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="text-sm text-slate-700 border-0 outline-none bg-transparent" />
          <span className="text-slate-300">–</span>
          <label className="text-xs text-slate-500 font-medium">To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="text-sm text-slate-700 border-0 outline-none bg-transparent" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Orders" value={filteredOrders.length} icon={ShoppingCart} color="bg-blue-500" sub={`${dateFrom} → ${dateTo}`} />
        <StatCard label="Pending Approval" value={pending} icon={Clock} color="bg-amber-500" sub="Awaiting review" />
        <StatCard label="Out for Delivery" value={outForDelivery} icon={Truck} color="bg-orange-500" sub="Active routes" />
        <StatCard label="Revenue" value={`$${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 0 })}`} icon={TrendingUp} color="bg-green-500" sub={`${dateFrom} → ${dateTo}`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-slate-800 font-semibold">Orders — By Date</h2>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <Calendar size={13} className="text-slate-400 flex-shrink-0" />
              <input type="date" value={chartFrom} onChange={e => setChartFrom(e.target.value)}
                className="text-xs text-slate-700 border-0 outline-none bg-transparent" />
              <span className="text-slate-300 text-xs">–</span>
              <input type="date" value={chartTo} onChange={e => setChartTo(e.target.value)}
                className="text-xs text-slate-700 border-0 outline-none bg-transparent" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartDays} barSize={28}>
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
                cursor={{ fill: "#f1f5f9" }}
              />
              <Bar dataKey="orders" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
          <h2 className="text-slate-800 font-semibold">Quick Stats</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <span className="text-slate-500 text-sm">Active Products</span>
              <span className="font-bold text-slate-800">{products.filter(p => p.status === "active").length}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <span className="text-slate-500 text-sm">B2B Companies</span>
              <span className="font-bold text-slate-800">{companies.filter(c => c.account_type === "B2B").length}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <span className="text-slate-500 text-sm">Delivered Today</span>
              <span className="font-bold text-slate-800">{delivered}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-500 text-sm">Cancelled</span>
              <span className="font-bold text-red-500">{orders.filter(o => o.status === "cancelled").length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-slate-800 font-semibold">Recent Orders</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Order #</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recentOrders.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-400">No orders yet</td></tr>
              )}
              {recentOrders.map(order => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-mono font-medium text-blue-600">{order.order_number || order.id.slice(0, 8)}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{order.customer_name || "—"}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${order.customer_type === "B2B" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                      {order.customer_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-800">${(order.total_amount || 0).toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${statusColor[order.status] || "bg-slate-100 text-slate-600"}`}>
                      {order.status?.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {order.created_date ? new Date(order.created_date).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}