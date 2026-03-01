import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X } from "lucide-react";

export default function DriverForm({ driver, onClose, onSaved }) {
  const [form, setForm] = useState({
    full_name: "", phone: "", email: "", license_number: "",
    vehicle_type: "Van", vehicle_plate: "", status: "active", notes: ""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (driver) setForm({ ...form, ...driver });
  }, [driver]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    if (driver?.id) {
      await base44.entities.Driver.update(driver.id, form);
    } else {
      await base44.entities.Driver.create(form);
    }
    setSaving(false);
    onSaved();
  };

  const Field = ({ label, k, type = "text" }) => (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input type={type} value={form[k] || ""} onChange={e => set(k, e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">{driver ? "Edit Driver" : "Add Driver"}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2"><Field label="Full Name" k="full_name" /></div>
          <Field label="Phone" k="phone" />
          <Field label="Email" k="email" type="email" />
          <Field label="License #" k="license_number" />
          <Field label="Vehicle Plate" k="vehicle_plate" />
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Vehicle Type</label>
            <select value={form.vehicle_type} onChange={e => set("vehicle_type", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {["Van","Truck","Car","Motorcycle"].map(v => <option key={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
            <select value={form.status} onChange={e => set("status", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="on_route">On Route</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
            <textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={2}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 transition">Cancel</button>
          <button onClick={save} disabled={saving || !form.full_name}
            className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">
            {saving ? "Saving…" : "Save Driver"}
          </button>
        </div>
      </div>
    </div>
  );
}