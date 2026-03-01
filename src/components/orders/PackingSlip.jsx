import jsPDF from "jspdf";

const COMPANY = {
  name: "Tricore Medical Supply",
  address: "2169 Harbor St.",
  city: "Pittsburg, CA 94565",
  phone: "510-691-2694",
  email: "info@tricoremedicalsupply.com",
  website: "tricoremedicalsupply.com",
};

// Measure text width in pt at the current font size
function textWidth(doc, text) {
  return doc.getTextWidth(text);
}

export function downloadPackingSlip(order, items) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;

  // Left: Company name
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 58, 138);
  doc.text(COMPANY.name, margin, 60);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("PACKING SLIP", margin, 78);

  // Right: Company info
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  const rightX = pageW - margin;
  doc.text(COMPANY.address, rightX, 48, { align: "right" });
  doc.text(COMPANY.city, rightX, 60, { align: "right" });
  doc.text(`Phone: ${COMPANY.phone}`, rightX, 72, { align: "right" });
  doc.text(`Email: ${COMPANY.email}`, rightX, 84, { align: "right" });
  doc.text(COMPANY.website, rightX, 96, { align: "right" });

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, 108, pageW - margin, 108);

  // Order Meta
  const metaY = 124;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Order #: ${order.order_number || order.id.slice(0, 8).toUpperCase()}`, margin, metaY);
  doc.text(`Date: ${new Date(order.created_date || Date.now()).toLocaleDateString()}`, margin + 200, metaY);

  // Ship To / Bill To
  const addrY = 148;
  const addrCol2X = margin + 220;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("SHIP TO", margin, addrY);
  doc.text("BILL TO", addrCol2X, addrY);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  const shipLines = [
    order.customer_name,
    order.shipping_address,
    [order.shipping_city, order.shipping_state, order.shipping_zip].filter(Boolean).join(", "),
    order.customer_phone,
    order.customer_email,
  ].filter(Boolean);
  shipLines.forEach((line, i) => {
    doc.text(line, margin, addrY + 12 + i * 12);
    doc.text(line, addrCol2X, addrY + 12 + i * 12);
  });

  // Items Table — auto-fit columns
  const tableY = addrY + 12 + shipLines.length * 12 + 20;
  const tableW = pageW - margin * 2;
  const cellPad = 6;
  const rowH = 16;
  const headerH = 18;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");

  const headers = ["Product", "Variant / Unit", "Variant SKU / SKU", "Qty"];
  const dataKeys = ["product_name", "variant_name", "sku", "quantity_variants"];

  // Calculate max width for each column from header + data
  const colWidths = headers.map((h, ci) => {
    let maxW = textWidth(doc, h);
    items.forEach(item => {
      let val = "";
      if (ci === 0) val = item.product_name || "";
      else if (ci === 1) val = item.variant_name || "Unit";
      else if (ci === 2) val = item.sku || "—";
      else if (ci === 3) val = String(item.quantity_variants || 0);
      doc.setFont("helvetica", "normal");
      maxW = Math.max(maxW, textWidth(doc, val));
      doc.setFont("helvetica", "bold");
    });
    return maxW + cellPad * 2;
  });

  // Scale to fit table width
  const totalW = colWidths.reduce((a, b) => a + b, 0);
  const scale = tableW / totalW;
  const finalWidths = colWidths.map(w => w * scale);

  // Header row
  doc.setFillColor(30, 58, 138);
  doc.rect(margin, tableY, tableW, headerH, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  let cx = margin;
  headers.forEach((h, i) => {
    doc.text(h, cx + cellPad, tableY + 12);
    cx += finalWidths[i];
  });

  // Data rows
  let rowY = tableY + headerH;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 30, 30);
  items.forEach((item, ri) => {
    const bg = ri % 2 === 0 ? [248, 250, 252] : [255, 255, 255];
    doc.setFillColor(...bg);
    doc.rect(margin, rowY, tableW, rowH, "F");
    doc.setFontSize(9);
    const vals = [
      item.product_name || "",
      item.variant_name || "Unit",
      item.sku || "—",
      String(item.quantity_variants || 0),
    ];
    cx = margin;
    vals.forEach((val, i) => {
      doc.text(val, cx + cellPad, rowY + 11);
      cx += finalWidths[i];
    });
    rowY += rowH;
  });

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, rowY, pageW - margin, rowY);

  // Signatories
  const sigY = rowY + 50;
  const sigCol2X = margin + 300;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);

  doc.text("Signed by:", margin, sigY);
  doc.line(margin, sigY + 20, margin + 200, sigY + 20);
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("Signature over Printed Name", margin, sigY + 30);

  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text("Delivered by:", sigCol2X, sigY);
  doc.line(sigCol2X, sigY + 20, sigCol2X + 200, sigY + 20);
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("Signature over Printed Name", sigCol2X, sigY + 30);

  // Footer
  const footY = doc.internal.pageSize.getHeight() - 30;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Thank you for your business!", pageW / 2, footY, { align: "center" });
  doc.text(COMPANY.website, pageW / 2, footY + 12, { align: "center" });

  doc.save(`packing-slip-${order.order_number || order.id.slice(0, 8)}.pdf`);
}