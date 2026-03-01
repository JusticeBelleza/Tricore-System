import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Plus, Trash2, Search, Upload, Download } from "lucide-react";

export default function PricingRulesPanel({ company, onClose }) {
  const [rules, setRules] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ rule_type: "percentage", product_id: "", fixed_price: "", percentage_discount: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [pageSize, setPageSize] = useState(30);
  const [page, setPage] = useState(1);

  useEffect(() => {
    base44.entities.PricingRule.filter({ company_id: company.id }).then(setRules);
    base44.entities.Product.list("-name", 200).then(setProducts);
  }, [company.id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleAdd = async () => {
    setSaving(true);
    await base44.entities.PricingRule.create({
      company_id: company.id,
      rule_type: form.rule_type,
      product_id: form.product_id || null,
      fixed_price: form.rule_type === "fixed" ? parseFloat(form.fixed_price) : null,
      percentage_discount: form.rule_type === "percentage" ? parseFloat(form.percentage_discount) : null,
      notes: form.notes,
    });
    const updated = await base44.entities.PricingRule.filter({ company_id: company.id });
    setRules(updated);
    setForm({ rule_type: "percentage", product_id: "", fixed_price: "", percentage_discount: "", notes: "" });
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.PricingRule.delete(id);
    setRules(r => r.filter(x => x.id !== id));
  };

  // Priority pricing logic
  const resolvePrice = (productId, basePrice) => {
    const productRules = rules.filter(r => r.product_id === productId || !r.product_id);
    const fixed = productRules.find(r => r.rule_type === "fixed" && r.product_id === productId);
    if (fixed) return { price: fixed.fixed_price, label: "Fixed" };
    const pct = productRules.find(r => r.rule_type === "percentage" && r.product_id === productId);
    if (pct) return { price: basePrice * (1 - pct.percentage_discount / 100), label: `${pct.percentage_discount}% off` };
    const globalPct = productRules.find(r => r.rule_type === "percentage" && !r.product_id);
    if (globalPct) return { price: basePrice * (1 - globalPct.percentage_discount / 100), label: `${globalPct.percentage_discount}% off (global)` };
    return { price: basePrice, label: "Retail" };
  };

  // Export CSV
  const handleExport = () => {
    const rows = [["Product Name", "SKU", "Retail Price", "Rule Type", "Discount %", "Fixed Price", "Final Price"]];
    products.forEach(p => {
      const { price, label } = resolvePrice(p.id, p.retail_base_price || 0);
      const rule = rules.find(r => r.product_id === p.id);
      rows.push([
        p.name,
        p.base_sku,
        (p.retail_base_price || 0).toFixed(2),
        rule?.rule_type || "retail",
        rule?.percentage_discount || "",
        rule?.fixed_price || "",
        price.toFixed(2),
      ]);
    });
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `pricing_${company.name}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // Import CSV
  const handleImport = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const lines = ev.target.result.split("\n").slice(1);
      for (const line of lines) {
        if (!line.trim()) continue;
        const cols = line.split(",").map(c => c.replace(/"/g, "").trim());
        const [, sku, , ruleType, discountPct, fixedPrice] = cols;
        const prod = products.find(p => p.base_sku === sku);
        if (!prod || !ruleType || ruleType === "retail") continue;
        await base44.entities.PricingRule.create({
          company_id: company.id,
          product_id: prod.id,
          rule_type: ruleType,
          fixed_price: ruleType === "fixed" && fixedPrice ? parseFloat(fixedPrice) : null,
          percentage_discount: ruleType === "percentage" && discountPct ? parseFloat(discountPct) : null,
        });
      }
      const updated = await base44.entities.PricingRule.filter({ company_id: company.id });
      setRules(updated);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Filter products by search
  const filteredProducts = products.filter(p =>
    !search ||
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.base_sku?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const pagedProducts = filteredProducts.slice((page - 1) * pageSize, page * pageSize);

  const handleSearchChange = (val) => { setSearch(val); setPage(1); };
  const handlePageSizeChange = (val) => { setPageSize(Number(val)); setPage(1); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Pricing Rules</h2>
            <p className="text-sm text-slate-500">{company.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} title="Export CSV"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition">
              <Download size={14} /> Export
            </button>
            <label title="Import CSV"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition cursor-pointer">
              <Upload size={14} /> Import
              <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
            </label>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 ml-1"><X size={18} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Priority Legend */}
          <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
            <strong>Priority:</strong> 1. Fixed Price → 2. % Discount → 3. Standard Retail
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Search by product name or SKU..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={e => handleSearchChange(e.target.value)}
            />
          </div>

          {/* Products Table */}
          <div className="border border-slate-100 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Company</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">SKU</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Retail</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rule</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Final Price</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pagedProducts.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-xs">No products found</td></tr>
                )}
                {pagedProducts.map(p => {
                  const { price } = resolvePrice(p.id, p.retail_base_price || 0);
                  const rule = rules.find(r => r.product_id === p.id);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-500 text-xs max-w-[100px] truncate">{company.name}</td>
                      <td className="px-4 py-3 font-medium text-slate-800 max-w-[160px] truncate">{p.name}</td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{p.base_sku}</td>
                      <td className="px-4 py-3 text-right text-slate-600">${(p.retail_base_price || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        {rule ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rule.rule_type === "fixed" ? "bg-purple-100 text-purple-700" : "bg-green-100 text-green-700"}`}>
                            {rule.rule_type === "fixed" ? `$${rule.fixed_price?.toFixed(2)}` : `${rule.percentage_discount}% off`}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-blue-600">${price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        {rule && (
                          <button onClick={() => handleDelete(rule.id)} className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select value={pageSize} onChange={e => handlePageSizeChange(e.target.value)}
                className="border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value={10}>10</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <span>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredProducts.length)} of {filteredProducts.length}</span>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-2 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">‹</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0}
                  className="px-2 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">›</button>
              </div>
            </div>
          </div>

          {/* Existing global rules */}
          {rules.filter(r => !r.product_id).length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Global Rules</h3>
              <div className="space-y-2">
                {rules.filter(r => !r.product_id).map(rule => (
                  <div key={rule.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-slate-800">
                        {rule.rule_type === "fixed" ? `Fixed: $${rule.fixed_price?.toFixed(2)}` : `${rule.percentage_discount}% Discount`}
                      </div>
                      <div className="text-xs text-slate-500">Applies to All Products</div>
                    </div>
                    <button onClick={() => handleDelete(rule.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Rule */}
          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Add Rule</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Rule Type</label>
                  <select value={form.rule_type} onChange={e => set("rule_type", e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="percentage">% Discount</option>
                    <option value="fixed">Fixed Price</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Product (optional)</label>
                  <select value={form.product_id} onChange={e => set("product_id", e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">All Products</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              {form.rule_type === "fixed" ? (
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Fixed Price ($)</label>
                  <input type="number" step="0.01" value={form.fixed_price} onChange={e => set("fixed_price", e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ) : (
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Discount %</label>
                  <input type="number" min="0" max="100" value={form.percentage_discount} onChange={e => set("percentage_discount", e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              )}
              <button onClick={handleAdd} disabled={saving}
                className="flex items-center gap-2 w-full justify-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-60">
                <Plus size={15} /> {saving ? "Adding…" : "Add Rule"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}