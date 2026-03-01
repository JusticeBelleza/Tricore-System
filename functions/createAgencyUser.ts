import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Only admins can create agency users
    const caller = await base44.auth.me();
    if (caller?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { email, password, full_name, address, phone, company_id } = await req.json();

    // 1. Register the user account
    await base44.auth.register({ email, password });

    // Small delay to allow user to propagate
    await new Promise(r => setTimeout(r, 1000));

    // 2. Find the newly created user by email using service role
    const users = await base44.asServiceRole.entities.User.filter({ email });
    const newUser = users[0];

    if (!newUser) {
      return Response.json({ error: 'User was registered but could not be found.' }, { status: 500 });
    }

    // 3. Update user info and role using service role
    await base44.asServiceRole.entities.User.update(newUser.id, {
      role: 'b2b',
      phone,
      address,
    });

    // 4. Link user to the company
    if (company_id) {
      await base44.asServiceRole.entities.Company.update(company_id, {
        user_id: newUser.id,
      });
    }

    return Response.json({ success: true, user_id: newUser.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});