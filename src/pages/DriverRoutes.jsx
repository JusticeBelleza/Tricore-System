import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Truck, CheckCircle, Camera, PenLine, DollarSign, X, MapPin } from "lucide-react";

export default function DriverRoutes() {
  const [orders, setOrders] = useState([]);
  const [assignedOrders, setAssignedOrders] = useState([]);
  const [user, setUser] = useState(null);
  const [podOrder, setPodOrder] = useState(null); // order being delivered
  const [accepting, setAccepting] = useState(null);
  const [sigData, setSigData] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const fileRef = useRef();

  const loadOrders = (u) => {
    Promise.all([
      base44.entities.Order.filter({ driver_id: u.id, status: "out_for_delivery" }),
      base44.entities.Order.filter({ driver_id: u.id, status: "packed" }),
    ]).then(([active, assigned]) => {
      setOrders(active);
      setAssignedOrders(assigned);
    });
  };

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      loadOrders(u);
    }).catch(() => {});
  }, []);

  // ── Canvas Signature ──
  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches?.[0]?.clientX ?? e.clientX;
    const clientY = e.touches?.[0]?.clientY ?? e.clientY;
    return [(clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY];
  };

  const startDraw = (e) => {
    drawing.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const [x, y] = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const [x, y] = getPos(e, canvas);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  };

  const endDraw = () => {
    drawing.current = false;
    setSigData(canvasRef.current.toDataURL());
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setSigData("");
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const openPod = (order) => {
    setPodOrder(order);
    setSigData("");
    setPhoto(null);
    setPhotoPreview(null);
  };

  const closePod = () => {
    setPodOrder(null);
    setSigData("");
    setPhoto(null);
    setPhotoPreview(null);
  };

  const handleAccept = async (order) => {
    setAccepting(order.id);
    await base44.entities.Order.update(order.id, { status: "out_for_delivery" });
    loadOrders(user);
    setAccepting(null);
  };

  const handleDelivered = async () => {
    if (!podOrder) return;
    setSaving(true);
    const updates = { status: "delivered", delivered_at: new Date().toISOString() };

    // Upload signature
    if (sigData) {
      const blob = await (await fetch(sigData)).blob();
      const file = new File([blob], "signature.png", { type: "image/png" });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      updates.pod_signature_url = file_url;
    }

    // Upload photo
    if (photo) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: photo });
      updates.pod_photo_url = file_url;
    }

    await base44.entities.Order.update(podOrder.id, updates);
    setOrders(o => o.filter(x => x.id !== podOrder.id));
    closePod();
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 max-w-lg mx-auto space-y-4">
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <Truck size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900">My Deliveries</h1>
            <p className="text-sm text-slate-500">{orders.length} active · {assignedOrders.length} pending acceptance</p>
          </div>
        </div>
      </div>

      {/* ── Assigned (Pending Acceptance) ── */}
      {assignedOrders.length > 0 && (
        <div>
          <h2 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2 px-1">
            Assigned — Pending Acceptance
          </h2>
          {assignedOrders.map(order => (
            <div key={order.id} className="bg-amber-50 border border-amber-200 rounded-2xl shadow-sm overflow-hidden mb-3">
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-bold text-slate-900">#{order.order_number || order.id.slice(0, 8)}</div>
                    <div className="text-sm text-slate-600">{order.customer_name}</div>
                    <div className="flex items-start gap-1 text-sm text-slate-500 mt-0.5">
                      <MapPin size={13} className="mt-0.5 flex-shrink-0" />
                      <span>{order.shipping_address}{order.shipping_city ? `, ${order.shipping_city}` : ""}</span>
                    </div>
                  </div>
                  {order.payment_method === "cod" && (
                    <div className="flex items-center gap-1 bg-amber-100 text-amber-700 text-sm font-bold px-3 py-1.5 rounded-xl">
                      <DollarSign size={14} /> ${(order.total_amount || 0).toFixed(2)} COD
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleAccept(order)}
                  disabled={accepting === order.id}
                  className="w-full mt-2 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-60 transition"
                >
                  {accepting === order.id ? "Accepting…" : "✓ Accept Delivery"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Active Deliveries ── */}
      {orders.length > 0 && (
        <h2 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2 px-1">
          Out for Delivery
        </h2>
      )}

      {orders.length === 0 && assignedOrders.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
          <CheckCircle size={40} className="mx-auto text-green-400 mb-3" />
          <p className="text-slate-600 font-medium">All deliveries complete!</p>
        </div>
      )}

      {orders.map(order => (
        <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="font-bold text-slate-900">#{order.order_number || order.id.slice(0, 8)}</div>
                <div className="text-sm text-slate-600">{order.customer_name}</div>
                <div className="flex items-start gap-1 text-sm text-slate-500 mt-0.5">
                  <MapPin size={13} className="mt-0.5 flex-shrink-0" />
                  <span>{order.shipping_address}{order.shipping_city ? `, ${order.shipping_city}` : ""}</span>
                </div>
              </div>
              {order.payment_method === "cod" && (
                <div className="flex items-center gap-1 bg-amber-100 text-amber-700 text-sm font-bold px-3 py-1.5 rounded-xl">
                  <DollarSign size={14} /> ${(order.total_amount || 0).toFixed(2)} COD
                </div>
              )}
            </div>
            <button
              onClick={() => openPod(order)}
              className="w-full mt-3 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
            >
              Mark Delivered + POD
            </button>
          </div>
        </div>
      ))}

      {/* ── POD Modal ── */}
      {podOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[95vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="font-bold text-slate-900">Proof of Delivery</h2>
                <p className="text-xs text-slate-500">Order #{podOrder.order_number || podOrder.id.slice(0, 8)} · {podOrder.customer_name}</p>
              </div>
              <button onClick={closePod} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Signature */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <PenLine size={15} className="text-slate-500" />
                  <span className="text-sm font-semibold text-slate-700">Recipient Signature</span>
                  {sigData && <span className="text-xs text-green-600 font-medium">✓ Captured</span>}
                </div>
                <div className="relative border-2 border-slate-200 rounded-xl bg-slate-50 overflow-hidden"
                  style={{ touchAction: "none" }}>
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={180}
                    className="w-full"
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={endDraw}
                    onMouseLeave={endDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={endDraw}
                  />
                  {!sigData && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <p className="text-slate-300 text-sm">Sign here</p>
                    </div>
                  )}
                </div>
                <button onClick={clearCanvas} className="text-xs text-slate-400 hover:text-slate-600 mt-1 transition">
                  Clear signature
                </button>
              </div>

              {/* Photo */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Camera size={15} className="text-slate-500" />
                  <span className="text-sm font-semibold text-slate-700">Delivery Photo</span>
                  {photo && <span className="text-xs text-green-600 font-medium">✓ Captured</span>}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
                {photoPreview ? (
                  <div className="relative">
                    <img src={photoPreview} alt="POD" className="w-full h-40 object-cover rounded-xl border border-slate-200" />
                    <button
                      onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                      className="absolute top-2 right-2 bg-white rounded-full p-1 shadow text-slate-500 hover:text-red-500 transition"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current.click()}
                    className="w-full py-8 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-blue-400 hover:text-blue-500 transition flex flex-col items-center gap-2"
                  >
                    <Camera size={24} />
                    <span>Tap to take / upload photo</span>
                  </button>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={closePod}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelivered}
                  disabled={saving || (!sigData && !photo)}
                  className="flex-2 flex-1 py-3 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-50 transition"
                >
                  {saving ? "Saving…" : "✓ Confirm Delivered"}
                </button>
              </div>
              {!sigData && !photo && (
                <p className="text-xs text-center text-slate-400 -mt-2">Signature or photo required</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}