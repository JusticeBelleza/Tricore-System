import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Download } from "lucide-react";

export default function InvoiceGenerator({ order, onClose }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    base44.entities.OrderItem.filter({ order_id: order.id }).then(setItems);
  }, [order.id]);

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const generateAndDownload = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 14;
    const tableW = pageW - margin * 2;
    const cellPad = 3;

    // Header bar
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont(undefined, "bold");
    doc.text("TRICORE MEDICAL SUPPLY", 14, 18);
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text("Net 30 Invoice", 14, 25);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text("INVOICE", 160, 40);
    doc.setFont(undefined, "normal");
    doc.setFontSize(9);
    doc.text(`Invoice #: ${order.order_number || order.id.slice(0, 8).toUpperCase()}`, 140, 48);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 140, 54);
    doc.text(`Due: ${dueDate.toLocaleDateString()} (Net 30)`, 140, 60);

    // Bill To
    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.text("BILL TO:", 14, 42);
    doc.setFont(undefined, "normal");
    doc.text(order.customer_name || "—", 14, 49);
    doc.text(order.customer_email || "", 14, 55);
    doc.text(order.shipping_address || "", 14, 61);
    doc.text(`${order.shipping_city || ""}, ${order.shipping_state || ""} ${order.shipping_zip || ""}`, 14, 67);

    // Auto-fit columns: Product, Variant/Unit, SKU/Variant SKU, Qty, Unit Price, Total
    const headers = ["Product", "Variant/Unit", "SKU/Variant SKU", "Qty", "Unit Price", "Total"];
    doc.setFontSize(8);

    const colWidths = headers.map((h, ci) => {
      doc.setFont(undefined, "bold");
      let maxW = doc.getTextWidth(h);
      items.forEach(item => {
        doc.setFont(undefined, "normal");
        const vals = [
          (item.product_name || "—").slice(0, 40),
          (item.variant_name || "—").slice(0, 20),
          (item.sku || "—").slice(0, 20),
          String(item.quantity_variants || ""),
          `$${(item.unit_price || 0).toFixed(2)}`,
          `$${(item.line_total || 0).toFixed(2)}`,
        ];
        maxW = Math.max(maxW, doc.getTextWidth(vals[ci]));
      });
      return maxW + cellPad * 2;
    });

    const totalW = colWidths.reduce((a, b) => a + b, 0);
    const scale = tableW / totalW;
    const finalWidths = colWidths.map(w => w * scale);

    let y = 80;

    // Table header
    doc.setFillColor(37, 99, 235);
    doc.rect(margin, y, tableW, 7, "F");
    doc.setTextColor(255);
    doc.setFont(undefined, "bold");
    let cx = margin;
    headers.forEach((h, i) => { doc.text(h, cx + cellPad, y + 5); cx += finalWidths[i]; });
    y += 7;

    // Table rows
    doc.setFont(undefined, "normal");
    items.forEach((item, rowIdx) => {
      if (rowIdx % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(margin, y, tableW, 7, "F"); }
      doc.setTextColor(30, 41, 59);
      const row = [
        (item.product_name || "—").slice(0, 40),
        (item.variant_name || "—").slice(0, 20),
        (item.sku || "—").slice(0, 20),
        String(item.quantity_variants || ""),
        `$${(item.unit_price || 0).toFixed(2)}`,
        `$${(item.line_total || 0).toFixed(2)}`,
      ];
      cx = margin;
      row.forEach((val, i) => { doc.text(val, cx + cellPad, y + 5); cx += finalWidths[i]; });
      y += 7;
    });

    y += 8;
    doc.setFontSize(9);
    doc.setTextColor(0);
    doc.text(`Subtotal: $${(order.subtotal || 0).toFixed(2)}`, 140, y);
    doc.text(`Tax: $${(order.tax_amount || 0).toFixed(2)}`, 140, y + 6);
    doc.setFont(undefined, "bold");
    doc.setFontSize(11);
    doc.text(`TOTAL DUE: $${(order.total_amount || 0).toFixed(2)}`, 140, y + 14);

    doc.setFont(undefined, "normal");
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text("Payment terms: Net 30. Please remit within 30 days of invoice date.", 14, y + 30);
    doc.text("Thank you for your business — Tricore Medical Supply", 14, y + 36);

    doc.save(`invoice_${order.order_number || order.id.slice(0, 8)}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Invoice — Net 30</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Customer Details */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-1">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">Customer Details</p>
            <p className="text-sm font-semibold text-slate-800">{order.customer_name || "—"}</p>
            {order.customer_email && <p className="text-sm text-slate-500">{order.customer_email}</p>}
            {order.customer_phone && <p className="text-sm text-slate-500">{order.customer_phone}</p>}
            {order.shipping_address && (
              <p className="text-sm text-slate-500">
                {[order.shipping_address, order.shipping_city, order.shipping_state, order.shipping_zip].filter(Boolean).join(", ")}
              </p>
            )}
          </div>

          {/* Invoice Summary */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Order #</span><span className="font-mono font-medium">{order.order_number || order.id.slice(0, 8)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Total</span><span className="font-bold">${(order.total_amount || 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Due Date</span><span className="text-blue-600 font-medium">{dueDate.toLocaleDateString()} (Net 30)</span></div>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 transition">
            Cancel
          </button>
          <button onClick={generateAndDownload}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition">
            <Download size={15} /> Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}