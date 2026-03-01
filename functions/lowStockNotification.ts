import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data, old_data } = payload;

    // Only process inventory updates
    if (event?.type !== "update" || !data) {
      return Response.json({ skipped: true });
    }

    const inventory = data;
    const reorderPoint = inventory.reorder_point ?? 0;
    const onHand = inventory.base_units_on_hand ?? 0;
    const prevOnHand = old_data?.base_units_on_hand ?? null;

    // Only alert if stock just crossed below reorder point (not already below it)
    if (reorderPoint <= 0) return Response.json({ skipped: "no reorder point set" });
    if (onHand >= reorderPoint) return Response.json({ skipped: "stock ok" });
    if (prevOnHand !== null && prevOnHand <= reorderPoint) return Response.json({ skipped: "already low" });

    // Fetch product details
    const products = await base44.asServiceRole.entities.Product.filter({ id: inventory.product_id });
    const product = products[0];
    if (!product) return Response.json({ skipped: "product not found" });

    const recipientEmail = Deno.env.get("INVENTORY_MANAGER_EMAIL");
    if (!recipientEmail) return Response.json({ error: "INVENTORY_MANAGER_EMAIL not set" }, { status: 500 });

    const subject = `⚠️ Low Stock Alert: ${product.name}`;
    const body = `
<div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
  <div style="background: #f59e0b; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
    <h2 style="margin: 0;">⚠️ Low Stock Alert</h2>
  </div>
  <div style="background: #fff; border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
    <p style="margin: 0 0 16px;">The following product has dropped below its reorder point:</p>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <tr style="background: #f8fafc;">
        <td style="padding: 10px 12px; font-weight: 600; border: 1px solid #e2e8f0;">Product</td>
        <td style="padding: 10px 12px; border: 1px solid #e2e8f0;">${product.name}</td>
      </tr>
      <tr>
        <td style="padding: 10px 12px; font-weight: 600; border: 1px solid #e2e8f0;">SKU</td>
        <td style="padding: 10px 12px; border: 1px solid #e2e8f0;">${product.base_sku}</td>
      </tr>
      ${product.manufacturer ? `<tr style="background: #f8fafc;"><td style="padding: 10px 12px; font-weight: 600; border: 1px solid #e2e8f0;">Manufacturer</td><td style="padding: 10px 12px; border: 1px solid #e2e8f0;">${product.manufacturer}</td></tr>` : ""}
      <tr style="background: #fef3c7;">
        <td style="padding: 10px 12px; font-weight: 600; border: 1px solid #e2e8f0;">Current Stock</td>
        <td style="padding: 10px 12px; border: 1px solid #e2e8f0; color: #d97706; font-weight: 700;">${onHand} ${product.base_unit_name || "units"}</td>
      </tr>
      <tr>
        <td style="padding: 10px 12px; font-weight: 600; border: 1px solid #e2e8f0;">Reorder Point</td>
        <td style="padding: 10px 12px; border: 1px solid #e2e8f0;">${reorderPoint} ${product.base_unit_name || "units"}</td>
      </tr>
      ${inventory.warehouse_location ? `<tr style="background: #f8fafc;"><td style="padding: 10px 12px; font-weight: 600; border: 1px solid #e2e8f0;">Location</td><td style="padding: 10px 12px; border: 1px solid #e2e8f0;">${inventory.warehouse_location}</td></tr>` : ""}
    </table>
    <p style="margin: 20px 0 0; font-size: 13px; color: #64748b;">Please review and reorder as needed.</p>
  </div>
</div>
    `.trim();

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: recipientEmail,
      subject,
      body,
    });

    return Response.json({ sent: true, product: product.name, stock: onHand });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});