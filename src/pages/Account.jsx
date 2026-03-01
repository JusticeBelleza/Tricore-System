import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Building2, User, Save, CheckCircle, CreditCard, MapPin, Phone, Mail, Lock } from "lucide-react";

function Field({ label, value, onChange, type = "text", readOnly = false }) {
  return (
    <div>
      <label className="text-xs text-slate-500 font-medium block mb-1">{label}</label>
      <input
        type={type}
        value={value || ""}
        onChange={e => onChange && onChange(e.target.value)}
        readOnly={readOnly}
        className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${readOnly ? "bg-slate-50 border-slate-100 text-slate-500" : "bg-white border-slate-200"}`}
      />
    </div>
  );
}

export default function Account() {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [profile, setProfile] = useState({ full_name: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState({ type: "", text: "" });

  useEffect(() => {
    const init = async () => {
      const u = await base44.auth.me().catch(() => null);
      setUser(u);
      setProfile({ full_name: u?.full_name || "", phone: u?.phone || "", email: u?.email || "" });

      // Try company_id first, then fall back to user_id lookup
      if (u?.company_id) {
        const comps = await base44.entities.Company.filter({ id: u.company_id });
        if (comps.length) { setCompany(comps[0]); return; }
      }
      if (u?.id) {
        const comps = await base44.entities.Company.filter({ user_id: u.id });
        if (comps.length) setCompany(comps[0]);
      }
    };
    init();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe({ phone: profile.phone, full_name: profile.full_name });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleChangePassword = async () => {
    if (!pwForm.newPw || !pwForm.confirm) { setPwMsg({ type: "error", text: "Please fill in all fields." }); return; }
    if (pwForm.newPw !== pwForm.confirm) { setPwMsg({ type: "error", text: "Passwords do not match." }); return; }
    if (pwForm.newPw.length < 6) { setPwMsg({ type: "error", text: "Password must be at least 6 characters." }); return; }
    setPwSaving(true);
    setPwMsg({ type: "", text: "" });
    await base44.auth.resetPasswordRequest(user.email);
    setPwSaving(false);
    setPwMsg({ type: "success", text: "A password reset link has been sent to your email." });
    setPwForm({ current: "", newPw: "", confirm: "" });
    setTimeout(() => setPwMsg({ type: "", text: "" }), 5000);
  };

  const creditUsed = (company?.outstanding_balance || 0);
  const creditLimit = (company?.credit_limit || 0);
  const creditAvailable = creditLimit - creditUsed;
  const creditPct = creditLimit > 0 ? Math.min(100, (creditUsed / creditLimit) * 100) : 0;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Account</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your company and profile settings</p>
      </div>

      {/* Company Section */}
      {company && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <Building2 size={18} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-slate-900">{company.name}</div>
              <div className="text-xs text-slate-500">
                {company.account_type} Account
                {company.tax_exempt && " · Tax Exempt"}
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${company.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {company.status}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-2 text-sm">
                <MapPin size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-slate-700">Address</div>
                  <div className="text-slate-500">{[company.address, company.city, company.state, company.zip].filter(Boolean).join(", ") || "—"}</div>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Phone size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-slate-700">Phone</div>
                  <div className="text-slate-500">{company.phone || "—"}</div>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Mail size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-slate-700">Email</div>
                  <div className="text-slate-500">{company.email || "—"}</div>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CreditCard size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-slate-700">Payment Terms</div>
                  <div className="text-slate-500">{company.payment_terms?.replace(/_/g, " ") || "—"}</div>
                </div>
              </div>
            </div>

            {/* Credit Bar */}
            {creditLimit > 0 && (
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex justify-between text-xs text-slate-600 mb-2">
                  <span className="font-medium">Credit Limit</span>
                  <span>${creditAvailable.toLocaleString()} available of ${creditLimit.toLocaleString()}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${creditPct > 80 ? "bg-red-500" : creditPct > 50 ? "bg-amber-500" : "bg-green-500"}`}
                    style={{ width: `${creditPct}%` }}
                  />
                </div>
                <div className="text-xs text-slate-400 mt-1">${creditUsed.toLocaleString()} used</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Change Password Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
            <Lock size={18} className="text-slate-500" />
          </div>
          <div>
            <div className="font-bold text-slate-900">Change Password</div>
            <div className="text-xs text-slate-500">Send a password reset link to your email</div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {pwMsg.text && (
            <div className={`text-sm px-3 py-2 rounded-lg flex items-center gap-2 ${pwMsg.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {pwMsg.type === "success" ? <CheckCircle size={15} /> : null}
              {pwMsg.text}
            </div>
          )}
          <div className="flex items-center justify-between pt-1">
            <p className="text-sm text-slate-500">We'll send a secure reset link to <span className="font-medium text-slate-700">{user?.email}</span></p>
            <button
              onClick={handleChangePassword}
              disabled={pwSaving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-slate-800 text-white text-sm font-medium hover:bg-slate-900 transition disabled:opacity-60 whitespace-nowrap ml-4"
            >
              <Lock size={15} />
              {pwSaving ? "Sending…" : "Send Reset Link"}
            </button>
          </div>
        </div>
      </div>

      {/* Profile Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
            <User size={18} className="text-slate-500" />
          </div>
          <div>
            <div className="font-bold text-slate-900">Profile Settings</div>
            <div className="text-xs text-slate-500">Update your personal information</div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <Field label="Full Name" value={profile.full_name} onChange={v => setProfile(p => ({ ...p, full_name: v }))} />
          <Field label="Email" value={profile.email} onChange={v => setProfile(p => ({ ...p, email: v }))} />
          <Field label="Phone" value={profile.phone} onChange={v => setProfile(p => ({ ...p, phone: v }))} />
          <div>
            <label className="text-xs text-slate-500 font-medium block mb-1">Role</label>
            <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-sm text-slate-600 capitalize">
              {user?.role || "—"}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {saved && (
              <div className="flex items-center gap-1.5 text-green-600 text-sm">
                <CheckCircle size={16} /> Saved!
              </div>
            )}
            <div className="ml-auto">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-60"
              >
                <Save size={15} />
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}