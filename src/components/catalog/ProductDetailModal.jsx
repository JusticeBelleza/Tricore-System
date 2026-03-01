import { useState } from "react";
import { X, Package, Plus, Minus, ChevronLeft, ChevronRight } from "lucide-react";

export default function ProductDetailModal({ product, variants, getPrice, cart, addToCart, updateQty, onClose, isOutOfStock }) {
  const pvs = variants.filter(v => v.product_id === product.id && v.status !== "inactive");
  const hasVariants = pvs.length > 0;

  // Build image list
  const images = [];
  if (product.image_urls?.length) images.push(...product.image_urls);
  else if (product.image_url) images.push(product.image_url);

  const [imgIndex, setImgIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState(hasVariants ? pvs[0]?.id : null);

  const selectedVariant = pvs.find(v => v.id === selectedVariantId) || null;
  const activeKey = hasVariants ? selectedVariantId : product.id;
  const price = hasVariants && selectedVariant
    ? getPrice(product, selectedVariant)
    : getPrice(product, null);
  const sku = hasVariants && selectedVariant ? selectedVariant.variant_sku : product.base_sku;
  const inCart = cart.find(i => i.key === activeKey);

  const handleAdd = () => {
    if (hasVariants) addToCart(product, selectedVariant);
    else addToCart(product, null);
  };

  const handleQty = (delta) => updateQty(activeKey, delta);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">

        {/* Image carousel */}
        <div className="relative aspect-square bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
          {images.length > 0 ? (
            <img src={images[imgIndex]} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <Package size={64} className="text-slate-300" />
          )}

          {/* Prev / Next arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={() => setImgIndex(i => (i - 1 + images.length) % images.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow transition"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setImgIndex(i => (i + 1) % images.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow transition"
              >
                <ChevronRight size={16} />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIndex(i)}
                    className={`w-1.5 h-1.5 rounded-full transition ${i === imgIndex ? "bg-blue-600" : "bg-white/70"}`}
                  />
                ))}
              </div>
            </>
          )}

          {isOutOfStock && (
            <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
              Out of Stock
            </div>
          )}
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow transition">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Title + Price + SKU */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 leading-tight">{product.name}</h2>
            <div className="flex items-center justify-between mt-2">
              <span className="text-2xl font-extrabold text-blue-600">${price.toFixed(2)}</span>
              <span className="text-xs font-mono bg-slate-100 text-slate-500 px-2 py-1 rounded">SKU: {sku}</span>
            </div>
          </div>

          {product.description && (
            <p className="text-sm text-slate-600 leading-relaxed">{product.description}</p>
          )}

          {/* Available options dropdown */}
          {hasVariants && (
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Available Options
              </label>
              <select
                value={selectedVariantId || ""}
                onChange={e => setSelectedVariantId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {pvs.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.variant_name} — ${getPrice(product, v).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Add to cart */}
          <div className="flex items-center gap-3 pt-1">
            {inCart ? (
              <div className="flex items-center gap-2 flex-1 justify-center bg-slate-50 rounded-xl py-2.5">
                <button onClick={() => handleQty(-1)} className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center hover:bg-slate-300"><Minus size={13} /></button>
                <span className="text-base font-bold w-6 text-center">{inCart.qty}</span>
                <button onClick={() => handleQty(1)} className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700"><Plus size={13} /></button>
              </div>
            ) : (
              <button
                onClick={handleAdd}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition"
              >
                <Plus size={15} /> Add to Cart
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}