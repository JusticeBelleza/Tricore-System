import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Package, Truck } from "lucide-react";

export default function AssignOrdersModal({ driver, onClose, onSaved }) {
  const [orders, setOrders] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selected, setSelected] = useState([]);
  const [vehicleId, setVehicleId] = useState(driver.vehicle_id || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.Order.list("-created_date", 200),
      base44.entities.Vehicle.list("-created_date", 100),
    ]).then(([all, v]) => {
      const assignable = all.filter(o =>
        (o.status === "packed" && !o.driver_id) || o.driver_id === driver.id
      );
      setOrders(assignable);
      setSelected(assignable.filter(o => o.driver_id === driver.id).map(o => o.id));
      setVehicles(v);
    });
  }, [driver.id]);

  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const save = async () => {
    setSaving(true);
    // Save vehicle assignment to driver
    if (vehicleId) {
      await base44.entities.Driver.update(driver.id, { vehicle_id: vehicleId, vehicle_plate: vehicles.find(v => v.id === vehicleId)?.plate_number });
    }
    // Assign selected orders to driver
    await Promise.all(
      orders.map(o => {
        if (selected.includes(o.id)) {
          return base44.entities.Order.update(o.id, { driver_id: driver.id, status: "packed" });
        } else if (o.driver_id === driver.id) {
          return base44.entities.Order.update(o.id, { driver_id: null, status: "packed" });
        }
        return Promise.resolve();
      })
    );
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Assign Orders</h2>
            <p className="text-sm text-slate-500">{driver.full_name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>

        {/* Vehicle Selector */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <label className="block text-xs font-medium text-slate-600 mb-2 flex items-center gap-1.5">
            <Truck size={13} /> Assign Vehicle
          </label>
          <select value={vehicleId} onChange={e => setVehicleId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="">— No vehicle assigned —</option>
            {vehicles.filter(v => v.status !== "maintenance").map(v => (
              <option key={v.id} value={v.id}>{v.plate_number} · {v.vehicle_type}{v.make_model ? ` (${v.make_model})` : ""}</option>
            ))}
          </select>
        </div>

        <div className="p-4 max-h-72 overflow-y-auto space-y-2">
          {orders.length === 0 && (
            <div className="text-center text-slate-400 py-8 text-sm">No packed orders available to assign</div>
          )}
          {orders.map(order => (
            <label key={order.id} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition
              ${selected.includes(order.id) ? "border-blue-300 bg-blue-50" : "border-slate-100 hover:bg-slate-50"}`}>
              <input type="checkbox" checked={selected.includes(order.id)} onChange={() => toggle(order.id)} className="rounded" />
              <Package size={16} className="text-slate-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800">{order.order_number || order.id.slice(0,8)}</div>
                <div className="text-xs text-slate-500 truncate">{order.customer_name} — {order.shipping_city}</div>
              </div>
              <div className="text-sm font-semibold text-slate-700">${(order.total_amount||0).toFixed(2)}</div>
            </label>
          ))}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 transition">Cancel</button>
          <button onClick={save} disabled={saving}
            className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">
            {saving ? "Saving…" : `Assign ${selected.length} Order${selected.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}