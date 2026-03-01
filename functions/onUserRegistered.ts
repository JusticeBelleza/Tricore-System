import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// This function is called when a new user registers.
// It auto-creates a Retail Company record linked to the new user.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data } = payload;

    if (event?.type !== 'create' || event?.entity_name !== 'User') {
      return Response.json({ skipped: true });
    }

    const user = data;
    if (!user) return Response.json({ error: 'No user data' }, { status: 400 });

    // Check if a Company already exists for this user
    const existing = await base44.asServiceRole.entities.Company.filter({ user_id: user.id });
    if (existing.length > 0) {
      return Response.json({ skipped: true, reason: 'Company already exists for user' });
    }

    // Create a Retail Company record linked to this user
    const company = await base44.asServiceRole.entities.Company.create({
      name: user.full_name || user.email,
      email: user.email,
      account_type: 'Retail',
      status: 'active',
      user_id: user.id,
    });

    // Update user role to 'retail' and link company
    await base44.asServiceRole.entities.User.update(user.id, {
      role: 'retail',
      company_id: company.id,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});