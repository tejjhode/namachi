const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  'https://agdyqujsdnxiuwcpuupw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnZHlxdWpzZG54aXV3Y3B1dXB3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTQ5NTIxMiwiZXhwIjoyMDk3MDcxMjEyfQ.3WDos0gr2y-zsyTwXCEGVOxJFFfWszxwC0FcMciaGw8',
  { auth: { persistSession: false } }
);

async function main() {
  // Check all profiles and their roles
  const { data: profiles, error: pe } = await sb
    .from('profiles')
    .select('id, full_name, email, role')
    .order('created_at', { ascending: true });

  if (pe) {
    console.log('ERROR fetching profiles:', pe.message);
    return;
  }

  console.log('\n=== All Profiles ===');
  profiles.forEach(p => {
    console.log(`  id=${p.id}  role="${p.role}"  name="${p.full_name}"  email="${p.email}"`);
  });

  // Check current RLS policies on trips
  const { data: trips, error: te } = await sb
    .from('trips')
    .select('id, title, status')
    .limit(3);

  if (te) console.log('\nERROR fetching trips (service role):', te.message);
  else {
    console.log('\n=== Trips (service role can read) ===');
    trips.forEach(t => console.log(`  id=${t.id}  title="${t.title}"  status="${t.status}"`));
  }

  // List all auth users
  const { data: authData, error: ae } = await sb.auth.admin.listUsers();
  if (ae) {
    console.log('\nERROR listing auth users:', ae.message);
  } else {
    console.log('\n=== Auth Users ===');
    authData.users.forEach(u => {
      console.log(`  id=${u.id}  email="${u.email}"  created_at=${u.created_at}`);
    });
  }
}

main().catch(console.error);
