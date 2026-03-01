// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import Layout from '@/Layout';
import Login from '@/pages/Login';

// Import all your existing pages
import Dashboard from '@/pages/Dashboard';
import Products from '@/pages/Products';
import Orders from '@/pages/Orders';
import Warehouse from '@/pages/Warehouse';
import PurchaseOrders from '@/pages/PurchaseOrders';
import Drivers from '@/pages/Drivers';
import Reports from '@/pages/Reports';
import AdminUsers from '@/pages/AdminUsers';
import Account from '@/pages/Account';
import Catalog from '@/pages/Catalog';
import MyOrders from '@/pages/MyOrders';
import DriverRoutes from '@/pages/DriverRoutes';

// A wrapper component that protects routes based on authentication
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoadingAuth } = useAuth();

  // Show a loading state while Supabase checks the session
  if (isLoadingAuth) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <div className="text-slate-500">Loading Tricore...</div>
      </div>
    );
  }

  // If not logged in, boot them to the login page
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Otherwise, render the requested page inside the Layout
  return <Layout>{children}</Layout>;
};

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<Login />} />

        {/* Protected Routes (Require Login) */}
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
        <Route path="/warehouse" element={<ProtectedRoute><Warehouse /></ProtectedRoute>} />
        <Route path="/po" element={<ProtectedRoute><PurchaseOrders /></ProtectedRoute>} />
        <Route path="/drivers" element={<ProtectedRoute><Drivers /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
        <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
        
        {/* Role-specific or other routes */}
        <Route path="/catalog" element={<ProtectedRoute><Catalog /></ProtectedRoute>} />
        <Route path="/my-orders" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
        <Route path="/my-routes" element={<ProtectedRoute><DriverRoutes /></ProtectedRoute>} />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}