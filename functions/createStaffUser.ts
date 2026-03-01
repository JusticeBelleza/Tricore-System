import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const caller = await base44.auth.me();
    if (caller?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { email, password, full_name, address, phone, role, license_number } = await req.json();

    const allowedRoles = ['admin', 'warehouse', 'driver'];
    if (!allowedRoles.includes(role)) {
      return Response.json({ error: 'Invalid role' }, { status: 400 });
    }

    // 1. Register the user
    await base44.auth.register({ email, password });

    // Small delay to allow user to propagate
    await new Promise(r => setTimeout(r, 1000));

    // 2. Find the newly created user by email using service role
    const users = await base44.asServiceRole.entities.User.filter({ email });
    const newUser = users[0];

    if (!newUser) {
      return Response.json({ error: 'User was registered but could not be found.' }, { status: 500 });
    }

    // 3. Update role using caller's admin token (only platform/admin users can change roles)
    await base44.entities.User.update(newUser.id, { role });

    // 4. Update other fields using service role
    await base44.asServiceRole.entities.User.update(newUser.id, { phone, address });

    // If driver, create a Driver entity record too
    if (role === 'driver') {
      await base44.asServiceRole.entities.Driver.create({
        full_name,
        email,
        phone,
        license_number: license_number || '',
        status: 'active',
      });
    }

    return Response.json({ success: true, user_id: newUser.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});