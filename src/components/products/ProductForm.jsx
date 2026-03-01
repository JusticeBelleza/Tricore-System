import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { X, Plus, Trash2, ImagePlus, Loader2 } from "lucide-react";
import ReactQuill from "react-quill";

const emptyVariant = () => ({ variant_name: "", variant_sku: "", base_multiplier: "", retail_price: "" });

export default function ProductForm({ product, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    base_sku: "",
    base_unit_name: "Each",
    retail_base_price: "",
    manufacturer: "",
    status: "active",
    continue_selling: false,
  });
  const [variants, setVariants] = useState([emptyVariant()]);
  const [images, setImages] = useState([]); // array of URLs
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef();

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || "",
        description: product.description || "",
        category: product.category || "",
        base_sku: product.base_sku || "",
        base_unit_name: product.base_unit_name || "Each",
        retail_base_price: product.retail_base_price ?? "",
        manufacturer: product.manufacturer || "",
        status: product.status || "active",
        continue_selling: product.continue_selling || false,
      });
      // Load existing images
      const existingImgs = product.image_urls?.length
        ? product.image_urls
        : product.image_url ? [product.image_url] : [];
      setImages(existingImgs);
      // Load existing variants
      base44.entities.ProductVariant.filter({ product_id: product.id }).then(v => {
        setVariants(v.length ? v.map(vv => ({ ...vv })) : [emptyVariant()]);
      });
    }
  }, [product]);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setImages(imgs => [...imgs, file_url]);
    }
    setUploading(false);
    fileInputRef.current.value = "";
  };

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setVariant = (i, k, v) => setVariants(vs => vs.map((vv, idx) => idx === i ? { ...vv, [k]: v } : vv));

  const handleSave = async () => {
    setSaving(true);
    const productData = {
      ...form,
      retail_base_price: parseFloat(form.retail_base_price) || 0,
      image_urls: images,
      image_url: images[0] || "",
    };

    let savedProduct;
    if (product) {
      await base44.entities.Product.update(product.id, productData);
      savedProduct = { ...product, ...productData };
    } else {
      savedProduct = await base44.entities.Product.create(productData);
      // Create inventory row
      await base44.entities.Inventory.create({ product_id: savedProduct.id, base_units_on_hand: 0 });
    }

    // Save variants
    for (const v of variants) {
      if (!v.variant_name || !v.variant_sku) continue;
      const vData = {
        product_id: savedProduct.id,
        variant_name: v.variant_name,
        variant_sku: v.variant_sku,
        base_multiplier: parseFloat(v.base_multiplier) || 1,
        retail_price: parseFloat(v.retail_price) || 0,
        status: "active",
      };
      if (v.id) {
        await base44.entities.ProductVariant.update(v.id, vData);
      } else {
        await base44.entities.ProductVariant.create(vData);
      }
    }
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">{product ? "Edit Product" : "Add Product"}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Product Name *</label>
              <input value={form.name} onChange={e => setField("name", e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Base SKU *</label>
              <input value={form.base_sku} onChange={e => setField("base_sku", e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Base Unit Name</label>
              <input value={form.base_unit_name} onChange={e => setField("base_unit_name", e.target.value)}
                placeholder="e.g. Each, Pair, Piece"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Retail Base Price *</label>
              <input type="number" step="0.01" value={form.retail_base_price} onChange={e => setField("retail_base_price", e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <input value={form.category} onChange={e => setField("category", e.target.value)}
                placeholder="e.g. Gloves, Masks, Gowns…"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Manufacturer</label>
              <input value={form.manufacturer} onChange={e => setField("manufacturer", e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select value={form.status} onChange={e => setField("status", e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="active">Active</option>
                <option value="discontinued">Discontinued</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
            </div>
            <div className="col-span-2 flex items-center gap-2 mt-1">
              <input
                type="checkbox"
                id="continue_selling"
                checked={form.continue_selling}
                onChange={e => setField("continue_selling", e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="continue_selling" className="text-sm text-slate-700 cursor-pointer">
                Continue selling even if out of stock
              </label>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <ReactQuill
                  value={form.description}
                  onChange={v => setField("description", v)}
                  modules={{
                    toolbar: [
                      ["bold", "italic", "underline"],
                      [{ align: [] }],
                      [{ list: "ordered" }, { list: "bullet" }],
                    ]
                  }}
                  className="text-sm"
                  style={{ minHeight: 120 }}
                />
              </div>
            </div>

            {/* Photo Upload */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Product Photos</label>
              <div className="flex flex-wrap gap-3">
                {images.map((url, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 group">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImages(imgs => imgs.filter((_, idx) => idx !== i))}
                      className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                    >
                      <Trash2 size={14} className="text-white" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                  disabled={uploading}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-blue-400 hover:text-blue-500 transition disabled:opacity-50"
                >
                  {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
                  <span className="text-xs">{uploading ? "…" : "Add"}</span>
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleUpload}
              />
            </div>
          </div>

          {/* Variants */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-slate-700">Variants (Box, Case, Pallet…)</label>
              <button onClick={() => setVariants(v => [...v, emptyVariant()])}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                <Plus size={13} /> Add Variant
              </button>
            </div>
            <div className="space-y-2">
              {variants.map((v, i) => (
                <div key={i} className="grid grid-cols-5 gap-2 items-center bg-slate-50 rounded-lg p-3">
                  <input value={v.variant_name} onChange={e => setVariant(i, "variant_name", e.target.value)}
                    placeholder="Name (Box)" className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                  <input value={v.variant_sku} onChange={e => setVariant(i, "variant_sku", e.target.value)}
                    placeholder="SKU" className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                  <input type="number" value={v.base_multiplier} onChange={e => setVariant(i, "base_multiplier", e.target.value)}
                    placeholder="× units" className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                  <input type="number" step="0.01" value={v.retail_price} onChange={e => setVariant(i, "retail_price", e.target.value)}
                    placeholder="$ price" className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                  <button onClick={() => setVariants(vs => vs.filter((_, idx) => idx !== i))}
                    className="flex justify-center text-slate-400 hover:text-red-500 transition">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1">× units = base_multiplier (e.g. 1 Box = 10 eaches → enter 10)</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-60">
            {saving ? "Saving…" : "Save Product"}
          </button>
        </div>
      </div>
    </div>
  );
}