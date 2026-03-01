import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Truck, ClipboardList, CheckCircle, Package, TrendingUp, Car } from "lucide-react";
import AssignOrdersModal from "../components/drivers/AssignOrdersModal";
import VehicleModal from "../components/drivers/VehicleModal";

const statusColor = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-slate-100 text-slate-500",
  on_route: "bg-orange-100 text-orange-700",
};

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [assignDriver, setAssignDriver] = useState(null);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editVehicle, setEditVehicle] = useState(null);

  const load = () => Promise.all([
    base44.entities.Driver.list("-created_date", 100),
    base44.entities.Order.list("-created_date", 200),
  ]).then(([d, o]) => { setDrivers(d); setOrders(o); });

  useEffect(() => { load(); }, []);

  const getStats = (driverId) => {
    const driverOrders = orders.filter(o => o.driver_id === driverId);
    const delivered = driverOrders.filter(o => o.status === "delivered");
    const active = driverOrders.filter(o => o.status === "out_for_delivery");
    const revenue = delivered.reduce((s, o) => s + (o.total_amount || 0), 0);
    return { total: driverOrders.length, delivered: delivered.length, active: active.length, revenue };
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Drivers</h1>
          <p className="text-slate-500 text-sm mt-1">{drivers.length} driver{drivers.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => { setEditVehicle(null); setShowVehicleModal(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
        >
          <Plus size={16} /> Add Vehicle
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Drivers", value: drivers.length, icon: Truck, color: "bg-blue-500" },
          { label: "Active", value: drivers.filter(d => d.status === "active").length, icon: CheckCircle, color: "bg-green-500" },
          { label: "On Route", value: drivers.filter(d => d.status === "on_route").length, icon: Package, color: "bg-orange-500" },
          { label: "Active Deliveries", value: orders.filter(o => o.status === "out_for_delivery").length, icon: TrendingUp, color: "bg-purple-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
              <Icon size={20} className="text-white" />
            </div>
            <div>
              <p className="text-slate-500 text-xs font-medium">{label}</p>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Driver Cards */}
      {drivers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
          <Truck size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No drivers yet</p>
          <p className="text-slate-400 text-sm mt-1">Add drivers via Users → Staff tab</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {drivers.map(driver => {
            const stats = getStats(driver.id);
            return (
              <div key={driver.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4">
                {/* Driver Info */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-lg">{driver.full_name?.[0]?.toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{driver.full_name}</p>
                      <p className="text-xs text-slate-500">{driver.phone || driver.email || "—"}</p>
                      {driver.license_number && <p className="text-xs text-slate-400 font-mono">License: {driver.license_number}</p>}
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${statusColor[driver.status]}`}>
                    {driver.status?.replace(/_/g, " ")}
                  </span>
                </div>

                {/* Vehicle */}
                <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                  <Truck size={13} />
                  <span>{driver.vehicle_plate ? `Plate: ${driver.vehicle_plate}` : "No vehicle assigned"}</span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 rounded-lg py-2">
                    <p className="text-lg font-bold text-slate-800">{stats.active}</p>
                    <p className="text-xs text-slate-500">Active</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg py-2">
                    <p className="text-lg font-bold text-slate-800">{stats.delivered}</p>
                    <p className="text-xs text-slate-500">Delivered</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg py-2">
                    <p className="text-lg font-bold text-slate-800">${stats.revenue > 999 ? (stats.revenue/1000).toFixed(1)+"k" : stats.revenue.toFixed(0)}</p>
                    <p className="text-xs text-slate-500">Revenue</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button onClick={() => setAssignDriver(driver)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition">
                    <ClipboardList size={13} /> Assign Delivery
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showVehicleModal && (
        <VehicleModal
          vehicle={editVehicle}
          onClose={() => { setShowVehicleModal(false); setEditVehicle(null); }}
          onSaved={() => { setShowVehicleModal(false); setEditVehicle(null); load(); }}
        />
      )}

      {assignDriver && (
        <AssignOrdersModal
          driver={assignDriver}
          onClose={() => setAssignDriver(null)}
          onSaved={() => { setAssignDriver(null); load(); }}
        />
      )}
    </div>
  );
}