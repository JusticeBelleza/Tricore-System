import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, AlertTriangle, CheckCircle } from "lucide-react";

export default function Checkout({ cart, user, company, onClose, onOrdered }) {
  const [form, setForm] = useState({
    customer_name: user?.full_name || "",
    customer_email: user?.email || "",
    customer_phone: "",
    shipping_address: company?.address || "",
    shipping_city: company?.city || "",
    shipping_state: company?.state || "CA",
    shipping_zip: company?.zip || "",
    payment_method: "net_30",
    notes: "",
  });
  const [placing, setPlacing] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  // CA tax ~9.5% (simplified — real app would call TaxCloud)
  const taxRate = company?.tax_exempt ? 0 : 0.095;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  // Credit limit check
  const availableCredit = (company?.credit_limit || 0) - (company?.outstanding_balance || 0);
  const creditOk = !company || form.payment_method !== "net_30" || total <= availableCredit;

  const handlePlace = async () => {
    if (!creditOk) { setError("Order exceeds available credit limit."); return; }
    setPlacing(true);

    const orderNum = `ORD-${Date.now().toString().slice(-6)}`;
    const order = await base44.entities.Order.create({
      order_number: orderNum,
      customer_type: company ? "B2B" : "Retail",
      company_id: company?.id || null,
      customer_name: form.customer_name,
      customer_email: form.customer_email,
      customer_phone: form.customer_phone,
      shipping_address: form.shipping_address,
      shipping_city: form.shipping_city,
      shipping_state: form.shipping_state,
      shipping_zip: form.shipping_zip,
      status: "pending",
      payment_method: form.payment_method,
      payment_status: "unpaid",
      subtotal,
      tax_amount: tax,
      shipping_amount: 0,
      total_amount: total,
      notes: form.notes,
    });

    // Create order items
    for (const item of cart) {
      await base44.entities.OrderItem.create({
        order_id: order.id,
        product_id: item.product.id,
        variant_id: item.variant?.id || null,
        product_name: item.name,
        variant_name: item.variant_name,
        sku: item.sku,
        quantity_variants: item.qty,
        base_multiplier: item.base_multiplier,
        total_base_units: item.qty * item.base_multiplier,
        unit_price: item.price,
        line_total: item.price * item.qty,
      });
    }

    // Update outstanding balance for B2B net_30
    if (company && form.payment_method === "net_30") {
      await base44.entities.Company.update(company.id, {
        outstanding_balance: (company.outstanding_balance || 0) + total
      });
    }

    setPlacing(false);
    setDone(true);
    setTimeout(onOrdered, 1500);
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  if (done) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-sm w-full">
        <CheckCircle size={48} className="mx-auto text-green-500 mb-3" />
        <h2 className="text-xl font-bold text-slate-900 mb-1">Order Placed!</h2>
        <p className="text-slate-500 text-sm">Your order is pending approval.</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Checkout</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Order Summary */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-1.5">
            {cart.map(item => (
              <div key={item.key} className="flex justify-between text-sm">
                <span className="text-slate-600">{item.name} {item.variant_name} ×{item.qty}</span>
                <span className="font-medium">${(item.price * item.qty).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t border-slate-200 pt-1.5 mt-1.5 space-y-0.5">
              <div className="flex justify-between text-sm text-slate-500"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm text-slate-500">
                <span>Tax {company?.tax_exempt ? "(Exempt)" : "(CA ~9.5%)"}</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900"><span>Total</span><span>${total.toFixed(2)}</span></div>
            </div>
          </div>

          {/* Credit Warning */}
          {company && form.payment_method === "net_30" && (
            <div className={`rounded-xl px-4 py-2 text-sm flex items-center gap-2 ${creditOk ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {creditOk ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
              Available credit: ${availableCredit.toFixed(2)} of ${(company.credit_limit || 0).toLocaleString()}
            </div>
          )}

          {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          {/* Form */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">Full Name</label>
              <input value={form.customer_name} onChange={e => set("customer_name", e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Email</label>
              <input value={form.customer_email} onChange={e => set("customer_email", e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Phone</label>
              <input value={form.customer_phone} onChange={e => set("customer_phone", e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">Shipping Address</label>
              <input value={form.shipping_address} onChange={e => set("shipping_address", e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">City</label>
              <input value={form.shipping_city} onChange={e => set("shipping_city", e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">State</label>
                <input value={form.shipping_state} onChange={e => set("shipping_state", e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">ZIP</label>
                <input value={form.shipping_zip} onChange={e => set("shipping_zip", e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Payment Method</label>
              <select value={form.payment_method} onChange={e => set("payment_method", e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="net_30">Net 30</option>
                <option value="cod">COD</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={handlePlace} disabled={placing || !creditOk}
            className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60">
            {placing ? "Placing…" : `Place Order · $${total.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}