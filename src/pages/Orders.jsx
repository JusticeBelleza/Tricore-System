import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Search, Filter, CheckCircle, Eye, FileText, Download, Package, Clock } from "lucide-react";
import OrderDetail from "../components/orders/OrderDetail";
import InvoiceGenerator from "../components/orders/InvoiceGenerator";
import { downloadPackingSlip } from "../components/orders/PackingSlip";

const STATUS_OPTIONS = ["all","pending","approved","picking","packed","out_for_delivery","delivered","cancelled"];

const statusColor = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  picking: "bg-purple-100 text-purple-700",
  packed: "bg-indigo-100 text-indigo-700",
  out_for_delivery: "bg-orange-100 text-orange-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const ALL_COLS = {
  order_number: "Order #",
  customer: "Customer",
  address: "Address",
  type: "Type",
  total: "Total",
  status: "Status",
  product_title: "Product Title",
  variant_title: "Variant Title",
  sku: "SKU",
  quantity: "Quantity",
  payment: "Payment",
  date: "Date",
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [orderItems, setOrderItems] = useState({}); // { orderId: [items] }
  const [filter, setFilter] = useState({ status: "all", type: "all", search: "", dateFrom: "", dateTo: "" });
  const [selected, setSelected] = useState(null);
  const [invoiceOrder, setInvoiceOrder] = useState(null);
  const [visibleCols, setVisibleCols] = useState(
    Object.fromEntries(Object.keys(ALL_COLS).map(k => [k, true]))
  );
  const [showColMenu, setShowColMenu] = useState(false);

  const load = async () => {
    const ords = await base44.entities.Order.list("-created_date", 200);
    setOrders(ords);
    // Fetch all order items for all orders
    const items = await base44.entities.OrderItem.list("-created_date", 2000);
    const grouped = {};
    items.forEach(item => {
      if (!grouped[item.order_id]) grouped[item.order_id] = [];
      grouped[item.order_id].push(item);
    });
    setOrderItems(grouped);
  };

  useEffect(() => { load(); }, []);

  const filtered = orders.filter(o => {
    const matchStatus = filter.status === "all" || o.status === filter.status;
    const matchType = filter.type === "all" || o.customer_type === filter.type;
    const matchSearch = !filter.search ||
      o.order_number?.toLowerCase().includes(filter.search.toLowerCase()) ||
      o.customer_name?.toLowerCase().includes(filter.search.toLowerCase()) ||
      o.customer_email?.toLowerCase().includes(filter.search.toLowerCase());
    const matchFrom = !filter.dateFrom || (o.created_date && o.created_date >= filter.dateFrom);
    const matchTo = !filter.dateTo || (o.created_date && o.created_date <= filter.dateTo + "T23:59:59");
    return matchStatus && matchType && matchSearch && matchFrom && matchTo;
  });

  const handleApprove = async (order) => {
    await base44.entities.Order.update(order.id, { status: "approved" });
    load();
  };

  // Build flat rows: one row per order item (or one row per order if no items)
  const flatRows = filtered.flatMap(order => {
    const items = orderItems[order.id];
    if (items && items.length > 0) {
      return items.map((item, idx) => ({ order, item, isFirst: idx === 0, rowSpan: items.length }));
    }
    return [{ order, item: null, isFirst: true, rowSpan: 1 }];
  });

  const exportCSV = () => {
    const activeCols = Object.keys(ALL_COLS).filter(k => visibleCols[k]);
    const headers = activeCols.map(k => ALL_COLS[k]);
    const rows = flatRows.map(({ order: o, item }) => activeCols.map(h => {
      if (h === "order_number") return o.order_number || o.id.slice(0,8);
      if (h === "customer") return o.customer_name || "";
      if (h === "address") return [o.shipping_address, o.shipping_city, o.shipping_state, o.shipping_zip].filter(Boolean).join(", ");
      if (h === "type") return o.customer_type || "";
      if (h === "total") return o.total_amount || 0;
      if (h === "status") return o.status || "";
      if (h === "product_title") return item?.product_name || "";
      if (h === "variant_title") return item?.variant_name || "";
      if (h === "sku") return item?.sku || "";
      if (h === "quantity") return item?.quantity_variants || "";
      if (h === "payment") return o.payment_method || "";
      if (h === "date") return o.created_date ? new Date(o.created_date).toLocaleDateString() : "";
      return "";
    }));
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "tricore_orders.csv"; a.click();
  };

  const exportPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "landscape" });
    const activeCols = Object.keys(ALL_COLS).filter(k => visibleCols[k]);
    const startX = 14;
    const tableW = 268; // landscape usable width
    const cellPad = 3;
    let y = 14;

    doc.setFontSize(14); doc.setFont(undefined, "bold");
    doc.text("Tricore Medical Supply — Order Report", startX, y);
    y += 7;
    doc.setFontSize(8); doc.setFont(undefined, "normal"); doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, startX, y);
    y += 8;

    // Auto-fit column widths
    doc.setFontSize(8);
    const colWidths = activeCols.map((k) => {
      doc.setFont(undefined, "bold");
      let maxW = doc.getTextWidth(ALL_COLS[k]);
      flatRows.forEach(({ order: o, item }) => {
        doc.setFont(undefined, "normal");
        let val = "";
        if (k === "order_number") val = o.order_number || o.id.slice(0,8);
        else if (k === "customer") val = o.customer_name || "—";
        else if (k === "address") val = [o.shipping_address, o.shipping_city].filter(Boolean).join(", ").slice(0,30);
        else if (k === "type") val = o.customer_type || "";
        else if (k === "total") val = `$${(o.total_amount||0).toFixed(2)}`;
        else if (k === "status") val = (o.status||"").replace(/_/g," ");
        else if (k === "product_title") val = (item?.product_name || "").slice(0,28);
        else if (k === "variant_title") val = (item?.variant_name || "").slice(0,18);
        else if (k === "sku") val = item?.sku || "";
        else if (k === "quantity") val = item ? String(item.quantity_variants || "") : "";
        else if (k === "payment") val = (o.payment_method||"").replace(/_/g," ");
        else if (k === "date") val = o.created_date ? new Date(o.created_date).toLocaleDateString() : "—";
        maxW = Math.max(maxW, doc.getTextWidth(val));
      });
      return maxW + cellPad * 2;
    });

    const totalW = colWidths.reduce((a, b) => a + b, 0);
    const scale = tableW / totalW;
    const finalWidths = colWidths.map(w => w * scale);

    // Header
    doc.setFillColor(37, 99, 235); doc.setTextColor(255,255,255);
    doc.setFont(undefined, "bold");
    doc.rect(startX, y, tableW, 7, "F");
    let cx = startX;
    activeCols.forEach((k, i) => { doc.text(ALL_COLS[k], cx + cellPad, y + 5); cx += finalWidths[i]; });
    y += 7;

    doc.setFont(undefined, "normal");
    flatRows.forEach(({ order: o, item }, rowIdx) => {
      if (y > 195) { doc.addPage(); y = 14; }
      if (rowIdx % 2 === 0) { doc.setFillColor(248,250,252); doc.rect(startX, y, tableW, 7, "F"); }
      doc.setTextColor(30,41,59);
      cx = startX;
      activeCols.forEach((k, i) => {
        let val = "";
        if (k === "order_number") val = o.order_number || o.id.slice(0,8);
        else if (k === "customer") val = o.customer_name || "—";
        else if (k === "address") val = [o.shipping_address, o.shipping_city].filter(Boolean).join(", ").slice(0,30);
        else if (k === "type") val = o.customer_type || "";
        else if (k === "total") val = `$${(o.total_amount||0).toFixed(2)}`;
        else if (k === "status") val = (o.status||"").replace(/_/g," ");
        else if (k === "product_title") val = (item?.product_name || "").slice(0,28);
        else if (k === "variant_title") val = (item?.variant_name || "").slice(0,18);
        else if (k === "sku") val = item?.sku || "";
        else if (k === "quantity") val = item ? String(item.quantity_variants || "") : "";
        else if (k === "payment") val = (o.payment_method||"").replace(/_/g," ");
        else if (k === "date") val = o.created_date ? new Date(o.created_date).toLocaleDateString() : "—";
        doc.text(val, cx + cellPad, y + 5);
        cx += finalWidths[i];
      });
      y += 7;
    });
    doc.save(`tricore_orders_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="text-slate-500 text-sm mt-1">{filtered.length} orders</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <button onClick={() => setShowColMenu(!showColMenu)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm hover:bg-slate-50 transition">
              <Filter size={15} /> Columns
            </button>
            {showColMenu && (
              <div className="absolute right-0 top-10 z-20 bg-white rounded-xl shadow-lg border border-slate-100 p-3 w-48 space-y-1">
                {Object.entries(ALL_COLS).map(([col, label]) => (
                  <label key={col} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={visibleCols[col]}
                      onChange={e => setVisibleCols(v => ({ ...v, [col]: e.target.checked }))}
                      className="rounded" />
                    {label}
                  </label>
                ))}
              </div>
            )}
          </div>
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm hover:bg-slate-50 transition">
            <Download size={15} /> CSV
          </button>
          <button onClick={exportPDF}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm hover:bg-slate-50 transition">
            <FileText size={15} /> PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
            placeholder="Search orders..."
            className="pl-8 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-56" />
        </div>
        <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
          className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s === "all" ? "All Statuses" : s.replace(/_/g, " ")}</option>)}
        </select>
        <select value={filter.type} onChange={e => setFilter(f => ({ ...f, type: e.target.value }))}
          className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="all">All Types</option>
          <option value="B2B">B2B</option>
          <option value="Retail">Retail</option>
        </select>
        <input type="date" value={filter.dateFrom} onChange={e => setFilter(f => ({ ...f, dateFrom: e.target.value }))}
          className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" title="From date" />
        <input type="date" value={filter.dateTo} onChange={e => setFilter(f => ({ ...f, dateTo: e.target.value }))}
          className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" title="To date" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {visibleCols.order_number && <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Order #</th>}
                {visibleCols.customer && <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Customer</th>}
                {visibleCols.address && <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Address</th>}
                {visibleCols.type && <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Type</th>}
                {visibleCols.total && <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Total</th>}
                {visibleCols.status && <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Status</th>}
                {visibleCols.product_title && <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Product Title</th>}
                {visibleCols.variant_title && <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Variant Title</th>}
                {visibleCols.sku && <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">SKU</th>}
                {visibleCols.quantity && <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Quantity</th>}
                {visibleCols.payment && <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Payment</th>}
                {visibleCols.date && <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Date</th>}
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 && (
                <tr><td colSpan={13} className="px-6 py-16 text-center text-slate-400">No orders found</td></tr>
              )}
              {flatRows.map(({ order, item, isFirst, rowSpan }, idx) => (
                <tr key={`${order.id}-${idx}`} className="hover:bg-slate-50 transition-colors">
                  {/* Order-level cells: only show on first item row */}
                  {visibleCols.order_number && isFirst && (
                   <td className="px-4 py-3 font-mono font-medium text-blue-600 align-top whitespace-nowrap" rowSpan={rowSpan}>
                     <div className="flex items-center gap-1.5">
                       {order.order_number || order.id.slice(0,8)}
                       {order.payment_method === "net_30" && (
                         <span title="Net 30 Payment Terms" className="inline-flex items-center gap-0.5 bg-amber-100 text-amber-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                           <Clock size={10} /> NET30
                         </span>
                       )}
                     </div>
                   </td>
                  )}
                  {!visibleCols.order_number || !isFirst ? null : null}
                  {visibleCols.customer && isFirst && (
                    <td className="px-4 py-3 align-top" rowSpan={rowSpan}>
                      <div className="font-medium text-slate-800 whitespace-nowrap">{order.customer_name || "—"}</div>
                      <div className="text-xs text-slate-400">{order.customer_email}</div>
                    </td>
                  )}
                  {visibleCols.address && isFirst && (
                    <td className="px-4 py-3 text-slate-500 align-top max-w-[180px]" rowSpan={rowSpan}>
                      <div className="text-xs leading-tight">
                        {[order.shipping_address, order.shipping_city, order.shipping_state, order.shipping_zip].filter(Boolean).join(", ") || "—"}
                      </div>
                    </td>
                  )}
                  {visibleCols.type && isFirst && (
                    <td className="px-4 py-3 align-top" rowSpan={rowSpan}>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${order.customer_type === "B2B" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                        {order.customer_type}
                      </span>
                    </td>
                  )}
                  {visibleCols.total && isFirst && (
                    <td className="px-4 py-3 font-semibold text-slate-800 align-top whitespace-nowrap" rowSpan={rowSpan}>
                      ${(order.total_amount || 0).toFixed(2)}
                    </td>
                  )}
                  {visibleCols.status && isFirst && (
                    <td className="px-4 py-3 align-top" rowSpan={rowSpan}>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${statusColor[order.status] || "bg-slate-100 text-slate-600"}`}>
                        {order.status?.replace(/_/g, " ")}
                      </span>
                    </td>
                  )}
                  {/* Item-level cells */}
                  {visibleCols.product_title && (
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{item?.product_name || "—"}</td>
                  )}
                  {visibleCols.variant_title && (
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{item?.variant_name || "—"}</td>
                  )}
                  {visibleCols.sku && (
                    <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">{item?.sku || "—"}</td>
                  )}
                  {visibleCols.quantity && (
                    <td className="px-4 py-3 text-slate-700 text-center">{item?.quantity_variants ?? "—"}</td>
                  )}
                  {visibleCols.payment && isFirst && (
                    <td className="px-4 py-3 text-xs text-slate-500 capitalize align-top whitespace-nowrap" rowSpan={rowSpan}>
                      {order.payment_method?.replace(/_/g, " ")}
                    </td>
                  )}
                  {visibleCols.date && isFirst && (
                    <td className="px-4 py-3 text-slate-500 align-top whitespace-nowrap" rowSpan={rowSpan}>
                      {order.created_date ? new Date(order.created_date).toLocaleDateString() : "—"}
                    </td>
                  )}
                  {isFirst && (
                    <td className="px-4 py-3 align-top" rowSpan={rowSpan}>
                      <div className="flex items-center gap-2 justify-end">
                        {order.status === "pending" && (
                          <button onClick={() => handleApprove(order)}
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition font-medium">
                            <CheckCircle size={12} /> Approve
                          </button>
                        )}
                        <button
                          onClick={() => downloadPackingSlip(order, orderItems[order.id] || [])}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition"
                          title="Download Packing Slip">
                          <Package size={15} />
                        </button>
                        <button onClick={() => setInvoiceOrder(order)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition"
                          title="Invoice">
                          <FileText size={15} />
                        </button>
                        <button onClick={() => setSelected(order)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition">
                          <Eye size={15} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && <OrderDetail order={selected} onClose={() => setSelected(null)} onUpdated={() => { load(); setSelected(null); }} />}
      {invoiceOrder && <InvoiceGenerator order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />}
    </div>
  );
}