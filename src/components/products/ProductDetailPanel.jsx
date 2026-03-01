import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  X, Edit2, Package, TrendingUp, TrendingDown, SlidersHorizontal,
  Plus, ArrowDownCircle, ArrowUpCircle, RefreshCw, AlertTriangle
} from "lucide-react";
import ReactMarkdown from "react-markdown";

const movementTypeConfig = {
  inbound: { label: "Inbound", icon: ArrowDownCircle, color: "text-green-600", bg: "bg-green-50", badge: "bg-green-100 text-green-700" },
  outbound: { label: "Outbound", icon: ArrowUpCircle, color: "text-red-500", bg: "bg-red-50", badge: "bg-red-100 text-red-700" },
  adjustment: { label: "Adjustment", icon: SlidersHorizontal, color: "text-blue-500", bg: "bg-blue-50", badge: "bg-blue-100 text-blue-700" },
};

export default function ProductDetailPanel({ product, inventory, onClose, onEdit, onInventoryUpdate }) {
  const [movements, setMovements] = useState([]);
  const [variants, setVariants] = useState([]);
  const [loadingMovements, setLoadingMovements] = useState(true);
  const [showAddMovement, setShowAddMovement] = useState(false);
  const [movementForm, setMovementForm] = useState({ movement_type: "inbound", quantity: "", reason: "", reference: "" });
  const [saving, setSaving] = useState(false);

  // Reorder point editing
  const [editReorder, setEditReorder] = useState(false);
  const [reorderPoint, setReorderPoint] = useState(inventory?.reorder_point ?? 0);
  const [warehouseLocation, setWarehouseLocation] = useState(inventory?.warehouse_location ?? "");

  useEffect(() => {
    setLoadingMovements(true);
    Promise.all([
      base44.entities.StockMovement.filter({ product_id: product.id }, "-created_date", 50),
      base44.entities.ProductVariant.filter({ product_id: product.id }),
    ]).then(([m, v]) => {
      setMovements(m);
      setVariants(v);
      setLoadingMovements(false);
    });
  }, [product.id]);

  const currentStock = inventory?.base_units_on_hand ?? 0;
  const isLowStock = currentStock <= (inventory?.reorder_point ?? 0) && (inventory?.reorder_point ?? 0) > 0;

  const handleAddMovement = async () => {
    const qty = parseFloat(movementForm.quantity);
    if (!qty || qty <= 0) return;
    setSaving(true);

    await base44.entities.StockMovement.create({
      product_id: product.id,
      movement_type: movementForm.movement_type,
      quantity: qty,
      reason: movementForm.reason,
      reference: movementForm.reference,
    });

    // Update inventory
    let newStock = currentStock;
    if (movementForm.movement_type === "inbound") newStock += qty;
    else if (movementForm.movement_type === "outbound") newStock = Math.max(0, newStock - qty);
    else newStock = qty; // adjustment = set to

    if (inventory?.id) {
      await base44.entities.Inventory.update(inventory.id, { base_units_on_hand: newStock });
    } else {
      await base44.entities.Inventory.create({ product_id: product.id, base_units_on_hand: newStock });
    }

    // Refresh movements
    const m = await base44.entities.StockMovement.filter({ product_id: product.id }, "-created_date", 50);
    setMovements(m);
    setMovementForm({ movement_type: "inbound", quantity: "", reason: "", reference: "" });
    setShowAddMovement(false);
    setSaving(false);
    onInventoryUpdate();
  };

  const handleSaveReorder = async () => {
    if (inventory?.id) {
      await base44.entities.Inventory.update(inventory.id, {
        reorder_point: parseFloat(reorderPoint) || 0,
        warehouse_location: warehouseLocation,
      });
    }
    setEditReorder(false);
    onInventoryUpdate();
  };

  const statusColor = {
    active: "bg-green-100 text-green-700",
    discontinued: "bg-slate-100 text-slate-600",
    out_of_stock: "bg-red-100 text-red-700",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
              {product.image_url || product.image_urls?.[0] ? (
                <img src={product.image_urls?.[0] || product.image_url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Package size={20} className="text-slate-400" /></div>
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{product.name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs font-mono text-slate-500">{product.base_sku}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusColor[product.status] || "bg-slate-100 text-slate-600"}`}>
                  {product.status?.replace(/_/g, " ")}
                </span>
                {isLowStock && (
                  <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    <AlertTriangle size={11} /> Low Stock
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onEdit(product)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition">
              <Edit2 size={14} /> Edit
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Stock Overview */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">On Hand</p>
              <p className={`text-2xl font-bold ${isLowStock ? "text-amber-600" : "text-slate-900"}`}>{currentStock}</p>
              <p className="text-xs text-slate-400">{product.base_unit_name || "units"}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">Reserved</p>
              <p className="text-2xl font-bold text-slate-700">{inventory?.base_units_reserved ?? 0}</p>
              <p className="text-xs text-slate-400">{product.base_unit_name || "units"}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">Reorder Point</p>
              <p className="text-2xl font-bold text-slate-700">{inventory?.reorder_point ?? 0}</p>
              <p className="text-xs text-slate-400">{product.base_unit_name || "units"}</p>
            </div>
          </div>

          {/* Reorder Settings */}
          <div className="border border-slate-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700">Inventory Settings</h3>
              {!editReorder ? (
                <button onClick={() => setEditReorder(true)} className="text-xs text-blue-600 hover:underline">Edit</button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setEditReorder(false)} className="text-xs text-slate-500 hover:underline">Cancel</button>
                  <button onClick={handleSaveReorder} className="text-xs text-blue-600 font-semibold hover:underline">Save</button>
                </div>
              )}
            </div>
            {editReorder ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Reorder Point (units)</label>
                  <input type="number" min="0" value={reorderPoint} onChange={e => setReorderPoint(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Warehouse Location</label>
                  <input value={warehouseLocation} onChange={e => setWarehouseLocation(e.target.value)}
                    placeholder="e.g. A1-Shelf-3"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            ) : (
              <div className="flex gap-6 text-sm text-slate-600">
                <div><span className="text-slate-400 text-xs">Location: </span>{inventory?.warehouse_location || "—"}</div>
                <div><span className="text-slate-400 text-xs">Last counted: </span>{inventory?.last_counted_date || "—"}</div>
              </div>
            )}
          </div>

          {/* Stock Movement */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700">Stock Movements</h3>
              <button
                onClick={() => setShowAddMovement(v => !v)}
                className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition"
              >
                <Plus size={13} /> Record Movement
              </button>
            </div>

            {showAddMovement && (
              <div className="bg-slate-50 rounded-xl p-4 mb-4 space-y-3 border border-slate-200">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Type</label>
                    <select value={movementForm.movement_type} onChange={e => setMovementForm(f => ({ ...f, movement_type: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      <option value="inbound">Inbound (receive stock)</option>
                      <option value="outbound">Outbound (ship / use)</option>
                      <option value="adjustment">Adjustment (set exact count)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      {movementForm.movement_type === "adjustment" ? "New Stock Count" : "Quantity (base units)"}
                    </label>
                    <input type="number" min="0" value={movementForm.quantity} onChange={e => setMovementForm(f => ({ ...f, quantity: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Reference (optional)</label>
                    <input value={movementForm.reference} onChange={e => setMovementForm(f => ({ ...f, reference: e.target.value }))}
                      placeholder="PO #, Order #…"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Reason (optional)</label>
                    <input value={movementForm.reason} onChange={e => setMovementForm(f => ({ ...f, reason: e.target.value }))}
                      placeholder="Damage, return, restock…"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowAddMovement(false)} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition">Cancel</button>
                  <button onClick={handleAddMovement} disabled={saving || !movementForm.quantity}
                    className="px-4 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                    {saving ? "Saving…" : "Save Movement"}
                  </button>
                </div>
              </div>
            )}

            {/* Movement History */}
            <div className="space-y-2">
              {loadingMovements && <div className="text-sm text-slate-400 text-center py-4">Loading…</div>}
              {!loadingMovements && movements.length === 0 && (
                <div className="text-sm text-slate-400 text-center py-6 bg-slate-50 rounded-xl">No stock movements recorded yet</div>
              )}
              {movements.map(m => {
                const cfg = movementTypeConfig[m.movement_type] || movementTypeConfig.adjustment;
                const Icon = cfg.icon;
                return (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-100 rounded-xl">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                      <Icon size={15} className={cfg.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                        <span className="text-sm font-semibold text-slate-800">
                          {m.movement_type === "adjustment" ? `Set to ${m.quantity}` : `${m.quantity} units`}
                        </span>
                        {m.reference && <span className="text-xs text-slate-400">· {m.reference}</span>}
                      </div>
                      {m.reason && <p className="text-xs text-slate-500 mt-0.5 truncate">{m.reason}</p>}
                    </div>
                    <span className="text-xs text-slate-400 flex-shrink-0">
                      {m.created_date ? new Date(m.created_date).toLocaleDateString() : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Variants */}
          {variants.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Variants</h3>
              <div className="divide-y divide-slate-50 border border-slate-100 rounded-xl overflow-hidden">
                {variants.map(v => (
                  <div key={v.id} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50">
                    <div>
                      <span className="text-sm font-medium text-slate-700">{v.variant_name}</span>
                      <span className="text-xs text-slate-400 font-mono ml-2">{v.variant_sku}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <span>×{v.base_multiplier} units</span>
                      <span className="font-medium">${(v.retail_price || 0).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {product.description && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Description</h3>
              <div
                className="prose prose-sm text-slate-600 max-w-none bg-slate-50 rounded-xl px-4 py-3"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}