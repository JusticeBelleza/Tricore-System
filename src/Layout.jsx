import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import {
  LayoutDashboard, Package, ShoppingCart, Truck, Warehouse,
  Users, BarChart3, ClipboardList, Settings, LogOut,
  ChevronLeft, ChevronRight, Menu, X, Building2, ShoppingBag, User
} from "lucide-react";

const navByRole = {
  admin: [
    { label: "Dashboard", icon: LayoutDashboard, page: "Dashboard" },
    { label: "Products", icon: Package, page: "Products" },
    { label: "Orders", icon: ShoppingCart, page: "Orders" },

    { label: "Warehouse", icon: Warehouse, page: "Warehouse" },
    { label: "Purchase Orders", icon: ClipboardList, page: "PurchaseOrders" },
    { label: "Drivers", icon: Truck, page: "Drivers" },
    { label: "Reports", icon: BarChart3, page: "Reports" },
    { label: "Users", icon: Users, page: "AdminUsers" },
    { label: "Account", icon: User, page: "Account" },
  ],
  warehouse: [
    { label: "Orders", icon: ShoppingCart, page: "Orders" },
    { label: "Pick & Pack", icon: Warehouse, page: "Warehouse" },
    { label: "Purchase Orders", icon: ClipboardList, page: "PurchaseOrders" },
    { label: "Inventory", icon: Package, page: "Products" },
    { label: "Drivers", icon: Truck, page: "Drivers" },
    { label: "Account", icon: User, page: "Account" },
  ],
  driver: [
    { label: "My Routes", icon: Truck, page: "DriverRoutes" },
    { label: "Account", icon: User, page: "Account" },
  ],
  staff: [
    { label: "Account", icon: User, page: "Account" },
  ],
  b2b: [
    { label: "Catalog", icon: Package, page: "Catalog" },
    { label: "My Orders", icon: ShoppingCart, page: "MyOrders" },
    { label: "Account", icon: Building2, page: "Account" },
  ],
  user: [
    { label: "Shop", icon: ShoppingBag, page: "Catalog" },
    { label: "My Orders", icon: ShoppingCart, page: "MyOrders" },
    { label: "Account", icon: User, page: "Account" },
  ],
};

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const role = user?.role || "user";
  const navItems = navByRole[role] || navByRole["user"];

  const handleLogout = () => base44.auth.logout();

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-slate-800 ${collapsed ? "justify-center" : ""}`}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-black text-sm">T</span>
        </div>
        {!collapsed && (
          <div>
            <div className="text-white font-bold text-sm leading-tight">Tricore</div>
            <div className="text-slate-400 text-xs">Medical Supply</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ label, icon: Icon, page }) => {
          const isActive = currentPageName === page;
          return (
            <Link
              key={page}
              to={createPageUrl(page)}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium group
                ${isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-slate-800 p-3">
        {user && !collapsed && (
          <div className="px-2 py-2 mb-2">
            <div className="text-white text-sm font-medium truncate">{user.full_name}</div>
            <div className="text-slate-400 text-xs capitalize">{role}</div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all w-full text-sm"
        >
          <LogOut size={18} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <style>{`
        :root {
          --brand: #2563eb;
          --brand-light: #3b82f6;
        }
        * { box-sizing: border-box; }
        body { font-family: 'Inter', system-ui, sans-serif; }
      `}</style>

      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-slate-900 transition-all duration-300 flex-shrink-0
          ${collapsed ? "w-16" : "w-56"}`}
      >
        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-1/2 -right-3 w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center shadow z-10 hover:bg-slate-600 transition"
          style={{ transform: "translateY(-50%)" }}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 h-full bg-slate-900 flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar (mobile) */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200">
          <button onClick={() => setMobileOpen(true)} className="text-slate-600">
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <span className="text-white font-black text-xs">T</span>
            </div>
            <span className="font-bold text-slate-800 text-sm">Tricore</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}