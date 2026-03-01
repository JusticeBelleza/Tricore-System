import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Search, Edit2, Trash2, Package, ChevronDown, ChevronUp, Upload, Download, ChevronLeft, ChevronRight } from "lucide-react";
import ProductForm from "../components/products/ProductForm";
import BulkImport from "../components/products/BulkImport";
import ProductDetailPanel from "../components/products/ProductDetailPanel";

const PAGE_SIZE = 50;

export default function Products() {
  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [detailProduct, setDetailProduct] = useState(null);

  const load = async () => {
    const [p, v, inv] = await Promise.all([
      base44.entities.Product.list("-created_date", 2000),
      base44.entities.ProductVariant.list("-created_date", 5000),
      base44.entities.Inventory.list("-created_date", 2000),
    ]);
    setProducts(p);
    setVariants(v);
    setInventory(inv);
  };

  useEffect(() => { load(); }, []);

  // Derive unique categories
  const categories = ["all", ...Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort()];

  const filtered = products.filter(p => {
    const matchSearch = !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.base_sku?.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || p.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reset to page 1 on filter change
  const handleSearch = (v) => { setSearch(v); setPage(1); };
  const handleCat = (v) => { setCategoryFilter(v); setPage(1); };

  const exportCSV = () => {
    const headers = ["Name", "SKU", "Category", "Base Unit", "Retail Price", "Manufacturer", "Status", "Stock (units)"];
    const rows = filtered.map(p => [
      `"${(p.name || "").replace(/"/g, '""')}"`,
      `"${p.base_sku || ""}"`,
      `"${p.category || ""}"`,
      `"${p.base_unit_name || ""}"`,
      p.retail_base_price || 0,
      `"${p.manufacturer || ""}"`,
      p.status || "",
      stockFor(p.id),
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "products.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this product?")) return;
    await base44.entities.Product.delete(id);
    load();
  };

  const stockFor = (productId) => {
    const inv = inventory.find(i => i.product_id === productId);
    return inv?.base_units_on_hand ?? 0;
  };

  const handleStockEdit = async (productId, newValue) => {
    const val = parseFloat(newValue);
    if (isNaN(val) || val < 0) return;
    const inv = inventory.find(i => i.product_id === productId);
    if (inv) {
      await base44.entities.Inventory.update(inv.id, { base_units_on_hand: val });
    } else {
      await base44.entities.Inventory.create({ product_id: productId, base_units_on_hand: val });
    }
    load();
  };

  const variantsFor = (productId) => variants.filter(v => v.product_id === productId);

  const categoryColor = {
    Gloves: "bg-blue-100 text-blue-700",
    Masks: "bg-purple-100 text-purple-700",
    Gowns: "bg-pink-100 text-pink-700",
    Syringes: "bg-red-100 text-red-700",
    Bandages: "bg-orange-100 text-orange-700",
    Sanitizers: "bg-green-100 text-green-700",
    Diagnostics: "bg-cyan-100 text-cyan-700",
    Other: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="text-slate-500 text-sm mt-1">{products.length} products in catalog</p>
        </div>

      </div>

      {/* Search + Category Filter + Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search by name or SKU..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => handleCat(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[160px]"
        >
          {categories.map(c => (
            <option key={c} value={c}>{c === "all" ? "All Categories" : c}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition"
          >
            <Upload size={16} /> Import CSV
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition"
          >
            <Download size={16} /> Export CSV
          </button>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition shadow-sm"
          >
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">SKU</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Base Price</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock (units)</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Variants</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {paginated.length === 0 && (
              <tr><td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                <Package size={40} className="mx-auto mb-3 opacity-30" />
                No products found
              </td></tr>
            )}
            {paginated.map(product => (
              <>
                <tr key={product.id} className="hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => setDetailProduct(product)}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {(product.image_urls?.[0] || product.image_url) && (
                        <img src={product.image_urls?.[0] || product.image_url} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0 border border-slate-100" />
                      )}
                      <div>
                        <div className="font-medium text-slate-800">{product.name}</div>
                        {product.manufacturer && <div className="text-xs text-slate-400">{product.manufacturer}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-slate-600">{product.base_sku}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${categoryColor[product.category] || "bg-slate-100 text-slate-600"}`}>
                      {product.category || "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-800">${(product.retail_base_price || 0).toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <input
                      type="number"
                      min="0"
                      defaultValue={stockFor(product.id)}
                      onBlur={e => handleStockEdit(product.id, e.target.value)}
                      className="w-20 text-sm text-slate-800 border border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none rounded-lg px-2 py-1 text-center transition bg-transparent focus:bg-white"
                    />
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setExpanded(e => ({ ...e, [product.id]: !e[product.id] }))}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                    >
                      {variantsFor(product.id).length}
                      {expanded[product.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </td>
                  <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => { setEditing(product); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition">
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => handleDelete(product.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 transition">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
                {expanded[product.id] && variantsFor(product.id).map(v => (
                  <tr key={v.id} className="bg-blue-50/40" onClick={e => e.stopPropagation()}>
                    <td className="pl-12 pr-6 py-2 text-xs text-slate-500 italic">{v.variant_name}</td>
                    <td className="px-6 py-2 text-xs font-mono text-slate-500">{v.variant_sku}</td>
                    <td className="px-6 py-2 text-xs text-slate-500">×{v.base_multiplier} base units</td>
                    <td className="px-6 py-2 text-xs text-slate-500">${(v.retail_price || 0).toFixed(2)}</td>
                    <td colSpan={3}></td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>{filtered.length} products · page {safePage} of {totalPages}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              let p;
              if (totalPages <= 7) p = i + 1;
              else if (safePage <= 4) p = i + 1;
              else if (safePage >= totalPages - 3) p = totalPages - 6 + i;
              else p = safePage - 3 + i;
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition ${safePage === p ? "bg-blue-600 text-white" : "border border-slate-200 hover:bg-slate-50"}`}>
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <ProductForm
          product={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { load(); setShowForm(false); setEditing(null); }}
        />
      )}

      {showImport && (
        <BulkImport
          onClose={() => setShowImport(false)}
          onSaved={() => { load(); setShowImport(false); }}
        />
      )}

      {detailProduct && (
        <ProductDetailPanel
          product={detailProduct}
          inventory={inventory.find(i => i.product_id === detailProduct.id)}
          onClose={() => setDetailProduct(null)}
          onEdit={(p) => { setDetailProduct(null); setEditing(p); setShowForm(true); }}
          onInventoryUpdate={load}
        />
      )}
    </div>
  );
}