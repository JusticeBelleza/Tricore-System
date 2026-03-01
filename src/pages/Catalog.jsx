import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ShoppingCart, Search, Package, Plus, Minus } from "lucide-react";
import Checkout from "../components/catalog/Checkout";
import ProductDetailModal from "../components/catalog/ProductDetailModal";

export default function Catalog() {
  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [pricingRules, setPricingRules] = useState([]);
  const [company, setCompany] = useState(null);
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    const init = async () => {
      const u = await base44.auth.me().catch(() => null);
      setUser(u);
      const [p, v, inv] = await Promise.all([
        base44.entities.Product.filter({ status: "active" }),
        base44.entities.ProductVariant.filter({ status: "active" }),
        base44.entities.Inventory.list("-created_date", 2000),
      ]);
      setProducts(p);
      setVariants(v);
      setInventory(inv);

      if (u?.company_id) {
        const [comp, rules] = await Promise.all([
          base44.entities.Company.filter({ id: u.company_id }),
          base44.entities.PricingRule.filter({ company_id: u.company_id }),
        ]);
        if (comp.length) setCompany(comp[0]);
        setPricingRules(rules);
      }
    };
    init();
  }, []);

  // Hierarchical pricing engine: Fixed > Percentage > Retail
  const getPrice = (product, variant) => {
    if (!pricingRules.length) return variant?.retail_price || product.retail_base_price;

    const fixedProduct = pricingRules.find(r => r.rule_type === "fixed" && r.product_id === product.id);
    if (fixedProduct) return fixedProduct.fixed_price;

    const pctProduct = pricingRules.find(r => r.rule_type === "percentage" && r.product_id === product.id);
    if (pctProduct) {
      const base = variant?.retail_price || product.retail_base_price;
      return base * (1 - pctProduct.percentage_discount / 100);
    }

    const pctGlobal = pricingRules.find(r => r.rule_type === "percentage" && !r.product_id);
    if (pctGlobal) {
      const base = variant?.retail_price || product.retail_base_price;
      return base * (1 - pctGlobal.percentage_discount / 100);
    }

    return variant?.retail_price || product.retail_base_price;
  };

  const addToCart = (product, variant) => {
    const price = getPrice(product, variant);
    const key = variant ? variant.id : product.id;
    setCart(c => {
      const existing = c.find(i => i.key === key);
      if (existing) return c.map(i => i.key === key ? { ...i, qty: i.qty + 1 } : i);
      return [...c, {
        key, product, variant, price, qty: 1,
        name: product.name,
        variant_name: variant?.variant_name || product.base_unit_name,
        sku: variant?.variant_sku || product.base_sku,
        base_multiplier: variant?.base_multiplier || 1,
      }];
    });
  };

  const updateQty = (key, delta) => {
    setCart(c => c.map(i => i.key === key ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter(i => i.qty > 0));
  };

  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const filteredProducts = products.filter(p => {
    const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase()) || p.base_sku?.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "all" || p.category === category;
    return matchSearch && matchCat;
  });

  const variantsFor = (productId) => variants.filter(v => v.product_id === productId);
  const categories = ["all", ...new Set(products.map(p => p.category).filter(Boolean))];

  const isOutOfStock = (product) => {
    if (product.continue_selling) return false;
    const inv = inventory.find(i => i.product_id === product.id);
    return (inv?.base_units_on_hand ?? 0) <= 0;
  };

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Catalog</h1>
        {cart.length > 0 && (
          <button onClick={() => setShowCheckout(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow hover:bg-blue-700 transition">
            <ShoppingCart size={16} /> Checkout ({cart.reduce((s, i) => s + i.qty, 0)}) · ${cartTotal.toFixed(2)}
          </button>
        )}
      </div>

      {company && (
        <div className="bg-blue-50 rounded-xl px-4 py-2 text-sm text-blue-700">
          B2B pricing active for <strong>{company.name}</strong>
          {pricingRules.length > 0 && ` — ${pricingRules.length} custom rule(s) applied`}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…"
            className="pl-8 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-52" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {categories.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${category === cat ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              {cat === "all" ? "All" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredProducts.map(product => {
          const pvs = variantsFor(product.id);
          const hasVariants = pvs.length > 0;
          const outOfStock = isOutOfStock(product);
          return (
            <div key={product.id} onClick={() => setSelectedProduct(product)} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
              <div className="relative aspect-square bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <Package size={36} className="text-slate-300" />
                )}
                {outOfStock && (
                  <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                    Out of Stock
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="font-semibold text-slate-800 text-sm leading-tight">{product.name}</div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">{product.base_sku}</div>

                {hasVariants ? (
                  <div className="mt-2 space-y-1">
                    {pvs.map(v => {
                      const price = getPrice(product, v);
                      const inCart = cart.find(i => i.key === v.id);
                      return (
                        <div key={v.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-2 py-1.5">
                          <div>
                            <div className="text-xs font-medium text-slate-700">{v.variant_name}</div>
                            <div className="text-xs text-blue-600 font-bold">${price.toFixed(2)}</div>
                          </div>
                          {inCart ? (
                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                              <button onClick={() => updateQty(v.id, -1)} className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center hover:bg-slate-300"><Minus size={10} /></button>
                              <span className="text-xs font-bold w-4 text-center">{inCart.qty}</span>
                              <button onClick={() => updateQty(v.id, 1)} className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700"><Plus size={10} /></button>
                            </div>
                          ) : (
                            <button onClick={e => { e.stopPropagation(); addToCart(product, v); }}
                              className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700">
                              <Plus size={11} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-blue-600 font-bold text-sm">${getPrice(product, null).toFixed(2)}</span>
                    {cart.find(i => i.key === product.id) ? (
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => updateQty(product.id, -1)} className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center hover:bg-slate-300"><Minus size={10} /></button>
                        <span className="text-xs font-bold">{cart.find(i => i.key === product.id).qty}</span>
                        <button onClick={() => updateQty(product.id, 1)} className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700"><Plus size={10} /></button>
                      </div>
                    ) : (
                      <button onClick={e => { e.stopPropagation(); addToCart(product, null); }}
                        className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700">
                        <Plus size={13} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          variants={variants}
          getPrice={getPrice}
          cart={cart}
          addToCart={addToCart}
          updateQty={updateQty}
          onClose={() => setSelectedProduct(null)}
          isOutOfStock={isOutOfStock(selectedProduct)}
        />
      )}

      {showCheckout && (
        <Checkout
          cart={cart}
          user={user}
          company={company}
          onClose={() => setShowCheckout(false)}
          onOrdered={() => { setCart([]); setShowCheckout(false); }}
        />
      )}
    </div>
  );
}