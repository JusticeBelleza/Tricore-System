import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Users, Building2, ShoppingBag, Plus, Search,
  Edit2, Trash2, DollarSign, History, UserPlus
} from "lucide-react";
import CompanyForm from "../components/companies/CompanyForm";
import PricingRulesPanel from "../components/companies/PricingRulesPanel";
import OrderHistoryPanel from "../components/companies/OrderHistoryPanel";
import CreateUserModal from "../components/users/CreateUserModal";

const STAFF_ROLES = ["admin", "warehouse", "driver"];

const roleColor = {
  admin: "bg-red-100 text-red-700",
  warehouse: "bg-blue-100 text-blue-700",
  driver: "bg-orange-100 text-orange-700",
  b2b: "bg-purple-100 text-purple-700",
  user: "bg-slate-100 text-slate-600",
  retail: "bg-green-100 text-green-700",
};

const statusColor = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-slate-100 text-slate-600",
  suspended: "bg-red-100 text-red-700",
};

const TABS = [
  { key: "staff", label: "Staff", icon: Users },
  { key: "agency", label: "Agency", icon: Building2 },
  { key: "retail", label: "Retail Customers", icon: ShoppingBag },
];

const STAFF_ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "warehouse", label: "Warehouse" },
  { value: "driver", label: "Driver" },
];

export default function AdminUsers() {
  const [tab, setTab] = useState("staff");
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pricingFor, setPricingFor] = useState(null);
  const [historyFor, setHistoryFor] = useState(null);

  // Modal state
  const [createStaffModal, setCreateStaffModal] = useState(false);
  const [createAgencyUserModal, setCreateAgencyUserModal] = useState(null); // company

  const loadUsers = () => base44.entities.User.list().then(setUsers);
  const loadCompanies = () => base44.entities.Company.list("-created_date", 200).then(setCompanies);

  useEffect(() => { loadUsers(); loadCompanies(); }, []);

  const staffUsers = users.filter(u => STAFF_ROLES.includes(u.role));

  // Retail customers = users with role "user" or "retail"
  const retailUsers = users.filter(u => u.role === "user" || u.role === "retail");

  const filteredAgency = companies
    .filter(c => c.account_type === "B2B")
    .filter(c => c.name?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase()));

  const handleRoleChange = async (userId, newRole) => {
    await base44.entities.User.update(userId, { role: newRole });
    loadUsers();
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm("Delete this user?")) return;
    await base44.entities.User.delete(userId);
    loadUsers();
  };

  const handleDeleteCompany = async (id) => {
    if (!confirm("Delete this record?")) return;
    await base44.entities.Company.delete(id);
    loadCompanies();
  };

  const handleCreateStaff = async (form) => {
    const res = await base44.functions.invoke("createStaffUser", {
      email: form.email,
      password: form.password,
      full_name: form.full_name,
      address: form.address,
      phone: form.phone,
      role: form.role,
      license_number: form.license_number,
    });
    if (res.data?.error) throw new Error(res.data.error);
    loadUsers();
  };

  const handleCreateAgencyUser = async (form) => {
    const res = await base44.functions.invoke("createAgencyUser", {
      email: form.email,
      password: form.password,
      full_name: form.full_name,
      address: form.address,
      phone: form.phone,
      company_id: createAgencyUserModal?.id,
    });
    if (res.data?.error) throw new Error(res.data.error);
    loadUsers();
    loadCompanies();
  };

  // Find user linked to a company
  const getCompanyUser = (company) => {
    if (!company.user_id) return null;
    return users.find(u => u.id === company.user_id) || null;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Users</h1>
        <p className="text-slate-500 text-sm mt-1">Manage staff, agencies, and retail customers</p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setSearch(""); }}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition ${tab === key ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* ── STAFF TAB ── */}
      {tab === "staff" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setCreateStaffModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition shadow-sm"
            >
              <Plus size={16} /> Add Staff Member
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {staffUsers.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-16 text-center text-slate-400">No staff members found</td></tr>
                  )}
                  {staffUsers.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-blue-600 font-semibold text-sm">
                              {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "?"}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-slate-800">{user.full_name || "—"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{user.email}</td>
                      <td className="px-6 py-4">
                        <select
                          value={user.role || "admin"}
                          onChange={e => handleRoleChange(user.id, e.target.value)}
                          className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${roleColor[user.role] || roleColor.user}`}
                        >
                          {STAFF_ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {user.created_date ? new Date(user.created_date).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => handleDeleteUser(user.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition" title="Delete user">
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── AGENCY TAB ── */}
      {tab === "agency" && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search agencies..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
            </div>
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition shadow-sm whitespace-nowrap"
            >
              <Plus size={16} /> Add Agency
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Company</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Linked User</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Credit Limit</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Balance</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Shipping Fee</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tax Exempt</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredAgency.length === 0 && (
                    <tr><td colSpan={8} className="px-6 py-16 text-center text-slate-400">No agencies found</td></tr>
                  )}
                  {filteredAgency.map(company => {
                    const linkedUser = getCompanyUser(company);
                    return (
                      <tr key={company.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-800">{company.name}</div>
                          <div className="text-xs text-slate-400">{company.email || ""}</div>
                        </td>
                        <td className="px-6 py-4">
                          {linkedUser ? (
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                                <span className="text-purple-600 font-semibold text-xs">
                                  {linkedUser.full_name?.[0]?.toUpperCase() || linkedUser.email?.[0]?.toUpperCase() || "?"}
                                </span>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-slate-800">{linkedUser.full_name || linkedUser.email}</div>
                                <div className="text-xs text-slate-400">{linkedUser.email}</div>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setCreateAgencyUserModal(company)}
                              className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium"
                            >
                              <UserPlus size={13} /> Add user
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">${(company.credit_limit || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={(company.outstanding_balance || 0) > (company.credit_limit || 0) * 0.9 ? "text-red-600 font-medium" : "text-slate-700"}>
                            ${(company.outstanding_balance || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-600">Shipping:</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={company.shipping_fee || 0}
                              onChange={(e) => {
                                const newFee = parseFloat(e.target.value) || 0;
                                base44.entities.Company.update(company.id, { shipping_fee: newFee }).then(() => loadCompanies());
                              }}
                              className="w-20 px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm text-slate-400">$</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{company.tax_exempt ? "✓ Exempt" : "—"}</td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${statusColor[company.status] || "bg-slate-100 text-slate-600"}`}>
                            {company.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 justify-end">
                            {linkedUser && (
                              <button onClick={() => setCreateAgencyUserModal(company)} className="p-1.5 rounded-lg hover:bg-purple-50 text-slate-400 hover:text-purple-600 transition" title="Add/Change User">
                                <UserPlus size={15} />
                              </button>
                            )}
                            <button onClick={() => setPricingFor(company)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-green-600 transition" title="Pricing Rules">
                              <DollarSign size={15} />
                            </button>
                            <button onClick={() => setHistoryFor(company)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition" title="Order History">
                              <History size={15} />
                            </button>
                            <button onClick={() => { setEditing(company); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition">
                              <Edit2 size={15} />
                            </button>
                            <button onClick={() => handleDeleteCompany(company.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── RETAIL CUSTOMERS TAB ── */}
      {tab === "retail" && (
        <div className="space-y-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search retail customers..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {retailUsers.filter(u =>
                    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
                    u.email?.toLowerCase().includes(search.toLowerCase())
                  ).length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                      <ShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
                      No retail customers found
                    </td></tr>
                  )}
                  {retailUsers
                    .filter(u =>
                      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
                      u.email?.toLowerCase().includes(search.toLowerCase())
                    )
                    .map(user => (
                      <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-green-600 font-semibold text-sm">
                                {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "?"}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-slate-800">{user.full_name || "—"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">{user.email}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{user.phone || "—"}</td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {user.created_date ? new Date(user.created_date).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-6 py-4">
                          <button onClick={() => handleDeleteUser(user.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition" title="Delete user">
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALS ── */}
      {showForm && (
        <CompanyForm
          company={editing}
          mode="agency"
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { loadCompanies(); setShowForm(false); setEditing(null); }}
        />
      )}
      {pricingFor && <PricingRulesPanel company={pricingFor} onClose={() => setPricingFor(null)} />}
      {historyFor && <OrderHistoryPanel company={historyFor} onClose={() => setHistoryFor(null)} />}

      {createStaffModal && (
        <CreateUserModal
          title="Add Staff Member"
          roleOptions={STAFF_ROLE_OPTIONS}
          onSubmit={handleCreateStaff}
          onClose={() => { setCreateStaffModal(false); loadUsers(); }}
        />
      )}

      {createAgencyUserModal && (
        <CreateUserModal
          title="Add Agency User"
          subtitle={createAgencyUserModal.name}
          onSubmit={handleCreateAgencyUser}
          onClose={() => { setCreateAgencyUserModal(null); loadUsers(); loadCompanies(); }}
        />
      )}
    </div>
  );
}