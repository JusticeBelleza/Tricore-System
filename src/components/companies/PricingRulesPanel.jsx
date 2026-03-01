import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase"; // Switched from base44 to supabase
import { X, Plus, Trash2, Search } from "lucide-react";

export default function PricingRulesPanel({ company, onClose }) {
  const [rules, setRules] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // Load rules and products on mount
  useEffect(() => {
    loadData();
  }, [company.id]);

  const loadData = async () => {
    setLoading(true);
    // Fetch pricing rules for this company from Supabase
    const { data: rulesData } = await supabase
      .from('pricing_rules')
      .select('*')
      .eq('company_id', company.id);
    
    // Fetch all products for the selection dropdown
    const { data: productsData } = await supabase
      .from('products')
      .select('*');

    setRules(rulesData || []);
    setProducts(productsData || []);
    setLoading(false);
  };

  const addRule = async (productId) => {
    const { data, error } = await supabase
      .from('pricing_rules')
      .insert([{
        company_id: company.id,
        product_id: productId,
        rule_type: 'fixed',
        value: 0
      }])
      .select();
    
    if (!error) loadData();
  };

  const deleteRule = async (id) => {
    await supabase.from('pricing_rules').delete().eq('id', id);
    loadData();
  };

  const updateRule = async (id, updates) => {
    await supabase.from('pricing_rules').update(updates).eq('id', id);
    // Optimistic update for UI snappiness
    setRules(rules.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Pricing Rules</h2>
            <p className="text-sm text-slate-500">{company.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Search by product name or SKU..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)} // FIXED: Removed duplicate onChange
            />
          </div>

          <div className="space-y-3">
            {rules.map(rule => {
              const product = products.find(p => p.id === rule.product_id);
              return (
                <div key={rule.id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{product?.name || 'Unknown Product'}</p>
                    <p className="text-xs text-slate-500">SKU: {product?.base_sku}</p>
                  </div>
                  
                  <select 
                    value={rule.rule_type}
                    onChange={(e) => updateRule(rule.id, { rule_type: e.target.value })}
                    className="text-xs border-slate-200 rounded-lg"
                  >
                    <option value="fixed">Fixed Price</option>
                    <option value="percentage">Discount %</option>
                  </select>

                  <div className="flex items-center gap-1">
                    <span className="text-sm text-slate-400">{rule.rule_type === 'fixed' ? '$' : '%'}</span>
                    <input 
                      type="number"
                      value={rule.value}
                      onChange={(e) => updateRule(rule.id, { value: parseFloat(e.target.value) })}
                      className="w-20 p-1 text-sm border-slate-200 rounded-lg text-right"
                    />
                  </div>

                  <button onClick={() => deleteRule(rule.id)} className="text-red-400 hover:text-red-600 p-1">
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}