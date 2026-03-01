import { useState } from "react";
import { X, CheckCircle, Eye, EyeOff } from "lucide-react";

export default function CreateUserModal({ title, subtitle, roleOptions, onSubmit, onClose }) {
  const [form, setForm] = useState({
    full_name: "",
    address: "",
    email: "",
    phone: "",
    role: roleOptions?.[0]?.value || "",
    license_number: "",
    password: "",
    confirm_password: "",
  });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm_password) { setError("Passwords do not match."); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }

    setSaving(true);
    try {
      await onSubmit(form);
      setDone(true);
    } catch (err) {
      setError(err.message || "Something went wrong. The email may already be registered.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>

        <div className="p-6">
          {done ? (
            <div className="flex flex-col items-center text-center py-4 gap-3">
              <CheckCircle size={40} className="text-green-500" />
              <div>
                <div className="font-semibold text-slate-800">User created!</div>
                <div className="text-sm text-slate-500 mt-1">
                  <span className="font-medium">{form.full_name || form.email}</span> can now log in with their credentials.
                </div>
              </div>
              <button onClick={onClose} className="mt-2 px-5 py-2 rounded-xl bg-slate-800 text-white text-sm font-medium hover:bg-slate-900 transition">Done</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Full Name *</label>
                <input type="text" value={form.full_name} onChange={e => set("full_name", e.target.value)} placeholder="John Doe" required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Address</label>
                <input type="text" value={form.address} onChange={e => set("address", e.target.value)} placeholder="123 Main St, City"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Email Address *</label>
                <input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="user@example.com" required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Contact Number</label>
                <input type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+1 (555) 000-0000"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              {roleOptions && roleOptions.length > 1 && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Role</label>
                  <select value={form.role} onChange={e => set("role", e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    {roleOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
              )}
              {form.role === "driver" && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Driver License Number *</label>
                  <input type="text" value={form.license_number} onChange={e => set("license_number", e.target.value)} placeholder="e.g. A1234567"
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Password *</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={form.password} onChange={e => set("password", e.target.value)}
                    placeholder="Min. 8 characters" required
                    className="w-full px-4 py-2 pr-10 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Confirm Password *</label>
                <div className="relative">
                  <input type={showConfirm ? "text" : "password"} value={form.confirm_password} onChange={e => set("confirm_password", e.target.value)}
                    placeholder="Re-enter password" required
                    className="w-full px-4 py-2 pr-10 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              <div className="flex gap-3 justify-end pt-1">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition disabled:opacity-60">
                  {saving ? "Creating…" : "Create User"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}