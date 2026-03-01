import React from "react";

export default function Documentation() {
  const content = `
# Tricore Medical Supply - System Documentation

## Overview
Tricore is a B2B and retail medical supply e-commerce platform managing products, orders, inventory, drivers, and agencies.

## User Roles

### Admin
- Full system access
- Manage users, products, orders, inventory, purchase orders, reports

### Warehouse
- Pick and pack orders
- Manage inventory
- Track drivers

### Driver
- View assigned deliveries
- Capture proof of delivery (signature + photo)
- Accept routes

### B2B (Agency)
- Custom pricing and credit limits
- Place bulk orders
- Track order history

### Retail (User)
- Browse catalog
- Place orders
- Track deliveries

## Core Entities

**Company**: Retail customers or B2B agencies
- account_type: B2B or Retail
- credit_limit, outstanding_balance
- shipping_fee: Fixed shipping cost per order
- tax_exempt: For tax calculations

**Product**: Medical supplies with variants
- base_sku, base_unit_name (e.g., "Each", "Pair")
- retail_base_price
- variants: Box, Case, Pallet with multipliers

**Order**: Customer orders
- Status flow: pending → approved → picking → packed → out_for_delivery → delivered
- payment_method: credit_card, net_30, cod, ach
- payment_status: unpaid, partial, paid
- shipping_amount: Auto-calculated from Company.shipping_fee

**OrderItem**: Line items in orders
- quantity_variants: How many of the variant
- total_base_units: quantity_variants × base_multiplier
- unit_price & line_total at time of order

**Driver & Vehicle**: Delivery management
- Drivers assigned to vehicles
- Status: active, inactive, on_route

**Inventory & StockMovement**: Stock tracking
- base_units_on_hand, base_units_reserved
- Movements tracked: inbound, outbound, adjustment
- Auto-deducted on delivery

**PricingRule**: Custom pricing for B2B
- rule_type: fixed (exact price) or percentage (discount)
- Applies per company, product, or globally
- Priority: Fixed > Percentage > Global > Retail

## Key Features

### Orders
- Create with automatic total calculation
- Approve, pick, pack, deliver workflow
- Export to CSV/PDF
- Capture POD with signature + photo

### Products
- Create with variants (Box, Case, Pallet)
- Set retail and variant pricing
- Track stock levels
- Manage reorder points
- Bulk import/export

### Agencies (B2B)
- Create with credit limits
- Set custom shipping fees
- Custom pricing rules (fixed or % discount)
- Track balance and payment history

### Warehouse
- Pick and pack operations
- Record stock movements
- Set reorder points and quantities
- Track warehouse locations

### Drivers
- Assign to vehicles
- Assign orders/routes
- Capture delivery proof
- Track status

## Workflows

### Customer Registration
1. User registers
2. onUserRegistered triggers automatically
3. Creates Company (account_type=Retail)
4. Sets role to "user"
5. Appears in Retail Customers list

### B2B Agency Setup
1. Admin creates Company (account_type=B2B)
2. Add user to agency
3. Set shipping fee
4. Create pricing rules (fixed or % discount)

### Place Order
1. Customer adds items to cart
2. Checkout with address & payment
3. Order created (status=pending)
4. Admin approves (pending→approved)
5. Warehouse picks (→picking)
6. Warehouse packs (→packed)
7. Driver accepts & delivers
8. Driver captures POD
9. Order marked delivered (inventory deducted)

### Custom Pricing
1. Open agency in AdminUsers
2. Click "$" (Pricing Rules)
3. Add rules:
   - Fixed: exact price
   - Percentage: % off retail
4. Rules apply to all future orders from that agency

### Purchase Orders
1. Create PO from supplier
2. Add items with quantities
3. Track status: draft → sent → confirmed → receiving → received
4. Confirm receipt updates inventory

## Backend Functions

- **createStaffUser**: Create admin/warehouse/driver accounts
- **createAgencyUser**: Link user to B2B agency
- **onUserRegistered**: Auto-create retail company on signup
- **lowStockNotification**: Alert when stock below reorder point

## Pages

**Admin**: Dashboard, Products, Orders, Warehouse, Purchase Orders, Drivers, Reports, Users, Account

**Warehouse**: Orders, Pick & Pack, Purchase Orders, Inventory, Drivers, Account

**Driver**: My Routes, Account

**B2B/Retail**: Catalog, My Orders, Account

## Important Notes

- Shipping amount calculated from Company.shipping_fee on order creation
- Inventory tracked in base units; variants have multipliers
- All orders include subtotal + tax + shipping = total
- Proof of delivery requires signature AND photo
- Stock automatically deducted when order delivered
- Custom pricing rules override retail prices for agencies
  `;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <pre className="bg-slate-50 rounded-xl p-6 text-sm text-slate-700 overflow-x-auto border border-slate-200 whitespace-pre-wrap">
        {content}
      </pre>
    </div>
  );
}