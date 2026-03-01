import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Eye, ClipboardList, CheckCircle } from "lucide-react";
import POForm from "../components/po/POForm";
import POReceive from "../components/po/POReceive";

const statusColor = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-blue-100 text-blue-700",
  confirmed: "bg-indigo-100 text-indigo-700",
  receiving: "bg-orange-100 text-orange-700",
  received: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function PurchaseOrders() {
  const [pos, setPOs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [receiving, setReceiving] = useState(null);

  const load = () => base44.entities.PurchaseOrder.list("-created_date", 100).then(setPOs);
  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Purchase Orders</h1>
          <p className="text-slate-500 text-sm mt-1">{pos.length} purchase orders</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition shadow-sm">
          <Plus size={16} /> Create PO
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">PO #</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Supplier</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Expected</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {pos.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
                No purchase orders yet
              </td></tr>
            )}
            {pos.map(po => (
              <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-sm font-mono font-medium text-blue-600">{po.po_number || po.id.slice(0, 8)}</td>
                <td className="px-6 py-4 text-sm text-slate-800">{po.supplier_name}</td>
                <td className="px-6 py-4 text-sm font-medium text-slate-800">${(po.total_amount || 0).toFixed(2)}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{po.expected_delivery_date || "—"}</td>
                <td className="px-6 py-4">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${statusColor[po.status] || "bg-slate-100 text-slate-600"}`}>
                    {po.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 justify-end">
                    {(po.status === "confirmed" || po.status === "sent") && (
                      <button onClick={() => setReceiving(po)}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition font-medium">
                        <CheckCircle size={12} /> Receive
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && <POForm onClose={() => setShowForm(false)} onSaved={() => { load(); setShowForm(false); }} />}
      {receiving && <POReceive po={receiving} onClose={() => setReceiving(null)} onSaved={() => { load(); setReceiving(null); }} />}
    </div>
  );
}