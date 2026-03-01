import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X } from "lucide-react";

export default function CompanyForm({ company, onClose, onSaved, mode = "agency" }) {
  const isRetail = mode === "retail";

  const [form, setForm] = useState({
    name: "", address: "", city: "", state: "", zip: "",
    phone: "", email: "", tax_exempt: false,
    credit_limit: 0, account_type: isRetail ? "Retail" : "B2B", status: "active", notes: ""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (company) setForm({ ...company });
  }, [company]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const data = { ...form, credit_limit: parseFloat(form.credit_limit) || 0 };
    if (company) {
      await base44.entities.Company.update(company.id, data);
    } else {
      await base44.entities.Company.create(data);
    }
    setSaving(false);
    onSaved();
  };

  const Field = ({ label, name, type = "text", ...rest }) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input type={type} value={form[name] ?? ""} onChange={e => set(name, e.target.value)}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        {...rest} />
    </div>
  );

  const title = company
    ? (isRetail ? "Edit Retail Customer" : "Edit Company")
    : (isRetail ? "Add Retail Customer" : "Add Agency");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2"><Field label={isRetail ? "Customer Name *" : "Company Name *"} name="name" /></div>
          <Field label="Email Address" name="email" type="email" />
          <Field label="Phone" name="phone" />
          <div className="col-span-2"><Field label="Address" name="address" /></div>
          <Field label="City" name="city" />
          <div className="grid grid-cols-2 gap-2">
            <Field label="State" name="state" />
            <Field label="ZIP" name="zip" />
          </div>

          {/* Type field — read-only indicator */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
            <div className={`px-3 py-2 rounded-lg text-sm font-medium border ${isRetail ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-purple-50 text-purple-700 border-purple-200"}`}>
              {isRetail ? "Retail" : "B2B"}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select value={form.status} onChange={e => set("status", e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {!isRetail && (
            <>
              <Field label="Credit Limit ($)" name="credit_limit" type="number" />
              <div className="flex items-center gap-3 pt-5">
                <input type="checkbox" id="tax_exempt" checked={!!form.tax_exempt} onChange={e => set("tax_exempt", e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-600" />
                <label htmlFor="tax_exempt" className="text-sm font-medium text-slate-700">Tax Exempt</label>
              </div>
            </>
          )}

          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={2}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-60">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}