import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, User, Mail, Phone, MapPin, DollarSign, History, Edit2, Building2 } from "lucide-react";

const roleColor = {
  admin: "bg-red-100 text-red-700",
  warehouse: "bg-blue-100 text-blue-700",
  driver: "bg-orange-100 text-orange-700",
  b2b: "bg-purple-100 text-purple-700",
  retail: "bg-green-100 text-green-700",
  user: "bg-slate-100 text-slate-600",
};

const statusColor = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-slate-100 text-slate-600",
  suspended: "bg-red-100 text-red-700",
};

export default function CompanyDetailPanel({ company, onClose, onEdit, onPricing, onHistory }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    base44.entities.User.list().then(allUsers => {
      // Match users by user_id link or by email match
      const linked = allUsers.filter(u =>
        u.id === company.user_id ||
        (company.email && u.email === company.email)
      );
      setUsers(linked);
      setLoading(false);
    });
  }, [company.id]);

  const isB2B = company.account_type === "B2B";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Building2 size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{company.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isB2B ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                  {company.account_type}
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusColor[company.status] || "bg-slate-100 text-slate-600"}`}>
                  {company.status}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={18} />
          </button>
        </div>

        {/* Details */}
        <div className="px-6 py-4 space-y-4">
          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-3">
            {company.email && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Mail size={14} className="text-slate-400 flex-shrink-0" />
                <span className="truncate">{company.email}</span>
              </div>
            )}
            {company.phone && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Phone size={14} className="text-slate-400 flex-shrink-0" />
                <span>{company.phone}</span>
              </div>
            )}
            {(company.address || company.city) && (
              <div className="flex items-center gap-2 text-sm text-slate-600 col-span-2">
                <MapPin size={14} className="text-slate-400 flex-shrink-0" />
                <span>{[company.address, company.city, company.state, company.zip].filter(Boolean).join(", ")}</span>
              </div>
            )}
          </div>

          {/* B2B financials */}
          {isB2B && (
            <div className="grid grid-cols-3 gap-3 bg-slate-50 rounded-xl p-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Credit Limit</p>
                <p className="font-bold text-slate-800">${(company.credit_limit || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Outstanding</p>
                <p className={`font-bold ${(company.outstanding_balance || 0) > (company.credit_limit || 0) * 0.9 ? "text-red-600" : "text-slate-800"}`}>
                  ${(company.outstanding_balance || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Tax Exempt</p>
                <p className="font-bold text-slate-800">{company.tax_exempt ? "Yes" : "No"}</p>
              </div>
            </div>
          )}

          {/* Notes */}
          {company.notes && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-slate-700">
              <p className="text-xs font-semibold text-amber-600 mb-1 uppercase tracking-wide">Notes</p>
              {company.notes}
            </div>
          )}

          {/* Associated Users */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <User size={14} /> Associated Users
            </h3>
            {loading ? (
              <div className="text-sm text-slate-400 py-3 text-center">Loading users…</div>
            ) : users.length === 0 ? (
              <div className="text-sm text-slate-400 py-3 text-center bg-slate-50 rounded-xl">No linked users found</div>
            ) : (
              <div className="space-y-2">
                {users.map(u => (
                  <div key={u.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 font-semibold text-xs">
                        {u.full_name?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || "?"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{u.full_name || "—"}</p>
                      <p className="text-xs text-slate-500 truncate">{u.email}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${roleColor[u.role] || "bg-slate-100 text-slate-600"}`}>
                      {u.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          {isB2B && (
            <button onClick={onPricing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 transition">
              <DollarSign size={14} /> Pricing
            </button>
          )}
          <button onClick={onHistory}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition">
            <History size={14} /> Orders
          </button>
          <div className="flex-1" />
          <button onClick={onEdit}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition">
            <Edit2 size={14} /> Edit
          </button>
        </div>
      </div>
    </div>
  );
}